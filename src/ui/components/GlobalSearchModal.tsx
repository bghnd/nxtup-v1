import React from "react";
import { Command } from "cmdk";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useDrag } from "react-dnd";
import { listTasks, listProfiles } from "../../data/client";
import { cn } from "../lib/cn";
import { Modal } from "./Modal";

const DND_MIME = "application/x-nxtup-task";

function SearchResultItem({ task, onClick }: { task: any; onClick: () => void }) {
    const [{ isDragging }, dragRef] = useDrag({
        type: "TASK",
        item: () => {
            const payload = { taskId: task.id };
            return {
                id: task.id,
                // The HTML5 backend will use this data for drops
                [DND_MIME]: JSON.stringify(payload),
                "text/plain": task.id
            };
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    return (
        <div
            ref={dragRef}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === "Enter") onClick();
            }}
            className={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-foreground-muted hover:bg-accent-hover",
                isDragging && "opacity-50"
            )}
        >
            <span className="truncate">{task.title}</span>
            <span className="ml-2 flex-shrink-0 text-xs text-muted capitalize">
                {task.location}
            </span>
        </div>
    );
}

export function GlobalSearchModal() {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const { workspaceId = "demo" } = useParams();
    const nav = useNavigate();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const tasksQ = useQuery({
        queryKey: ["tasks", workspaceId],
        queryFn: () => listTasks(workspaceId),
        enabled: open
    });

    const allTasks = tasksQ.data ?? [];

    const filteredTasks = React.useMemo(() => {
        if (!search.trim()) return [];
        const lower = search.toLowerCase();
        return allTasks
            .filter((t) => t.title.toLowerCase().includes(lower) || t.tags.some(tag => tag.toLowerCase().includes(lower)))
            .slice(0, 15); // Limit results for performance
    }, [allTasks, search]);

    return (
        <Modal open={open} title="Search Tasks" onClose={() => setOpen(false)}>
            <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-slate-900/5">
                <Command
                    shouldFilter={false} // We filter ourselves
                    className="flex h-full w-full flex-col overflow-hidden"
                >
                    <div className="flex items-center border-b border-border px-4">
                        <Command.Input
                            autoFocus
                            value={search}
                            onValueChange={setSearch}
                            className="flex h-12 w-full min-w-0 bg-transparent text-sm text-foreground placeholder-slate-400 outline-none"
                            placeholder="Search tasks anywhere... (Drag results to board)"
                        />
                    </div>

                    <Command.List className="max-h-[300px] overflow-y-auto p-2">
                        {!filteredTasks.length && search.length > 0 && (
                            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                                No results found.
                            </Command.Empty>
                        )}

                        {filteredTasks.length > 0 && (
                            <Command.Group heading="Tasks" className="text-xs font-medium text-muted-foreground">
                                {filteredTasks.map((task) => (
                                    <Command.Item
                                        key={task.id}
                                        value={task.title}
                                        onSelect={() => {
                                            setOpen(false);
                                            // Use the route structure we found in BoardPage.tsx
                                            nav(`/w/${workspaceId}/board?task=${encodeURIComponent(task.id)}`);
                                        }}
                                        className="mt-1 aria-selected:bg-slate-100 aria-selected:text-slate-900"
                                    >
                                        <SearchResultItem
                                            task={task}
                                            onClick={() => {
                                                setOpen(false);
                                                nav(`/w/${workspaceId}/board?task=${encodeURIComponent(task.id)}`);
                                            }}
                                        />
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {!search.trim() && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Type to search for tasks...
                            </div>
                        )}
                    </Command.List>
                </Command>
            </div>
        </Modal>
    );
}
