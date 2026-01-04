import React from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import {
  consumeSupabaseRedirectFromUrl,
  getSupabaseSession,
  onSupabaseAuthChange,
  sendOtp,
  signOutSupabase,
  verifyOtp
} from "../../auth/supabaseAuth";
import { clearLastSupabaseWorkspaceId, ensureSupabaseDemoWorkspace } from "../../auth/supabaseBootstrap";

export function SupabaseAuthModal({
  open,
  onOpenChange,
  onAuthed
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthed: (workspaceId: string) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"signin" | "manage">("signin");
  const didAuthed = React.useRef(false);

  const checkSession = React.useCallback(async () => {
    await consumeSupabaseRedirectFromUrl();
    const s = await getSupabaseSession();
    const email = s.data.session?.user?.email ?? null;
    setSessionEmail(email);
    return email;
  }, []);

  const checkSessionAndContinue = React.useCallback(async () => {
    const email = await checkSession();
    if (!email) return false;
    if (didAuthed.current) return true;
    didAuthed.current = true;
    const workspaceId = await ensureSupabaseDemoWorkspace();
    onAuthed(workspaceId);
    onOpenChange(false);
    return true;
  }, [checkSession, onAuthed, onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    didAuthed.current = false;
    let alive = true;
    void (async () => {
      try {
        const email = await checkSession();
        if (!alive) return;
        // If the user opened the modal while already signed in, keep it open (manage mode)
        // so they can click Sign out. Do NOT auto-bootstrap/auto-close.
        if (email) {
          setMode("manage");
          return;
        }
        setMode("signin");
        await checkSessionAndContinue();
      } catch {
        // ignore
      }
    })();
    const unsub = onSupabaseAuthChange(() => {
      if (!alive) return;
      // If we're mid sign-in flow, auto-continue; otherwise just refresh session display.
      if (mode === "signin") void checkSessionAndContinue();
      else void checkSession();
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [open, checkSession, checkSessionAndContinue, mode]);

  async function handleSend() {
    setBusy(true);
    setError(null);
    try {
      await sendOtp(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email.trim(), code.trim());
      await checkSessionAndContinue();
    } catch (e: any) {
      setError(e?.message ?? "Failed to verify code");
    } finally {
      setBusy(false);
    }
  }

  async function handleClickedLink() {
    setBusy(true);
    setError(null);
    try {
      const ok = await checkSessionAndContinue();
      if (!ok) setError("Not signed in yet. Click the magic link in your email, then try again.");
    } catch (e: any) {
      setError(e?.message ?? "Couldn't confirm sign-in yet.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await signOutSupabase();
      onOpenChange(false);
      // The app remains usable in mock mode after sign-out; we just reload to refresh state.
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "Failed to sign out");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Supabase sign-in">
      <div className="space-y-3">
        {sessionEmail ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Signed in as <span className="font-medium">{sessionEmail}</span>
          </div>
        ) : (
          <div className="text-sm text-slate-600">
            Sign in with your email to enable Supabase persistence. You can keep using mock mode without signing in.
          </div>
        )}

        {!sessionEmail ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              if (!sent) {
                void handleSend();
                return;
              }
              // If user has a code, verify it; otherwise treat Enter as "I clicked the link".
              if (code.trim().length >= 4) void handleVerify();
              else void handleClickedLink();
            }}
          >
            <div>
              <div className="text-sm font-medium text-slate-900">Email</div>
              <Input
                className="mt-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoFocus
              />
            </div>

            {sent ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  Check your email. Depending on your Supabase email settings, you may receive a{" "}
                  <span className="font-medium">magic link</span> and/or a <span className="font-medium">6‑digit code</span>.
                  After you click the link, this modal should continue automatically.
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">6-digit code (optional)</div>
                  <Input
                    className="mt-2"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    inputMode="numeric"
                  />
                </div>
              </div>
            ) : null}

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              {!sent ? (
                <Button type="submit" disabled={busy || !email.trim()}>
                  Send code
                </Button>
              ) : (
                <>
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => setSent(false)}>
                    Back
                  </Button>
                  <Button type="button" variant="secondary" disabled={busy} onClick={handleClickedLink}>
                    I clicked the link
                  </Button>
                  <Button type="submit" disabled={busy || !email.trim() || code.trim().length < 4}>
                    Verify code
                  </Button>
                </>
              )}
            </div>
          </form>
        ) : (
          <>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  clearLastSupabaseWorkspaceId();
                  window.location.reload();
                }}
                title="Clears local cached workspace id (useful after deleting a workspace in SQL)."
              >
                Reset local cache
              </Button>
              <Button disabled={busy} onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}


