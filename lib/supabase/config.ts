/**
 * Supabase connection settings. The URL is reduced to its origin, so a
 * pasted endpoint like "https://x.supabase.co/rest/v1/" still works.
 */
export function getSupabaseConfig(): { url: string; key: string } | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!rawUrl || !key) return null;
  try {
    return { url: new URL(rawUrl).origin, key };
  } catch {
    return null;
  }
}
