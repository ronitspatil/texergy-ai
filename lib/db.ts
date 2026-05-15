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

export type WaitlistInsert = {
  email: string;
  zip?: string | null;
  referrer?: string | null;
  ipHash?: string | null;
};

export async function addToWaitlist(
  entry: WaitlistInsert,
): Promise<{ inserted: boolean }> {
  const { error } = await getClient().from("waitlist").insert({
    email: entry.email,
    zip: entry.zip ?? null,
    referrer: entry.referrer ?? null,
    ip_hash: entry.ipHash ?? null,
  });

  if (!error) return { inserted: true };
  // 23505 = unique_violation (duplicate email). Mirror previous "INSERT OR IGNORE" behavior.
  if (error.code === "23505") return { inserted: false };
  throw error;
}

export async function waitlistCount(): Promise<number> {
  const { count, error } = await getClient()
    .from("waitlist")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export type WaitlistRow = {
  id: number;
  email: string;
  zip: string | null;
  referrer: string | null;
  created_at: number;
};

export async function listWaitlist(
  opts: { limit?: number; offset?: number } = {},
): Promise<WaitlistRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
  const offset = Math.max(opts.offset ?? 0, 0);

  const { data, error } = await getClient()
    .from("waitlist")
    .select("id, email, zip, referrer, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    email: String(r.email),
    zip: r.zip == null ? null : String(r.zip),
    referrer: r.referrer == null ? null : String(r.referrer),
    created_at: new Date(r.created_at as string).getTime(),
  }));
}
