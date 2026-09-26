import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Browser Supabase client (singleton). Only repositories and auth should import this. */
export function getSupabase() {
  if (!client) {
    const config = getSupabaseConfig();
    if (!config) {
      throw new Error(
        "Missing or invalid NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. See README.",
      );
    }
    client = createBrowserClient(config.url, config.key);
  }
  return client;
}
