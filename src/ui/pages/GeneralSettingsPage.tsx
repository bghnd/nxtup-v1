import React from "react";
import { Card } from "../components/Card";

export function GeneralSettingsPage() {
  return (
    <div>
      <div className="text-2xl font-semibold text-foreground">Settings</div>
      <div className="mt-1 text-sm text-muted-foreground">Workspace settings (MVP placeholder)</div>

      <div className="mt-6">
        <Card className="p-4">
          <div className="text-sm font-medium text-foreground">General</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Workspace name, preferences, and later: theme toggle.
          </div>
        </Card>
      </div>
    </div>
  );
}




