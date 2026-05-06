// Lightweight Resend client — no SDK dependency, just fetch.
// If RESEND_API_KEY is unset, sendWaitlistConfirmation becomes a no-op,
// so the app keeps working out of the box.

const RESEND_API = "https://api.resend.com/emails";

type SendResult = { ok: boolean; id?: string; error?: string };

function isConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.WAITLIST_FROM_EMAIL);
}

export function emailConfigured(): boolean {
  return isConfigured();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function buildBody(zip: string | null) {
  const subject = "You're on the Texergy AI waitlist";
  const zipLine = zip
    ? `We've noted ZIP ${escapeHtml(zip)}, so when we launch we can show you plans available in your service area first.`
    : "When we launch, drop in your ZIP and we'll show you the plans available in your service area.";

  const text = [
    "Welcome to Texergy AI.",
    "",
    "You're confirmed on the early-access waitlist for Texas residents.",
    "",
    zipLine.replace(/<[^>]+>/g, ""),
    "",
    "What happens next:",
    "  • We'll email you the moment early access opens.",
    "  • You'll be one of the first to try the AI-ranked plan matcher.",
    "  • No spam. Unsubscribe any time by replying to this email.",
    "",
    "Questions? Just reply — we read everything.",
    "",
    "— The Texergy AI team",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#15161b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;color:#e7e7ea;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="font-size:22px;font-weight:600;letter-spacing:-0.025em;background:linear-gradient(100deg,#ffd0a8,#ff944d 35%,#ff7a1a 65%,#ffb47a);-webkit-background-clip:text;background-clip:text;color:transparent;">
      Texergy AI
    </div>

    <h1 style="font-size:26px;line-height:1.2;letter-spacing:-0.025em;margin:24px 0 12px;color:#fafafa;font-weight:600;">
      You're on the list.
    </h1>

    <p style="font-size:15px;line-height:1.65;color:#c9c9d2;margin:0 0 20px;">
      You're confirmed for early access to Texergy AI, the smarter way for Texans to pick an electricity plan.
    </p>

    <p style="font-size:15px;line-height:1.65;color:#c9c9d2;margin:0 0 20px;">
      ${zipLine}
    </p>

    <div style="border:1px solid #2a2a32;border-radius:12px;padding:18px 20px;background:#1c1d23;margin:24px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#ff944d;margin-bottom:10px;">What's next</div>
      <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#c9c9d2;">
        <li>We'll email you the moment early access opens.</li>
        <li>You'll be one of the first to try the AI-ranked plan matcher.</li>
        <li>No spam. Unsubscribe any time by replying to this email.</li>
      </ul>
    </div>

    <p style="font-size:14px;line-height:1.65;color:#9b9ba6;margin:24px 0 0;">
      Questions? Just reply — we read everything.
    </p>

    <p style="font-size:13px;line-height:1.65;color:#7e7e88;margin:32px 0 0;">
      — The Texergy AI team
    </p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendWaitlistConfirmation(
  email: string,
  zip: string | null,
): Promise<SendResult> {
  if (!isConfigured()) {
    return { ok: false, error: "RESEND_API_KEY or WAITLIST_FROM_EMAIL not set" };
  }

  const { subject, text, html } = buildBody(zip);

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.WAITLIST_FROM_EMAIL,
        to: [email],
        reply_to: process.env.WAITLIST_REPLY_TO ?? process.env.WAITLIST_FROM_EMAIL,
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
}
