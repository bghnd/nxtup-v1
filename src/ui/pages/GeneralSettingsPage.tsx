import React from "react";
import { Card } from "../components/Card";

export function GeneralSettingsPage() {
  return (
    <div>
      <div className="text-2xl font-semibold text-slate-900">Settings</div>
      <div className="mt-1 text-sm text-slate-500">Workspace settings (MVP placeholder)</div>

      <div className="mt-6">
        <Card className="p-4">
          <div className="text-sm font-medium text-slate-900">General</div>
          <div className="mt-1 text-sm text-slate-500">
            Workspace name, preferences, and later: theme toggle.
          </div>
        </Card>
      </div>
    </div>
  );
}




