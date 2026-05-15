import { useId, useState } from "react";
import PosterControlButton from "./PosterControlButton";

const WEB3FORMS_ACCESS_KEY = "fab2cc7f-7ee1-40ee-949b-dfb1a05aa946";
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

const SERIF_STYLE = { fontFamily: "'Playfair', Georgia, serif" } as const;
const CREAM = "#ECE7DF";
const DESTRUCTIVE = "#a51e22";
const FIELD_BORDER = "rgba(13,26,30,0.25)";
const FIELD_BORDER_FOCUS = "rgba(13,26,30,0.6)";
const FIELD_FOCUS_RING = "0 0 0 3px rgba(28,56,103,0.15)";

const GENERIC_NETWORK_ERROR =
  "Something went wrong sending the message. Please try again, or reach out via LinkedIn.";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; source: "validation" | "network"; message: string };

export interface ContactFormProps {
  /** Submit button accent colour. Defaults to the blue #1c3867. */
  accentColour?: string;
}

async function submit(name: string, email: string, message: string) {
  const formData = new FormData();
  formData.append("access_key", WEB3FORMS_ACCESS_KEY);
  formData.append("name", name);
  formData.append("email", email);
  formData.append("message", message);
  formData.append(
    "subject",
    `New message from thenuclearquestion.com - ${name}`,
  );
  formData.append("from_name", "thenuclearquestion.com contact form");
  formData.append("replyto", email);
  formData.append("botcheck", "");

  const response = await fetch(WEB3FORMS_ENDPOINT, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  return data.success === true
    ? { ok: true as const }
    : { ok: false as const, message: data.message ?? "Unknown error" };
}

export default function ContactForm({
  accentColour = "#1c3867",
}: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [botcheck, setBotcheck] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const errorId = useId();
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();

  const isError = status.kind === "error";
  const isSubmitting = status.kind === "submitting";
  const disabled = isSubmitting;

  const errorText = isError
    ? status.source === "validation"
      ? status.message
      : GENERIC_NETWORK_ERROR
    : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (botcheck) {
      setStatus({ kind: "success" });
      return;
    }
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({
        kind: "error",
        source: "validation",
        message: "Please fill in all fields.",
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({
        kind: "error",
        source: "validation",
        message: "Please enter a valid email address.",
      });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const result = await submit(name, email, message);
      if (result.ok) {
        setStatus({ kind: "success" });
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus({
          kind: "error",
          source: "network",
          message: result.message,
        });
      }
    } catch {
      setStatus({
        kind: "error",
        source: "network",
        message: "Network request failed.",
      });
    }
  }

  function resetForm() {
    setStatus({ kind: "idle" });
  }

  if (status.kind === "success") {
    return (
      <div role="status" aria-live="polite">
        <h3
          className="font-serif text-xl mb-3"
          style={{ fontWeight: 600 }}
        >
          Thanks - message sent.
        </h3>
        <p
          className="text-base leading-relaxed text-foreground/80 mb-4"
          style={{ ...SERIF_STYLE, fontWeight: 300 }}
        >
          I read everything that comes in and try to reply within a few days.
          If you don't hear back within a week, please send a follow-up -
          sometimes things slip past.
        </p>
        <button
          type="button"
          onClick={resetForm}
          className="text-base text-primary hover:text-foreground transition-colors duration-200 underline-offset-4 hover:underline cursor-pointer bg-transparent border-0 p-0"
          style={SERIF_STYLE}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Field
        id={nameId}
        label="Name"
        required
        type="text"
        value={name}
        onChange={setName}
        placeholder="Your name"
        autoComplete="name"
        disabled={disabled}
        invalid={isError}
        describedBy={isError ? errorId : undefined}
      />

      <Field
        id={emailId}
        label="Email"
        required
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
        disabled={disabled}
        invalid={isError}
        describedBy={isError ? errorId : undefined}
      />

      <FieldTextarea
        id={messageId}
        label="Message"
        required
        value={message}
        onChange={setMessage}
        placeholder="What would you like to talk about?"
        disabled={disabled}
        invalid={isError}
        describedBy={isError ? errorId : undefined}
      />

      <input
        type="checkbox"
        name="botcheck"
        checked={!!botcheck}
        onChange={(e) => setBotcheck(e.target.checked ? "on" : "")}
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {errorText && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm mb-4"
          style={{ ...SERIF_STYLE, color: DESTRUCTIVE, fontWeight: 400 }}
        >
          {errorText}
        </p>
      )}

      <PosterControlButton
        type="submit"
        label={isSubmitting ? "Sending..." : "Send message"}
        accentColour={accentColour}
        leadingDot={false}
        revealsContentBelow={false}
        disabled={disabled}
        onClick={() => {
          /* form's onSubmit handles the click; this is a noop */
        }}
      />
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  type: "text" | "email";
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

function Field({
  id,
  label,
  required,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  invalid,
  describedBy,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="mb-5">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="w-full rounded-sm px-4 py-3 text-base outline-none"
        style={{
          ...SERIF_STYLE,
          fontWeight: 300,
          backgroundColor: CREAM,
          border: `1.5px solid ${focused ? FIELD_BORDER_FOCUS : FIELD_BORDER}`,
          boxShadow: focused ? FIELD_FOCUS_RING : "none",
          opacity: disabled ? 0.6 : 1,
          color: "#0d1a1e",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

interface FieldTextareaProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

function FieldTextarea({
  id,
  label,
  required,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  describedBy,
}: FieldTextareaProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="mb-5">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="w-full rounded-sm px-4 py-3 text-base outline-none"
        style={{
          ...SERIF_STYLE,
          fontWeight: 300,
          backgroundColor: CREAM,
          border: `1.5px solid ${focused ? FIELD_BORDER_FOCUS : FIELD_BORDER}`,
          boxShadow: focused ? FIELD_FOCUS_RING : "none",
          opacity: disabled ? 0.6 : 1,
          color: "#0d1a1e",
          resize: "vertical",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm mb-2"
      style={{ ...SERIF_STYLE, fontWeight: 500 }}
    >
      {children}
      {required && (
        <span
          aria-label="required"
          style={{ color: DESTRUCTIVE, marginLeft: 4 }}
        >
          *
        </span>
      )}
    </label>
  );
}
