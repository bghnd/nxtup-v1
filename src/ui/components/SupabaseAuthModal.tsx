import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";
import {
    signInWithMagicLink,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    getSupabaseSession,
    devAutoLogin
} from "../../auth/supabaseAuth";
import { ensureSupabaseDemoWorkspace, setLastSupabaseWorkspaceId } from "../../auth/supabaseBootstrap";

interface SupabaseAuthModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAuthed: (workspaceId: string) => void;
}

type AuthMode = "magic" | "password";

export function SupabaseAuthModal({ open, onOpenChange, onAuthed }: SupabaseAuthModalProps) {
    const [mode, setMode] = React.useState<AuthMode>("password");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [sent, setSent] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isSignedIn, setIsSignedIn] = React.useState(false);
    const [isSignUp, setIsSignUp] = React.useState(false);

    const isDev = import.meta.env.DEV;

    React.useEffect(() => {
        if (!open) return;
        getSupabaseSession().then((session) => {
            setIsSignedIn(!!session.data.session);
        });
    }, [open]);

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setError(null);

        try {
            await signInWithMagicLink(email.trim());
            setSent(true);
        } catch (err: any) {
            setError(err?.message || "Failed to send magic link");
        } finally {
            setLoading(false);
        }
    };

    const handlePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) return;

        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                await signUpWithPassword(email.trim(), password);
                setError(null);
                // After signup, Supabase may require email confirmation. Try signing in.
                try {
                    await signInWithPassword(email.trim(), password);
                } catch {
                    // If sign in fails after signup, might need email confirmation
                    setError("Account created! Check your email to confirm, then sign in.");
                    setIsSignUp(false);
                    setLoading(false);
                    return;
                }
            } else {
                await signInWithPassword(email.trim(), password);
            }
            await handleContinue();
        } catch (err: any) {
            setError(err?.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDevLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            await devAutoLogin();
            await handleContinue();
        } catch (err: any) {
            setError(err?.message || "Dev auto-login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        setLoading(true);
        try {
            await signOut();
            setIsSignedIn(false);
            setSent(false);
            setEmail("");
            setPassword("");
        } catch (err: any) {
            setError(err?.message || "Failed to sign out");
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = async () => {
        setLoading(true);
        try {
            const wsId = await ensureSupabaseDemoWorkspace();
            setLastSupabaseWorkspaceId(wsId);
            onAuthed(wsId);
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.message || "Failed to load workspace");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={() => onOpenChange(false)} title="Supabase Auth">
            <div className="space-y-4">
                {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
                )}

                {isSignedIn ? (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">You are signed in with Supabase.</p>
                        <div className="flex gap-2">
                            <Button onClick={handleContinue} disabled={loading}>
                                {loading ? "Loading..." : "Continue to Workspace"}
                            </Button>
                            <Button variant="secondary" onClick={handleSignOut} disabled={loading}>
                                Sign Out
                            </Button>
                        </div>
                    </div>
                ) : sent ? (
                    <div className="space-y-2">
                        <p className="text-sm text-slate-700">
                            ✓ Magic link sent to <strong>{email}</strong>
                        </p>
                        <p className="text-sm text-slate-500">
                            Check your email and click the link to sign in.
                        </p>
                        <Button variant="secondary" onClick={() => setSent(false)}>
                            Try a different method
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Dev bypass button */}
                        {isDev && (
                            <div className="border-b border-slate-200 pb-4">
                                <Button
                                    onClick={handleDevLogin}
                                    disabled={loading}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                >
                                    {loading ? "Signing in..." : "⚡ Dev Auto-Login"}
                                </Button>
                                <p className="mt-1 text-xs text-slate-500 text-center">
                                    Development only — uses test account
                                </p>
                            </div>
                        )}

                        {/* Mode tabs */}
                        <div className="flex gap-2 border-b border-slate-200">
                            <button
                                type="button"
                                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${mode === "password"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                                    }`}
                                onClick={() => setMode("password")}
                            >
                                Password
                            </button>
                            <button
                                type="button"
                                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${mode === "magic"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                                    }`}
                                onClick={() => setMode("magic")}
                            >
                                Magic Link
                            </button>
                        </div>

                        {mode === "password" ? (
                            <form onSubmit={handlePassword} className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Password
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={loading || !email.trim() || !password}>
                                        {loading ? "..." : isSignUp ? "Sign Up" : "Sign In"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setIsSignUp(!isSignUp)}
                                    >
                                        {isSignUp ? "Have an account? Sign in" : "New? Sign up"}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleMagicLink} className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" disabled={loading || !email.trim()}>
                                    {loading ? "Sending..." : "Send Magic Link"}
                                </Button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
