import React from "react";
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError
} from "react-router-dom";

import { Button } from "../components/Button";
import { Card } from "../components/Card";

export function RouteErrorPage() {
  const err = useRouteError();
  const nav = useNavigate();

  let title = "Something went wrong";
  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(err)) {
    title = `Error ${err.status}`;
    message = err.statusText || message;
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  return (
    <div className="min-h-[60vh] p-6">
      <div className="mx-auto max-w-[720px]">
        <Card className="p-6">
          <div className="text-xl font-semibold text-slate-900">{title}</div>
          <div className="mt-2 text-sm text-slate-600">{message}</div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button variant="secondary" onClick={() => nav("/w/demo/board")}>
              Go to board
            </Button>
          </div>

          {err instanceof Error && err.stack ? (
            <pre className="mt-6 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {err.stack}
            </pre>
          ) : null}
        </Card>
      </div>
    </div>
  );
}




