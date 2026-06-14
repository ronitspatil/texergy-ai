// Lightweight Resend client — no SDK dependency, just fetch.
// If RESEND_API_KEY / WAITLIST_FROM_EMAIL are unset, send functions are no-ops.

const RESEND_API = "https://api.resend.com/emails";

type SendResult = { ok: boolean; id?: string; error?: string };

function isConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.WAITLIST_FROM_EMAIL);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// --- Newsletter -----------------------------------------------------------

function buildNewsletterBody(recipientEmail: string, unsubUrl: string) {
  const subject = "You're subscribed to Texergy AI";

  const sans = "Helvetica,Arial,sans-serif";
  const mono = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

  const brandChars = "TEXERGYAI".split("");
  const accentIdx = new Set([7, 8]);
  const cellW = 34;
  const cellH = 48;
  const fontPx = 36;
  const brandCells = brandChars
    .map((c, i) => {
      const color = accentIdx.has(i) ? "#f47a1a" : "#1a1a1a";
      return `<td width="${cellW}" valign="middle" align="center" style="padding:0 2px;">
        <div style="position:relative;width:${cellW}px;height:${cellH}px;background:#fafafa;border:1px solid #d4d4d4;font-family:${sans};font-weight:700;font-size:${fontPx}px;line-height:${cellH}px;color:${color};text-align:center;">
          ${c}
          <div style="position:absolute;left:0;right:0;top:50%;height:1px;background:#d4d4d4;line-height:1px;font-size:0;">&nbsp;</div>
        </div>
      </td>`;
    })
    .join("");
  const brandMark = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>${brandCells}</tr></table>`;

  const text = [
    "TEXERGYAI",
    "NEWSLETTER",
    "",
    "YOU'RE SUBSCRIBED.",
    "",
    `${recipientEmail} is now on the Texergy AI newsletter list.`,
    "",
    "We'll send a short note when a new post goes up. No spam, no promotions, no AI-generated filler — just field notes on the Texas electricity market.",
    "",
    "Reply to this email if you want to unsubscribe, or use the link below.",
    "",
    `Unsubscribe: ${unsubUrl}`,
    "",
    "— THE TEXERGY AI TEAM",
    "  texergy.ai",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#fafafa;font-family:${sans};color:#1a1a1a;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all;">
    You're subscribed to the Texergy AI newsletter.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5e5e5;">
          <tr><td style="padding:40px 36px 28px;">
            ${brandMark}
          </td></tr>

          <tr><td style="padding:0 36px 8px;">
            <div style="font-family:${mono};font-size:10px;font-weight:600;letter-spacing:0.3em;text-transform:uppercase;color:#f47a1a;">
              Newsletter
            </div>
          </td></tr>

          <tr><td style="padding:8px 36px 24px;">
            <h1 style="margin:0;font-family:${sans};font-size:44px;line-height:1.02;letter-spacing:0.02em;text-transform:uppercase;font-weight:700;color:#1a1a1a;">
              You're<br/>subscribed.
            </h1>
          </td></tr>

          <tr><td style="padding:0 36px 24px;">
            <div style="height:1px;line-height:1px;font-size:0;background:#d4d4d4;">&nbsp;</div>
          </td></tr>

          <tr><td style="padding:0 36px 18px;">
            <p style="margin:0;font-family:${mono};font-size:14px;line-height:1.7;color:#1a1a1a;">
              ${escapeHtml(recipientEmail)} is now on the Texergy AI newsletter list.
            </p>
          </td></tr>

          <tr><td style="padding:0 36px 28px;">
            <p style="margin:0;font-family:${mono};font-size:14px;line-height:1.7;color:#6b6b6b;">
              We'll send a short note when a new post goes up. Field notes on the Texas electricity market, no marketing filler.
            </p>
          </td></tr>

          <tr><td style="padding:24px 36px 24px;border-top:1px solid #d4d4d4;">
            <p style="margin:0 0 16px;font-family:${mono};font-size:12px;line-height:1.7;color:#6b6b6b;">
              Changed your mind? Unsubscribe in one click.
            </p>
            <a href="${unsubUrl}" style="display:inline-block;border:1px solid #1a1a1a;color:#1a1a1a;text-decoration:none;padding:10px 18px;font-family:${mono};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
              Unsubscribe →
            </a>
          </td></tr>

          <tr><td style="padding:24px 36px 0;border-top:1px solid #d4d4d4;">
            <p style="margin:0 0 18px;font-family:${mono};font-size:13px;line-height:1.7;color:#6b6b6b;">
              Questions? Just reply.
            </p>
            <div style="font-family:${mono};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#1a1a1a;">
              — The Texergy AI Team
            </div>
            <a href="https://texergy.ai" style="display:inline-block;margin-top:6px;font-family:${mono};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#f47a1a;text-decoration:none;">
              texergy.ai →
            </a>
          </td></tr>

          <tr><td style="padding:32px 36px 36px;">
            <p style="margin:0 0 10px;font-family:${mono};font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#9a9a9a;">
              Texergy AI · Built for Texas · ERCOT
            </p>
            <p style="margin:0;font-family:${mono};font-size:11px;line-height:1.6;color:#9a9a9a;">
              You're getting this because you subscribed to the Texergy AI newsletter.
              <a href="${unsubUrl}" style="color:#6b6b6b;text-decoration:underline;">Unsubscribe</a>.
            </p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendNewsletterConfirmation(
  email: string,
  unsubscribeUrl: string,
): Promise<SendResult> {
  if (!isConfigured()) {
    return { ok: false, error: "RESEND_API_KEY or WAITLIST_FROM_EMAIL not set" };
  }

  const { subject, text, html } = buildNewsletterBody(email, unsubscribeUrl);
  const listUnsub = `<${unsubscribeUrl}>`;

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
        headers: {
          "List-Unsubscribe": listUnsub,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
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
