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

set -u

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
