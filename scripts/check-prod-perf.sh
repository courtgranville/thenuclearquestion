#!/usr/bin/env bash
# check-prod-perf.sh
#
# Curls a deployment of thenuclearquestion.com (or a Cloudflare Pages preview)
# and captures cache, compression, and sizing headers for the HTML, JS bundle,
# CSS bundle, and a handful of representative static assets. The JS and CSS
# filenames are content-hashed and rotate on every build, so they are
# discovered from the HTML rather than hardcoded.
#
# Output is written to .perf-checks/<YYYY-MM-DD-HHMM>-<host-slug>.txt.
#
# Usage:
#   ./scripts/check-prod-perf.sh                                              # production
#   ./scripts/check-prod-perf.sh https://abc123.thenuclearquestion.pages.dev  # preview
#   ./scripts/check-prod-perf.sh --baseline <file> <url>                      # capture + diff
#
# In --baseline mode the script captures a new snapshot of <url> as usual,
# then prints a structured diff of the new snapshot against <file> to stdout.
# Content-hashed asset filenames (/assets/index-*.js, /assets/index-*.css) are
# normalised before comparison so a rotated hash isn't reported as a new URL.

set -u

# --- Argument parsing -------------------------------------------------------

BASELINE_FILE=""
if [[ "${1:-}" == "--baseline" ]]; then
  if [[ $# -lt 3 ]]; then
    echo "Error: --baseline requires <baseline-file> <url>" >&2
    exit 1
  fi
  BASELINE_FILE="$2"
  shift 2
  if [[ ! -f "$BASELINE_FILE" ]]; then
    echo "Error: baseline file not found: $BASELINE_FILE" >&2
    exit 1
  fi
fi

BASE_URL="${1:-https://thenuclearquestion.com}"

# Strip a trailing slash if present.
BASE_URL="${BASE_URL%/}"

# Validate: must be https://.
if [[ "$BASE_URL" != https://* ]]; then
  echo "Error: base URL must start with https:// (got: $BASE_URL)" >&2
  exit 1
fi

# Slug the hostname for the filename so production runs and preview runs
# never overwrite each other.
HOST="$(printf '%s' "$BASE_URL" | sed -E 's#^https://##; s#/.*$##')"
HOST_SLUG="$(printf '%s' "$HOST" | tr '.' '-')"

OUTPUT_DIR=".perf-checks"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date -u +'%Y-%m-%d-%H%M')"
OUTPUT_FILE="$OUTPUT_DIR/${TIMESTAMP}-${HOST_SLUG}.txt"

# --- 1. Fetch the HTML and parse out the JS + CSS asset paths ----------------

HTML="$(curl -fsSL "$BASE_URL/" 2>/dev/null || true)"
if [[ -z "$HTML" ]]; then
  echo "Error: could not fetch HTML from $BASE_URL/" >&2
  exit 1
fi

# Vite emits <script type="module" crossorigin src="/assets/index-XXXX.js"></script>
# and <link rel="stylesheet" crossorigin href="/assets/index-XXXX.css">.
# Extract the first match for each.
JS_PATH="$(printf '%s' "$HTML" \
  | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' \
  | head -n 1)"
CSS_PATH="$(printf '%s' "$HTML" \
  | grep -oE '/assets/index-[A-Za-z0-9_-]+\.css' \
  | head -n 1)"

if [[ -z "$JS_PATH" ]]; then
  echo "Error: could not parse JS bundle path from HTML" >&2
  exit 1
fi
if [[ -z "$CSS_PATH" ]]; then
  echo "Error: could not parse CSS bundle path from HTML" >&2
  exit 1
fi

JS_NAME="${JS_PATH##*/}"
CSS_NAME="${CSS_PATH##*/}"

# --- 2. Define the URLs to check --------------------------------------------

URLS=(
  "$BASE_URL/"
  "$BASE_URL$JS_PATH"
  "$BASE_URL$CSS_PATH"
  "$BASE_URL/assets/poster-001-thumbnail.png"
  "$BASE_URL/assets/poster-006-thumbnail.png"
  "$BASE_URL/assets/006-version2_5c838076.png"
  "$BASE_URL/assets/004-processed_a9547a07.svg"
)

# Headers we want to capture from each response.
WANTED_HEADERS=(
  "content-type"
  "cache-control"
  "cf-cache-status"
  "content-length"
  "content-encoding"
  "age"
  "etag"
)

# --- 3. Write the summary header --------------------------------------------

{
  echo "URL checked: $BASE_URL"
  echo "Captured: $(date -u +'%Y-%m-%d %H%M UTC')"
  echo "Bundle: $JS_NAME"
  echo "CSS:    $CSS_NAME"
  echo
} > "$OUTPUT_FILE"

# --- 4. Hit each URL and record its headers ---------------------------------

check_url() {
  local url="$1"
  local tmp_headers
  tmp_headers="$(mktemp)"

  # -s silent, -S show errors, -L follow redirects, -D dump headers,
  # -o /dev/null discard body, -w write elapsed time, -A custom UA.
  # Explicit Accept-Encoding asks the edge to serve Brotli/gzip so the
  # response's content-encoding header is meaningful. We discard the body
  # so we don't need curl to decompress it.
  # --max-time guards against a hung server.
  local elapsed
  elapsed="$(curl -sS -L \
    --max-time 30 \
    -A "thenuclearquestion-perf-check/1.0" \
    -H "Accept-Encoding: br, gzip" \
    -D "$tmp_headers" \
    -o /dev/null \
    -w '%{time_total}' \
    "$url" 2>/dev/null)" || elapsed="ERROR"

  {
    echo "=== $url ==="

    if [[ "$elapsed" == "ERROR" || ! -s "$tmp_headers" ]]; then
      echo "MISSING (request failed)"
      echo "---"
      echo
      rm -f "$tmp_headers"
      return
    fi

    # Status line(s): keep the last HTTP/x status (in case of redirects).
    local status_line
    status_line="$(grep -E '^HTTP/' "$tmp_headers" | tail -n 1 | tr -d '\r')"
    echo "$status_line"

    # If the final status is 404, mark MISSING but still record what came back.
    if printf '%s' "$status_line" | grep -qE ' 404( |$)'; then
      echo "MISSING (404)"
    fi

    # Emit the wanted headers in order, case-insensitive, last-occurrence wins
    # (so a redirected final response's headers shadow the redirect's).
    for h in "${WANTED_HEADERS[@]}"; do
      local value
      value="$(grep -iE "^${h}:" "$tmp_headers" | tail -n 1 | tr -d '\r')"
      if [[ -n "$value" ]]; then
        echo "$value"
      fi
    done

    printf 'elapsed-total: %ss\n' "$elapsed"
    echo "---"
    echo
  } >> "$OUTPUT_FILE"

  rm -f "$tmp_headers"
}

for url in "${URLS[@]}"; do
  check_url "$url"
done

# --- 5. Print the output path -----------------------------------------------

echo "$OUTPUT_FILE"

# --- 6. Optional: diff against a baseline -----------------------------------

if [[ -z "$BASELINE_FILE" ]]; then
  exit 0
fi

# Normalise a URL into a stable logical key. The JS and CSS bundle filenames
# are content-hashed and rotate on every build, so they're keyed by the
# pattern rather than the hash. Everything else uses its path verbatim.
# Slashes and asterisks are slugged so the key is safe to use as a filename.
normalise_key() {
  local url="$1"
  # Strip scheme + host.
  local path
  path="$(printf '%s' "$url" | sed -E 's#^https?://[^/]+##')"
  local logical
  case "$path" in
    /assets/index-*.js)  logical="ASSET:/assets/index-*.js" ;;
    /assets/index-*.css) logical="ASSET:/assets/index-*.css" ;;
    /)                   logical="PAGE:/" ;;
    *)                   logical="ASSET:$path" ;;
  esac
  # Slug for filesystem use: / -> __, * -> STAR, : -> _.
  printf '%s' "$logical" | sed -e 's#/#__#g' -e 's#\*#STAR#g' -e 's#:#_#g'
}

