import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  acceptInvite,
  createInvite,
  listInvites,
  listWorkspaceMembers,
  setMemberRole
} from "../../data/client";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useQueryClient } from "@tanstack/react-query";
import type { WorkspaceRole } from "../../domain/types";
import { useStubSession } from "../../auth/stubAuth";

export function MembersSettingsPage() {
  const { workspaceId = "demo" } = useParams();
  const qc = useQueryClient();
  const { session } = useStubSession();
  const canManageMembers = session.workspaceRole === "owner" || session.workspaceRole === "admin";

  const membersQ = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => listWorkspaceMembers(workspaceId)
  });

  const invitesQ = useQuery({
    queryKey: ["invites", workspaceId],
    queryFn: () => listInvites(workspaceId)
  });

  const members = membersQ.data ?? [];
  const invites = invitesQ.data ?? [];

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<WorkspaceRole>("member");
  const [acceptOpen, setAcceptOpen] = React.useState(false);
  const [acceptToken, setAcceptToken] = React.useState<string>("");
  const [acceptAsProfileId, setAcceptAsProfileId] = React.useState<string>(session.user.id);

  return (
    <div>
      <div className="text-2xl font-semibold text-slate-900">Members</div>
      <div className="mt-1 text-sm text-slate-500">
        Invite + role management (stub mode, no realtime)
      </div>

      <div className="mt-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-900">Workspace members</div>
            <Button size="sm" disabled={!canManageMembers} onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.profile.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={m.profile.name} src={m.profile.avatarUrl} className="h-9 w-9" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{m.profile.name}</div>
                    <div className="text-sm text-slate-500">{m.profile.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    className="h-9 w-[140px]"
                    value={m.role}
                    disabled={!canManageMembers}
                    onChange={async (e) => {
                      await setMemberRole({
                        workspaceId,
                        profileId: m.profile.id,
                        role: e.target.value as WorkspaceRole
                      });
                      await qc.invalidateQueries({ queryKey: ["members", workspaceId] });
                    }}
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-4" />

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900">Invites</div>
              <div className="mt-1 text-sm text-slate-500">
                In stub mode, you can “accept” an invite as any demo user.
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setAcceptOpen(true)}>
              Accept invite…
            </Button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {invites.length ? (
              invites.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{i.email}</div>
                    <div className="text-sm text-slate-500">
                      Role: {i.role} · Token:{" "}
                      <span className="font-mono text-slate-700">{i.token}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(i.token);
                      } catch {
                        // Fallback for browsers/contexts that block clipboard access
                        window.prompt("Copy invite token:", i.token);
                      }
                    }}
                  >
                    Copy token
                  </Button>
                </div>
              ))
            ) : (
              <div className="py-6 text-sm text-slate-500">No pending invites.</div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={inviteOpen}
        title="Invite member"
        description={canManageMembers ? "Create an invite link/token." : "Only Owner/Admin can invite."}
        onClose={() => setInviteOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canManageMembers || inviteEmail.trim().length === 0}
              onClick={async () => {
                await createInvite({
                  workspaceId,
                  email: inviteEmail,
                  role: inviteRole,
                  createdBy: session.user.id
                });
                setInviteEmail("");
                setInviteRole("member");
                setInviteOpen(false);
                await qc.invalidateQueries({ queryKey: ["invites", workspaceId] });
              }}
            >
              Create invite
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">Email</div>
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
              type="email"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">Role</div>
            <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </Select>
          </label>
        </div>
      </Modal>

      <Modal
        open={acceptOpen}
        title="Accept invite (stub)"
        description="Paste an invite token, then choose which demo user accepts it."
        onClose={() => setAcceptOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setAcceptOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={acceptToken.trim().length === 0}
              onClick={async () => {
                await acceptInvite({ token: acceptToken.trim(), acceptAsProfileId });
                setAcceptToken("");
                setAcceptOpen(false);
                await Promise.all([
                  qc.invalidateQueries({ queryKey: ["members", workspaceId] }),
                  qc.invalidateQueries({ queryKey: ["invites", workspaceId] })
                ]);
              }}
            >
              Accept
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">Invite token</div>
            <Input
              value={acceptToken}
              onChange={(e) => setAcceptToken(e.target.value)}
              placeholder="inv_..."
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">Accept as</div>
            <Select value={acceptAsProfileId} onChange={(e) => setAcceptAsProfileId(e.target.value)}>
              {members.map((m) => (
                <option key={m.profile.id} value={m.profile.id}>
                  {m.profile.name}
                </option>
              ))}
              {/* allow accepting as current user even if not in members list yet */}
              {!members.some((m) => m.profile.id === session.user.id) ? (
                <option value={session.user.id}>{session.user.name}</option>
              ) : null}
            </Select>
          </label>
        </div>
      </Modal>
    </div>
  );
}


