import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp, isSameOrigin } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Two-tier limit: protects the user from accidental loops AND the daily Gemini
// free-tier quota from a noisy IP. Enforced in dev too — the whole point is to
// not burn quota.
const PER_IP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const PER_IP_MAX = 10;
const GLOBAL_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h
const GLOBAL_MAX = 300;

const MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const MAX_QUESTION_CHARS = 500;
const MAX_PLANS = 3;

type PlanCtx = {
  rep_name: string;
  name: string;
  rate_type: string | null;
  term_months: number | null;
  renewable_pct: number | null;
  base_charge: number | null;
  etf_amount: number | null;
  time_of_use: boolean;
  bill_credits: { amount: number; threshold_kwh: number } | null;
  effectiveCentsPerKwh: number;
  estMonthlyBillUsd: number;
  estAnnualCostUsd: number;
  reasons: string[];
};

function formatPlan(p: PlanCtx, i: number): string {
  const term =
    p.term_months == null || p.term_months === 1 ? "month-to-month" : `${p.term_months}-month`;
  const lines = [
    `Plan ${i + 1}: ${p.rep_name} — ${p.name}`,
    `  Effective rate: ${p.effectiveCentsPerKwh.toFixed(1)}¢/kWh`,
    `  Rate type: ${p.rate_type ?? "unknown"} (${term})`,
    `  Est. monthly bill: $${p.estMonthlyBillUsd.toFixed(2)} / annual: $${p.estAnnualCostUsd.toFixed(2)}`,
    `  Renewable: ${p.renewable_pct == null ? "unknown" : `${p.renewable_pct}%`}`,
    `  Base charge: ${p.base_charge == null ? "unknown" : `$${p.base_charge.toFixed(2)}/mo`}`,
    `  Termination fee: ${
      p.etf_amount == null ? "unknown" : p.etf_amount === 0 ? "none" : `$${p.etf_amount.toFixed(0)}`
    }`,
    `  Time-of-use: ${p.time_of_use ? "yes" : "no"}`,
  ];
  if (p.bill_credits) {
    lines.push(
      `  Bill credit: $${p.bill_credits.amount} at ${p.bill_credits.threshold_kwh.toLocaleString()}+ kWh/mo`,
    );
  }
  if (p.reasons.length > 0) {
    lines.push(`  Ranking highlights: ${p.reasons.slice(0, 3).join("; ")}`);
  }
  return lines.join("\n");
}

const SYSTEM_INSTRUCTION = `You are Texergy Bot, the in-app assistant for Texergy AI — an AI-ranked electricity-plan recommender for residents of deregulated Texas (ERCOT). The user is comparing 2–3 retail electricity plans side-by-side and asks a question to help them decide.

Ground rules:
- Use ONLY the plan data provided. Do not invent rates, fees, contract terms, or features that aren't in the data.
- When a field is "unknown", say so plainly. Don't guess.
- Refer to plans by "Plan 1", "Plan 2", "Plan 3" (matching the order given) OR by the REP + plan name. Don't reorder.
- Be concrete: cite numbers from the data when comparing (e.g. "Plan 2 is 1.3¢/kWh cheaper at the user's usage").
- Keep it brief — 3–6 short sentences, or a compact bulleted list. No marketing fluff.
- Texas-specific context you may use: ERCOT is the grid operator; TDUs (Oncor, CenterPoint, AEP, TNMP) deliver power and bill pass-through; REPs (retail providers) set the plan terms. Bill credits create "cliffs" — small usage swings around the threshold can swing the bill by tens of dollars.
- If the question is off-topic (not about these plans or Texas electricity), politely redirect.
- Do not give legal or financial advice. Do not promise savings.
- Output plain text only. Do NOT use markdown formatting: no **bold**, no *italics*, no backticks, no headings. Plain hyphens are fine for bulleted lists.`;

export async function POST(req: NextRequest) {
  // Warn if IP_HASH_SALT is missing in production (rate limit security risk).
  if (!process.env.IP_HASH_SALT && process.env.NODE_ENV === "production") {
    console.warn("⚠️ IP_HASH_SALT not set in production. Rate limiting uses fallback salt — update env vars.");
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json({ ok: false, reason: "bad_content_type" }, { status: 415 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 500 });
  }

  const ipHash = hashIp(getClientIp(req));
  const perIp = rateLimit(`ask-bot:ip:${ipHash}`, {
    windowMs: PER_IP_WINDOW_MS,
    max: PER_IP_MAX,
  });
  if (!perIp.allowed) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((perIp.resetAt - Date.now()) / 1000).toString(),
        },
      },
    );
  }
  const global = rateLimit("ask-bot:global", {
    windowMs: GLOBAL_WINDOW_MS,
    max: GLOBAL_MAX,
  });
  if (!global.allowed) {
    return NextResponse.json(
      { ok: false, reason: "global_rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((global.resetAt - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  let body: { plans?: PlanCtx[]; question?: string };
  try {
    body = (await req.json()) as { plans?: PlanCtx[]; question?: string };
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  const plans = Array.isArray(body.plans) ? body.plans.slice(0, MAX_PLANS) : [];

  if (question.length === 0 || question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json({ ok: false, reason: "invalid_question" }, { status: 400 });
  }
  if (plans.length === 0) {
    return NextResponse.json({ ok: false, reason: "no_plans" }, { status: 400 });
  }

  const planBlock = plans.map(formatPlan).join("\n\n");
  const userPrompt = `Plans being compared:\n\n${planBlock}\n\nUser question:\n${question}`;

  let gemRes: Response;
  try {
    gemRes = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 400,
        },
      }),
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "upstream_unreachable" }, { status: 502 });
  }

  if (!gemRes.ok) {
    return NextResponse.json(
      { ok: false, reason: "upstream_error", status: gemRes.status },
      { status: 502 },
    );
  }

  const json = (await gemRes.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;

  const raw =
    json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  // Strip markdown emphasis markers — the system prompt forbids them, but
  // Gemini occasionally slips. We render the answer as plain text in the UI.
  const answer = raw
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1");
  if (!answer) {
    return NextResponse.json({ ok: false, reason: "empty_response" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, answer });
}