# Parse a snapshot file into a directory of per-key files. Each file
# contains the headers we care about, one per line, sorted, with the
# variable elapsed-total stripped. Returns the directory path on stdout.
parse_snapshot() {
  local file="$1"
  local out_dir
  out_dir="$(mktemp -d)"

  local current_url=""
  local current_key=""
  local current_tmp=""

  while IFS= read -r line; do
    if [[ "$line" == "==="*"===" ]]; then
      # Flush previous block.
      if [[ -n "$current_tmp" ]]; then
        sort "$current_tmp" > "$out_dir/$current_key"
        rm -f "$current_tmp"
      fi
      # Start new block.
      current_url="$(printf '%s' "$line" | sed -E 's/^=== (.*) ===$/\1/')"
      current_key="$(normalise_key "$current_url")"
      current_tmp="$(mktemp)"
      # Record the original URL for reporting.
      printf 'url: %s\n' "$current_url" > "$current_tmp"
      continue
    fi
    if [[ "$line" == "---" ]]; then
      if [[ -n "$current_tmp" ]]; then
        sort "$current_tmp" > "$out_dir/$current_key"
        rm -f "$current_tmp"
        current_tmp=""
      fi
      continue
    fi
    if [[ -z "$current_tmp" ]]; then
      continue
    fi
    # Skip blank lines and the variable elapsed-total.
    if [[ -z "$line" ]] || [[ "$line" == elapsed-total:* ]]; then
      continue
    fi
    printf '%s\n' "$line" >> "$current_tmp"
  done < "$file"

  # Flush any trailing block.
  if [[ -n "$current_tmp" ]]; then
    sort "$current_tmp" > "$out_dir/$current_key"
    rm -f "$current_tmp"
  fi

  echo "$out_dir"
}

