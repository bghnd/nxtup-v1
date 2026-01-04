import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // We intentionally throw only when code tries to use the client.
  // This keeps local dev usable in mock mode without Supabase env vars.
  // eslint-disable-next-line no-console
  console.warn(
    "[NXTUP] Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to enable Supabase."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");


