import React from "react";
import { useNavigate } from "react-router-dom";

import { consumeSupabaseRedirectFromUrl, getSupabaseSession } from "../../auth/supabaseAuth";
import { ensureSupabaseDemoWorkspace } from "../../auth/supabaseBootstrap";
import { useMockAdapter, useSupabaseAdapter } from "../../data/adapter";

/**
 * Handles app entry at "/" (and optional "/auth/callback") so Supabase magic-link redirects
 * don’t get wiped out by an eager redirect to /w/demo/board.
 */
export function AuthLandingPage() {
  const nav = useNavigate();
  const [status, setStatus] = React.useState<"loading" | "needSignIn" | "error">("loading");
  const [debug, setDebug] = React.useState<string>("");
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const useSupabase = (import.meta.env.VITE_USE_SUPABASE as string | undefined) === "1";

      try {
        if (useSupabase) {
          // Critical: consume `?code=...` or `#access_token=...` before we change routes.
          const before = typeof window === "undefined" ? "" : window.location.href;
          const consumed = await consumeSupabaseRedirectFromUrl();
          const after = typeof window === "undefined" ? "" : window.location.href;
          const dbg = [
            `before=${before}`,
            `after=${after}`,
            `consumed=${String(consumed)}`,
            `hash=${typeof window === "undefined" ? "" : window.location.hash}`,
            `search=${typeof window === "undefined" ? "" : window.location.search}`
          ].join("\n");
          if (alive) setDebug(dbg);

          const s = await getSupabaseSession();
          const email = s.data.session?.user?.email ?? null;
          if (!alive) return;

          if (email) {
            useSupabaseAdapter();
            const wsId = await ensureSupabaseDemoWorkspace();
            if (!alive) return;
            nav(`/w/${wsId}/board`, { replace: true });
            return;
          }

          // IMPORTANT: do NOT auto-redirect to /w/demo here. If the magic-link flow failed,
          // redirecting immediately makes it impossible to see/capture what URL we landed on.
          setStatus("needSignIn");
          return;
        }
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(e?.message ?? String(e));
        setStatus("error");
        return;
      }

      useMockAdapter();
      nav("/w/demo/board", { replace: true });
    })();

    return () => {
      alive = false;
    };
  }, [nav]);

  return (
    <div className="h-[calc(100vh-3.5rem)] grid place-items-center bg-slate-50 px-4">
      {status === "loading" ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : (
        <div className="w-full max-w-[640px] rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="text-base font-semibold text-slate-900">
            {status === "error" ? "Supabase bootstrap failed" : "Supabase sign-in didn’t complete"}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            {status === "error" ? (
              <>
                Supabase auth succeeded, but a follow-up write was rejected (usually RLS). Error:{" "}
                <span className="font-medium text-slate-900">{errorMsg}</span>
              </>
            ) : (
              <>
                The app didn’t detect a Supabase session after the redirect. Click{" "}
                <span className="font-medium">Sign in</span> in the top bar and try again. You can also continue in demo
                mode.
              </>
            )}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                useMockAdapter();
                nav("/w/demo/board", { replace: true });
              }}
            >
              Continue in demo
            </button>
          </div>

          {debug ? (
            <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-800">
                Debug details (copy/paste to me)
              </summary>
              <pre className="mt-2 overflow-auto text-xs text-slate-700">{debug}</pre>
            </details>
          ) : null}
        </div>
      )}
    </div>
  );
}


