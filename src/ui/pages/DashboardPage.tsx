import React from "react";
import { Card } from "../components/Card";

export function DashboardPage() {
  return (
    <div>
      <div className="text-2xl font-semibold text-slate-900">My Dashboard</div>
      <div className="mt-1 text-sm text-slate-500">Coming soon (MVP placeholder)</div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="text-sm font-medium text-slate-900">Inbox</div>
          <div className="mt-1 text-sm text-slate-500">Phase 2</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-slate-900">Velocity</div>
          <div className="mt-1 text-sm text-slate-500">Phase 2</div>
        </Card>
      </div>
    </div>
  );
}




