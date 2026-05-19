"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "idle" | "submitting" | "done" | "error";

export default function UnsubscribeConfirm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [already, setAlready] = useState(false);

  async function onConfirm() {
    if (status === "submitting") return;
    setStatus("submitting");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        already?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setAlready(Boolean(data.already));
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="space-y-6">
        <p className="font-mono text-sm text-foreground/85 leading-relaxed">
          {already
            ? "You were already unsubscribed. No further emails will be sent."
            : "You've been unsubscribed. We won't send any more newsletter emails."}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-3 border border-foreground/20 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors duration-200"
        >
          Back to Texergy AI →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="font-mono text-sm text-foreground/85 leading-relaxed">
        Unsubscribe{" "}
        <span className="text-foreground">{email}</span> from the Texergy AI
        newsletter? You can resubscribe anytime from the blog.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={status === "submitting"}
          className="border border-foreground/30 bg-accent text-accent-foreground px-6 py-3 font-mono text-xs uppercase tracking-widest hover:border-accent transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "Unsubscribing…" : "Confirm Unsubscribe"}
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center border border-foreground/20 px-6 py-3 font-mono text-xs uppercase tracking-widest text-foreground/85 hover:border-accent hover:text-accent transition-colors duration-200"
        >
          Cancel
        </Link>
      </div>

      <div role="status" aria-live="polite" className="min-h-6 font-mono text-xs uppercase tracking-widest">
        {message && <span className="text-destructive">{message}</span>}
      </div>
    </div>
  );
}
