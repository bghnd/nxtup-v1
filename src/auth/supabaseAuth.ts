import { supabase } from "../data/supabaseClient";

function parseHashParams(hash: string) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

/**
 * Supabase magic links can redirect back to the app in multiple formats:
 * - PKCE:   http://localhost:5173/?code=...
 * - Implicit: http://localhost:5173/#access_token=...&refresh_token=...&type=magiclink
 * - Sometimes token_hash/type are present (less common in web).
 *
 * In embedded browsers, automatic detection can be flaky, so we explicitly consume
 * these URL artifacts and store a session.
 */
export async function consumeSupabaseRedirectFromUrl(): Promise<boolean> {
  try {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);

    // 1) PKCE flow.
    const code = url.searchParams.get("code");
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      url.searchParams.delete("code");
      window.history.replaceState({}, document.title, url.toString());
      return true;
    }

    // 2) Implicit flow.
    const hashParams = parseHashParams(window.location.hash);
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
      // Remove hash params so refresh doesn't re-run.
      window.history.replaceState({}, document.title, url.origin + url.pathname + url.search);
      return true;
    }

    // 3) token_hash verification (rare for our setup, but cheap to support).
    const token_hash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    if (token_hash && type) {
      // @supabase/auth-js supports verifyOtp with token_hash.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.auth.verifyOtp({ token_hash, type: type as any } as any);
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      url.searchParams.delete("redirect_to");
      window.history.replaceState({}, document.title, url.toString());
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function getSupabaseSession() {
  return await supabase.auth.getSession();
}

export function onSupabaseAuthChange(cb: () => void) {
  const { data } = supabase.auth.onAuthStateChange(() => cb());
  return () => data.subscription.unsubscribe();
}

export async function sendOtp(email: string) {
  const emailRedirectTo =
    typeof window === "undefined" ? undefined : `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo }
  });
  if (error) throw error;
}

export async function verifyOtp(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
}

export async function signOutSupabase() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}