# Pretty-print the diff for a single key.
print_key_diff() {
  local key="$1"
  local baseline_file="$2"
  local new_file="$3"

  local baseline_url new_url
  baseline_url="$(grep -m1 '^url: ' "$baseline_file" | sed -E 's/^url: //')"
  new_url="$(grep -m1 '^url: ' "$new_file" | sed -E 's/^url: //')"

  local header_label="$new_url"
  if [[ "$baseline_url" != "$new_url" ]]; then
    header_label="$new_url  (baseline: $baseline_url)"
  fi

  # Headers to compare, in display order.
  local fields=(
    "HTTP/"
    "content-type:"
    "cache-control:"
    "cf-cache-status:"
    "content-length:"
    "content-encoding:"
    "age:"
    "etag:"
    "MISSING"
  )

  local diff_lines=()
  for prefix in "${fields[@]}"; do
    local b n
    b="$(grep -E "^${prefix}" "$baseline_file" || true)"
    n="$(grep -E "^${prefix}" "$new_file" || true)"
    if [[ "$b" != "$n" ]]; then
      local b_show="${b:-<absent>}"
      local n_show="${n:-<absent>}"
      diff_lines+=("  ${prefix%:} : ${b_show#${prefix}} -> ${n_show#${prefix}}")
    fi
  done

  if [[ ${#diff_lines[@]} -eq 0 ]]; then
    return 1
  fi

  echo "DIFF: $header_label"
  for l in "${diff_lines[@]}"; do
    echo "$l"
  done
  return 0
}

BASELINE_DIR="$(parse_snapshot "$BASELINE_FILE")"
NEW_DIR="$(parse_snapshot "$OUTPUT_FILE")"

# Walk the union of keys.
ALL_KEYS="$( { ls "$BASELINE_DIR"; ls "$NEW_DIR"; } | sort -u )"

DIFF_COUNT=0
NO_DIFF_COUNT=0
NEW_ONLY=()
MISSING=()

echo
echo "Baseline: $BASELINE_FILE"
echo "New:      $OUTPUT_FILE"
echo

while IFS= read -r key; do
  [[ -z "$key" ]] && continue
  local_baseline="$BASELINE_DIR/$key"
  local_new="$NEW_DIR/$key"
  if [[ ! -f "$local_baseline" ]]; then
    new_url="$(grep -m1 '^url: ' "$local_new" | sed -E 's/^url: //')"
    NEW_ONLY+=("$new_url")
    continue
  fi
  if [[ ! -f "$local_new" ]]; then
    baseline_url="$(grep -m1 '^url: ' "$local_baseline" | sed -E 's/^url: //')"
    MISSING+=("$baseline_url")
    continue
  fi
  if print_key_diff "$key" "$local_baseline" "$local_new"; then
    DIFF_COUNT=$((DIFF_COUNT + 1))
  else
    NO_DIFF_COUNT=$((NO_DIFF_COUNT + 1))
  fi
done <<< "$ALL_KEYS"

echo
echo "URLS WITH NO DIFF: $NO_DIFF_COUNT"
echo "NEW URLS NOT IN BASELINE: ${#NEW_ONLY[@]}"
for u in "${NEW_ONLY[@]:-}"; do
  [[ -z "$u" ]] && continue
  echo "  $u"
done
echo "MISSING URLS PRESENT IN BASELINE BUT NOT IN NEW: ${#MISSING[@]}"
for u in "${MISSING[@]:-}"; do
  [[ -z "$u" ]] && continue
  echo "  $u"
done

rm -rf "$BASELINE_DIR" "$NEW_DIR"
