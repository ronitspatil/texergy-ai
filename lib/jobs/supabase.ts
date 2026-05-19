import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Deadline {
  private readonly until: number;
  constructor(budgetMs: number) {
    this.until = Date.now() + budgetMs;
  }
  remainingMs(): number {
    return Math.max(0, this.until - Date.now());
  }
  expired(graceMs = 0): boolean {
    return Date.now() + graceMs >= this.until;
  }
}
