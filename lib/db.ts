import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
    );
  }
  client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// --- Newsletter ---------------------------------------------------------

export type NewsletterInsert = {
  email: string;
  source?: string | null;
  ipHash?: string | null;
};

export async function addNewsletterSubscriber(
  entry: NewsletterInsert,
): Promise<{ inserted: boolean; reactivated: boolean }> {
  const supabase = getClient();
  // Try insert first. On unique conflict, check if it's a previously
  // unsubscribed row that should be reactivated.
  const { error } = await supabase.from("newsletter_subscribers").insert({
    email: entry.email,
    source: entry.source ?? null,
    ip_hash: entry.ipHash ?? null,
  });
  if (!error) return { inserted: true, reactivated: false };
  if (error.code !== "23505") throw error; // not a unique violation -> real error

  // Row already exists. If it's unsubscribed, flip it back on.
  const { data: existing, error: lookupErr } = await supabase
    .from("newsletter_subscribers")
    .select("id, unsubscribed_at")
    .eq("email", entry.email)
    .maybeSingle();
  if (lookupErr) throw lookupErr;
  if (!existing) return { inserted: false, reactivated: false };

  if (existing.unsubscribed_at) {
    const { error: updErr } = await supabase
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: null, subscribed_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updErr) throw updErr;
    return { inserted: false, reactivated: true };
  }
  return { inserted: false, reactivated: false };
}

export async function unsubscribeNewsletter(
  email: string,
): Promise<{ updated: boolean }> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email.toLowerCase())
    .is("unsubscribed_at", null)
    .select("id");
  if (error) throw error;
  return { updated: (data?.length ?? 0) > 0 };
}

