import React from "react";
import type { Profile, WorkspaceRole } from "../domain/types";
import { demoProfiles } from "../data/mockDb";

export type StubSession = {
  user: Profile;
  workspaceRole: WorkspaceRole;
};

const STORAGE_KEY = "nxtup.stub.session.v1";

function loadSession(): StubSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StubSession;
      if (parsed?.user?.id) return parsed;
    }
  } catch {
    // ignore
  }

  return { user: demoProfiles[0]!, workspaceRole: "owner" };
}

function saveSession(session: StubSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function useStubSession() {
  const [session, setSession] = React.useState<StubSession>(() => loadSession());

  const setUser = React.useCallback((userId: string) => {
    const user = demoProfiles.find((p) => p.id === userId) ?? demoProfiles[0]!;
    setSession((prev) => {
      const next = { ...prev, user };
      saveSession(next);
      return next;
    });
  }, []);

  const setWorkspaceRole = React.useCallback((workspaceRole: WorkspaceRole) => {
    setSession((prev) => {
      const next = { ...prev, workspaceRole };
      saveSession(next);
      return next;
    });
  }, []);

  return { session, setUser, setWorkspaceRole, allUsers: demoProfiles };
}




