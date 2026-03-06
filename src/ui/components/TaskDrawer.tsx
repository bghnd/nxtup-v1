import React from "react";
import type { Priority, Profile, Task, TaskLocation, TaskList, TaskGroup } from "../../domain/types";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Input } from "./Input";
import { Select } from "./Select";
import { Plus } from "lucide-react";

export type TaskDrawerMode = "create" | "edit";

export function TaskDrawer({
  open,
  mode,
  task,
  profiles,
  currentUserId,
  lists = [],
  groups = [],
  createTargetListId = null,
  createTargetUnlistedGroupId = undefined,
  onClose,
  onSave,
  onDelete
}: {
  open: boolean;
  mode: TaskDrawerMode;
  task?: Task | null;
  profiles: Profile[];
  currentUserId: string;
  lists?: TaskList[];
  groups?: TaskGroup[];
  createTargetListId?: string | null;
  createTargetUnlistedGroupId?: string | null | undefined;
  onClose: () => void;
  onSave: (values: {
    title: string;
    priority: Priority;
    dueDate?: string | null;
    location: TaskLocation;
    assigneeId: string | null;
    listId?: string | null;
    newListName?: string | null;
  }) => void;
  onDelete?: () => void;
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

  // Location combobox state
  const [locationSearch, setLocationSearch] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = React.useState(false);
  const [selectedListId, setSelectedListId] = React.useState<string | null>(null);
  const [newListName, setNewListName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && task) {
      setTitle(task.title);
      setPriority(task.priority);
      setDueDate(task.dueDate ?? "");
      setLocation(task.location);
      setAssigneeId(task.assigneeId ?? "");
      setLocationSearch(task.location === "inbox" ? "Inbox" : "Board");
      setSelectedListId(null);
      setNewListName(null);
      return;
    }

    // create defaults
    setTitle("");
    setPriority("medium");
    setDueDate("");

    const targetList = createTargetListId && lists ? lists.find(l => l.id === createTargetListId) : null;
    const isUnlisted = createTargetUnlistedGroupId !== undefined;
    let unlistedLabel = "Board";
    if (isUnlisted) {
      if (createTargetUnlistedGroupId === null) {
        unlistedLabel = "workspace: Ungrouped";
      } else {
        const group = groups?.find(g => g.id === createTargetUnlistedGroupId);
        unlistedLabel = group ? `${group.title}: Unlisted` : "Group: Unlisted";
      }
    }

    setLocation(isUnlisted ? "board" : (targetList ? (targetList.type === "inbox" ? "inbox" : "board") : "inbox"));
    setAssigneeId(currentUserId);
    setLocationSearch(isUnlisted ? unlistedLabel : (targetList ? targetList.title : "Inbox"));
    setSelectedListId(isUnlisted ? null : (createTargetListId || null));
    setNewListName(null);
    setIsFocused(false);
  }, [open, mode, task, profiles, currentUserId, createTargetListId, lists]);

  const displayLocation = React.useMemo(() => {
    if (isFocused) return locationSearch;
    if (location === "inbox") return "Inbox";
    if (selectedListId) return lists?.find(l => l.id === selectedListId)?.title ?? "Board";
    if (newListName) return newListName;

    // Fallback UI display for unlisted locations when no list is selected
    const isUnlisted = createTargetUnlistedGroupId !== undefined;
    if (isUnlisted && location === "board") {
      if (createTargetUnlistedGroupId === null) {
        return "workspace: Ungrouped";
      } else {
        const group = groups?.find(g => g.id === createTargetUnlistedGroupId);
        return group ? `${group.title}: Unlisted` : "Group: Unlisted";
      }
    }

    return "Board";
  }, [isFocused, locationSearch, location, selectedListId, newListName, lists, createTargetUnlistedGroupId, groups]);

  if (!open) return null;

  const canSave = title.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-foreground/25"
        aria-label="Close task drawer"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-[min(520px,calc(100vw-2rem))]">
        <div className="flex h-full flex-col border-l border-border bg-card shadow-card">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <div className="text-lg font-semibold text-foreground">
                {mode === "create" ? "New Task" : "Task Details"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
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

              <Field label="List">
                <div className="relative">
                  <Input
                    value={displayLocation}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      setLocationMenuOpen(true);
                      setSelectedListId(null);
                      setNewListName(null);
                      setLocation("board");
                    }}
                    onFocus={() => {
                      setIsFocused(true);
                      setLocationSearch("");
                      setLocationMenuOpen(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setIsFocused(false);
                        setLocationMenuOpen(false);
                      }, 200);
                    }}
                    placeholder="Type to search or create a list..."
                  />
                  {locationMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg z-10">
                      <div
                        className="cursor-pointer rounded-md px-3 py-2 text-sm text-foreground-muted hover:bg-accent-hover"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setLocation("inbox");
                          setLocationSearch("Inbox");
                          setSelectedListId(null);
                          setNewListName(null);
                          setLocationMenuOpen(false);
                        }}
                      >
                        Inbox
                      </div>
                      {lists
                        .filter((l) => l.title.toLowerCase().includes(locationSearch.toLowerCase()))
                        .map((list) => {
                          const group = groups?.find(g => g.id === list.groupId);
                          const groupName = group ? group.title : "Ungrouped";
                          return (
                            <div
                              key={list.id}
                              className="cursor-pointer rounded-md px-3 py-2 text-sm text-foreground-muted hover:bg-accent-hover flex items-center justify-between"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                setLocation("board");
                                setLocationSearch(list.title);
                                setSelectedListId(list.id);
                                setNewListName(null);
                                setLocationMenuOpen(false);
                              }}
                            >
                              <span>{list.title}</span>
                              <span className="text-xs text-muted max-w-[50%] truncate">{groupName}</span>
                            </div>
                          )
                        })}
                      {locationSearch.trim().length > 0 &&
                        !lists.some(
                          (l) => l.title.toLowerCase() === locationSearch.trim().toLowerCase()
                        ) &&
                        locationSearch.trim().toLowerCase() !== "inbox" && (
                          <div
                            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              setLocation("board");
                              setNewListName(locationSearch.trim());
                              setSelectedListId(null);
                              setLocationMenuOpen(false);
                            }}
                          >
                            <Plus size={14} /> Create list "{locationSearch.trim()}"
                          </div>
                        )}
                    </div>
                  )}
                </div>
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
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={location === "inbox" ? false : false}
                >
                  <option value="">Unassigned</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div className="border-t border-border p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                {mode === "edit" && onDelete ? (
                  <Button variant="ghost" className="text-rose-700 hover:bg-rose-50" onClick={onDelete}>
                    Delete
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Tip: press <kbd className="rounded border px-1">Esc</kbd> to close
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  disabled={!canSave}
                  onClick={() => {
                    onSave({
                      title: title.trim(),
                      priority,
                      dueDate: dueDate.length ? dueDate : null,
                      location: locationSearch.trim().toLowerCase() === "inbox" ? "inbox" : location,
                      assigneeId: assigneeId.length ? assigneeId : null,
                      listId: selectedListId,
                      newListName: newListName
                    });
                  }}
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
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn("w-full")}>{children}</div>
    </label>
  );
}



