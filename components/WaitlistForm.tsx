"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setMessage(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, zip, website }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMessage("You're on the list. We'll be in touch soon.");
      setEmail("");
      setZip("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Join the Texergy AI waitlist"
      className="w-full max-w-2xl"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          className="flex-1 bg-input border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent transition-colors"
          aria-label="Email address"
        />
        <input
          type="text"
          name="zip"
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          placeholder="ZIP (OPTIONAL)"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
          className="bg-input border border-border px-4 py-3 font-mono text-sm uppercase tracking-wide text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent transition-colors sm:w-52"
          aria-label="ZIP code (optional)"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="border border-foreground/30 bg-accent text-accent-foreground px-6 py-3 font-mono text-xs uppercase tracking-widest hover:border-accent transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {status === "submitting" ? "Joining…" : "Join Waitlist"}
        </button>
      </div>

      {/* Honeypot — hidden from users, attractive to naive bots */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="min-h-6 mt-4 font-mono text-xs uppercase tracking-widest"
      >
        {message && (
          <span className={status === "success" ? "text-accent" : "text-destructive"}>
            {message}
          </span>
        )}
      </div>

      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
        We'll only email you about Texergy AI. No spam. Unsubscribe anytime.
      </p>
    </form>
  );
}
