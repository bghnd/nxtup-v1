import React from "react";
import type { Priority, Profile, Task, TaskLocation, TaskParticipant } from "../../domain/types";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Input } from "./Input";
import { Select } from "./Select";

export type TaskDrawerMode = "create" | "edit";

export function TaskDrawer({
  open,
  mode,
  task,
  profiles,
  participants,
  onClose,
  onSave,
  onDelete,
  onAddMember
}: {
  open: boolean;
  mode: TaskDrawerMode;
  task?: Task | null;
  profiles: Profile[];
  participants?: TaskParticipant[];
  onClose: () => void;
  onSave: (values: {
    title: string;
    priority: Priority;
    dueDate?: string | null;
    location: TaskLocation;
    assigneeId: string | null;
    watcherIds: string[];
  }) => void;
  onDelete?: () => void;
  onAddMember?: (input: { name: string; email?: string | null; sendInvite?: boolean }) => Promise<Profile>;
}) {
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (!open) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState<Priority>("medium");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [location, setLocation] = React.useState<TaskLocation>("inbox");
  const [assigneeId, setAssigneeId] = React.useState<string>(""); // empty == unassigned
  const [addMemberOpen, setAddMemberOpen] = React.useState(false);
  const [newMemberName, setNewMemberName] = React.useState("");
  const [newMemberEmail, setNewMemberEmail] = React.useState("");
  const [newMemberSendInvite, setNewMemberSendInvite] = React.useState(false);
  const [addingMember, setAddingMember] = React.useState(false);
  const [watcherPick, setWatcherPick] = React.useState("");
  const [watcherIds, setWatcherIds] = React.useState<string[]>([]);
  const initialRef = React.useRef<{
    title: string;
    priority: Priority;
    dueDate: string;
    location: TaskLocation;
    assigneeId: string;
    watcherIds: string[];
  } | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && task) {
      setTitle(task.title);
      setPriority(task.priority);
      setDueDate(task.dueDate ?? "");
      setLocation(task.location);
      setAssigneeId(task.assigneeId ?? "");
      const ids =
        (participants ?? [])
          .filter((p) => p.role === "watcher")
          .map((p) => p.profileId)
          .filter(Boolean) ?? [];
      setWatcherIds(ids);
      initialRef.current = {
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate ?? "",
        location: task.location,
        assigneeId: task.assigneeId ?? "",
        watcherIds: ids.slice().sort()
      };
      return;
    }

    // create defaults
    setTitle("");
    setPriority("medium");
    setDueDate("");
    setLocation("inbox");
    setAssigneeId("");
    setAddMemberOpen(false);
    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberSendInvite(false);
    setAddingMember(false);
    setWatcherPick("");
    setWatcherIds([]);
    initialRef.current = {
      title: "",
      priority: "medium",
      dueDate: "",
      location: "inbox",
      assigneeId: "",
      watcherIds: []
    };
  }, [open, mode, task, profiles]);

  const watcherIdSet = new Set(watcherIds);
  const watchers = watcherIds
    .map((id) => profiles.find((p) => p.id === id))
    .filter(Boolean) as Profile[];

  const isDirty = React.useMemo(() => {
    const initial = initialRef.current;
    if (!initial) return false;
    const now = {
      title: title.trim(),
      priority,
      dueDate: dueDate.trim(),
      location,
      assigneeId: assigneeId.trim(),
      watcherIds: watcherIds.slice().sort()
    };
    const baseline = {
      title: initial.title.trim(),
      priority: initial.priority,
      dueDate: initial.dueDate.trim(),
      location: initial.location,
      assigneeId: initial.assigneeId.trim(),
      watcherIds: initial.watcherIds.slice().sort()
    };
    if (now.title !== baseline.title) return true;
    if (now.priority !== baseline.priority) return true;
    if (now.dueDate !== baseline.dueDate) return true;
    if (now.location !== baseline.location) return true;
    if (now.assigneeId !== baseline.assigneeId) return true;
    if (now.watcherIds.length !== baseline.watcherIds.length) return true;
    for (let i = 0; i < now.watcherIds.length; i += 1) {
      if (now.watcherIds[i] !== baseline.watcherIds[i]) return true;
    }
    return false;
  }, [assigneeId, dueDate, location, priority, title, watcherIds]);

  if (!open) return null;

  const canSave =
    title.trim().length > 0 &&
    (location === "inbox" ? true : assigneeId.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-slate-900/25"
        aria-label="Close task drawer"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-[min(520px,calc(100vw-2rem))]">
        <div className="flex h-full flex-col border-l border-slate-200 bg-white shadow-card">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                {mode === "create" ? "New Task" : "Task Details"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {mode === "create"
                  ? "Create a task and assign it to a teammate."
                  : "Edit the task fields and save."}
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-5">
            <div className="space-y-4">
              <Field label="Title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>

              <Field label="Location">
                <Select value={location} onChange={(e) => setLocation(e.target.value as TaskLocation)}>
                  <option value="inbox">Inbox</option>
                  <option value="board">Board</option>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority">
                  <Select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </Select>
                </Field>

                <Field label="Due date">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Assignee">
                <Select
                  value={assigneeId}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__add__") {
                      setAddMemberOpen(true);
                      return;
                    }
                    setAssigneeId(v);
                  }}
                  disabled={location === "inbox" ? false : false}
                >
                  <option value="">Unassigned</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="__add__">Add…</option>
                </Select>

                {addMemberOpen ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-medium text-slate-700">Add team member</div>
                    <div className="mt-2 space-y-2">
                      <Input
                        placeholder="Name (e.g. Maggie)"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                      />
                      <Input
                        placeholder="Email (optional)"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                      />
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={newMemberSendInvite}
                          onChange={(e) => setNewMemberSendInvite(e.target.checked)}
                        />
                        Send invite now (requires email)
                      </label>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setAddMemberOpen(false);
                          setNewMemberName("");
                          setNewMemberEmail("");
                          setNewMemberSendInvite(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={
                          addingMember ||
                          !newMemberName.trim().length ||
                          (newMemberSendInvite && newMemberEmail.trim().length < 5) ||
                          !onAddMember
                        }
                        onClick={async () => {
                          if (!onAddMember) return;
                          try {
                            setAddingMember(true);
                            const profile = await onAddMember({
                              name: newMemberName.trim(),
                              email: newMemberEmail.trim().length ? newMemberEmail.trim() : null,
                              sendInvite: newMemberSendInvite
                            });
                            setAssigneeId(profile.id);
                            setAddMemberOpen(false);
                            setNewMemberName("");
                            setNewMemberEmail("");
                            setNewMemberSendInvite(false);
                          } catch (err) {
                            // eslint-disable-next-line no-console
                            console.error("[TaskDrawer] add member failed", err);
                          } finally {
                            setAddingMember(false);
                          }
                        }}
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Field>

              {mode === "edit" && task ? (
                <Field label="Watchers">
                  <div className="space-y-2">
                    {watchers.length ? (
                      <div className="flex flex-wrap gap-2">
                        {watchers.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700"
                          >
                            {p.name}
                            <button
                              className="text-slate-400 hover:text-slate-700"
                              aria-label={`Remove ${p.name} from watchers`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setWatcherIds((prev) => prev.filter((id) => id !== p.id));
                              }}
                              type="button"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No watchers yet.</div>
                    )}

                    <div className="flex items-center gap-2">
                      <Select
                        value={watcherPick}
                        onChange={(e) => {
                          const id = e.target.value;
                          setWatcherPick(id);
                          if (!id || id === "__none__") return;
                          if (watcherIdSet.has(id)) return;
                          setWatcherIds((prev) => [...prev, id]);
                          setWatcherPick("");
                        }}
                      >
                        <option value="">Add watcher…</option>
                        {profiles
                          .filter((p) => p.id !== (task.assigneeId ?? "") && !watcherIdSet.has(p.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </Select>
                      <span className="text-xs text-slate-500">Use (Name) in Quick Entry too.</span>
                    </div>
                  </div>
                </Field>
              ) : null}
            </div>
          </div>

          <div className="border-t border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {mode === "edit" && onDelete ? (
                  <Button variant="ghost" className="text-rose-700 hover:bg-rose-50" onClick={onDelete}>
                    Delete Task
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500">
                    Tip: press <kbd className="rounded border px-1">Esc</kbd> to close
                  </span>
                )}
                {isDirty ? (
                  <span className="text-xs font-medium text-amber-700">Unsaved changes</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  disabled={!canSave || !isDirty}
                  onClick={() =>
                    onSave({
                      title: title.trim(),
                      priority,
                      dueDate: dueDate.length ? dueDate : null,
                      location,
                      assigneeId: assigneeId.length ? assigneeId : null,
                      watcherIds
                    })
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      <div className={cn("w-full")}>{children}</div>
    </div>
  );
}



