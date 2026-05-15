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

function buildBody(zip: string | null, recipientEmail?: string) {
  const subject = "You're on the list — Texergy AI";
  const zipLine = zip
    ? `We've noted ZIP ${escapeHtml(zip)}. When early access opens we'll show you the plans available in your service area first.`
    : "When early access opens, drop your ZIP and we'll show you the plans available in your service area.";

  // Unsubscribe — mailto for v1. Captures the recipient address in the subject
  // so a real unsubscribe endpoint later can pick the row out of the inbox.
  const unsubAddr = "hello@texergy.ai";
  const unsubSubject = encodeURIComponent(
    recipientEmail ? `Unsubscribe ${recipientEmail}` : "Unsubscribe",
  );
  const unsubHref = `mailto:${unsubAddr}?subject=${unsubSubject}`;

  const text = [
    "TEXERGYAI",
    "01 / EARLY ACCESS",
    "",
    "YOU'RE ON THE LIST.",
    "",
    "You're confirmed for early access to Texergy AI — the smarter way for Texans to shop electricity plans.",
    "",
    zipLine.replace(/<[^>]+>/g, ""),
    "",
    "WHAT'S NEXT",
    "  → We'll email you the moment early access opens.",
    "  → You'll be one of the first to try the AI-ranked plan matcher.",
    "  → 100% free. No sign up required.",
    "",
    "Questions? Just reply — we read everything.",
    "",
    "— THE TEXERGY AI TEAM",
    "  texergy.ai",
    "",
    `Unsubscribe: ${unsubHref}`,
  ].join("\n");

  // Email-safe palette mirroring the site's light theme:
  //   foreground #1a1a1a  ·  muted #6b6b6b  ·  accent #f47a1a  ·  border #d4d4d4
  //   split-flap cell bg #fafafa  ·  divider line #d4d4d4
  // Fonts stick to system stacks: Helvetica for sans (uppercase + tracked stands in
  // for Bebas Neue on the headline + brand mark), and the OS mono for small mono labels.
  const sans = "Helvetica,Arial,sans-serif";
  const mono = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

  // Static split-flap-style brand mark: one <td> per character.
  // "TEXERGYAI" with the "AI" indices (7,8) accented, matching hero.
  // Each cell has a horizontal divider at 50% via an absolutely-positioned strip.
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

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#fafafa;font-family:${sans};color:#1a1a1a;-webkit-font-smoothing:antialiased;">
  <!-- Preheader: shown in inbox previews, hidden in the message body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all;">
    You're on the early-access waitlist for Texergy AI.
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
              01&nbsp;/&nbsp;Early&nbsp;Access
            </div>
          </td></tr>

          <tr><td style="padding:8px 36px 24px;">
            <h1 style="margin:0;font-family:${sans};font-size:44px;line-height:1.02;letter-spacing:0.02em;text-transform:uppercase;font-weight:700;color:#1a1a1a;">
              You're on<br/>the list.
            </h1>
          </td></tr>

          <tr><td style="padding:0 36px 24px;">
            <div style="height:1px;line-height:1px;font-size:0;background:#d4d4d4;">&nbsp;</div>
          </td></tr>

          <tr><td style="padding:0 36px 18px;">
            <p style="margin:0;font-family:${mono};font-size:14px;line-height:1.7;color:#1a1a1a;">
              You're confirmed for early access to Texergy AI — the smarter way for Texans to shop electricity plans.
            </p>
          </td></tr>

          <tr><td style="padding:0 36px 28px;">
            <p style="margin:0;font-family:${mono};font-size:14px;line-height:1.7;color:#6b6b6b;">
              ${zipLine}
            </p>
          </td></tr>

          <tr><td style="padding:24px 36px 12px;border-top:1px solid #d4d4d4;">
            <div style="font-family:${mono};font-size:10px;font-weight:600;letter-spacing:0.3em;text-transform:uppercase;color:#f47a1a;">
              02&nbsp;/&nbsp;What's&nbsp;Next
            </div>
          </td></tr>

          <tr><td style="padding:0 36px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="top" style="font-family:${mono};font-size:14px;line-height:1.7;color:#f47a1a;width:24px;padding-top:6px;">→</td>
                <td style="font-family:${mono};font-size:14px;line-height:1.7;color:#1a1a1a;padding-top:6px;">We'll email you the moment early access opens.</td>
              </tr>
              <tr>
                <td valign="top" style="font-family:${mono};font-size:14px;line-height:1.7;color:#f47a1a;width:24px;padding-top:6px;">→</td>
                <td style="font-family:${mono};font-size:14px;line-height:1.7;color:#1a1a1a;padding-top:6px;">You'll be among the first to try the AI-ranked plan matcher.</td>
              </tr>
              <tr>
                <td valign="top" style="font-family:${mono};font-size:14px;line-height:1.7;color:#f47a1a;width:24px;padding-top:6px;">→</td>
                <td style="font-family:${mono};font-size:14px;line-height:1.7;color:#1a1a1a;padding-top:6px;">100% free. No sign up required.</td>
              </tr>
            </table>
          </td></tr>

          <tr><td style="padding:20px 36px 0;border-top:1px solid #d4d4d4;">
            <p style="margin:0 0 18px;font-family:${mono};font-size:13px;line-height:1.7;color:#6b6b6b;">
              Questions? Just reply — we read everything.
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
              You're getting this because you joined the Texergy AI early-access waitlist.
              <a href="${unsubHref}" style="color:#6b6b6b;text-decoration:underline;">Unsubscribe</a>.
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

export async function sendWaitlistConfirmation(
  email: string,
  zip: string | null,
): Promise<SendResult> {
  if (!isConfigured()) {
    return { ok: false, error: "RESEND_API_KEY or WAITLIST_FROM_EMAIL not set" };
  }

  const { subject, text, html } = buildBody(zip, email);

  // List-Unsubscribe / One-Click: surfaces Gmail's inline "Unsubscribe" button
  // and is required by Gmail's bulk-sender policy.
  const unsubSubject = encodeURIComponent(`Unsubscribe ${email}`);
  const listUnsub = `<mailto:hello@texergy.ai?subject=${unsubSubject}>`;

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
