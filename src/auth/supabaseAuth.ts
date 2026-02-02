import { supabase } from "../data/supabaseClient";

/**
 * Returns the current Supabase session (if any).
 */
export async function getSupabaseSession() {
    return await supabase.auth.getSession();
}

/**
 * Subscribes to changes in Supabase auth state.
 * Returns an unsubscribe function.
 */
export function onSupabaseAuthChange(callback: () => void): () => void {
    const { data } = supabase.auth.onAuthStateChange(() => {
        callback();
    });
    return () => data.subscription.unsubscribe();
}

/**
 * After a magic-link redirect, the session is usually in the URL hash.
 * Supabase client auto-parses the hash on init, but we call this to ensure
 * the session is established and then clean up the URL.
 */
export async function consumeSupabaseRedirectFromUrl(): Promise<void> {
    // Check for hash fragment (Supabase sends tokens in hash: #access_token=...&refresh_token=...)
    const hash = window.location.hash;
    if (hash && (hash.includes("access_token") || hash.includes("refresh_token") || hash.includes("error"))) {
        // Supabase client automatically parses the hash and sets the session.
        // We just need to get the session to trigger the update, then clean the URL.
        await supabase.auth.getSession();

        // Clean up URL by removing the hash
        const cleanUrl = window.location.href.split("#")[0];
        window.history.replaceState({}, "", cleanUrl);
        return;
    }

    // Also check for PKCE code flow (?code=...)
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
        // Exchange code for session
        await supabase.auth.exchangeCodeForSession(code);

        // Clean up URL
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
    }
}

/**
 * Signs the user in using a magic link (email OTP).
 */
export async function signInWithMagicLink(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: window.location.origin
        }
    });
    if (error) throw error;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
}

/**
 * Sign in with email and password.
 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
}

/**
 * Sign up with email and password.
 */
export async function signUpWithPassword(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: window.location.origin
        }
    });
    if (error) throw error;
}

/**
 * Dev-only: Auto-login with a test account.
 * Creates the account if it doesn't exist, then signs in.
 */
export async function devAutoLogin(): Promise<void> {
    const devEmail = "dev@nxtup.local";
    const devPassword = "devpassword123";

    // Try to sign in first
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword
    });

    if (signInError) {
        // If sign in failed, try to create the account
        const { error: signUpError } = await supabase.auth.signUp({
            email: devEmail,
            password: devPassword
        });

        if (signUpError && !signUpError.message.includes("already registered")) {
            throw signUpError;
        }

        // Try signing in again after signup
        const { error: retryError } = await supabase.auth.signInWithPassword({
            email: devEmail,
            password: devPassword
        });
        if (retryError) throw retryError;
    }
}
