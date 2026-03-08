import React from "react";
import { ListTodo } from "lucide-react";
import { useDrag } from "react-dnd";

import type { Task } from "../../../domain/types";
import type { DisplayPrefs } from "../../state/displayPrefs";
import { cn } from "../../lib/cn";
import { Badge } from "../../components/Badge";

export function IndexPanel({
    tasks,
    display,
    filter,
    onOpenTask,
}: {
    tasks: Task[];
    display: DisplayPrefs;
    filter: "alpha" | "recent" | "unlisted";
    onOpenTask: (taskId: string) => void;
}) {
    const visibleTasks = React.useMemo(() => {
        let list = [...tasks];
        if (filter === "unlisted") {
            list = list.filter((t) => !t.groupId && t.location !== "inbox");
        }

        list.sort((a, b) => {
            if (filter === "alpha") {
                return a.title.localeCompare(b.title);
            }
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        return list;
    }, [tasks, filter]);

    return (
        <div className="p-4 min-h-full">
            <div className="flex items-center gap-2">
                <ListTodo size={24} className="text-muted-foreground mr-1" />
                <div className="flex items-baseline gap-3">
                    <div className="text-2xl font-semibold text-foreground">Global Index</div>
                    <div className="text-xs text-muted font-normal ml-1">
                        {visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}
                    </div>
                </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-card p-3">
                {visibleTasks.length ? (
                    <div className="space-y-[2px]">
                        {visibleTasks.map((t) => (
                            <IndexTaskCard key={t.id} task={t} display={display} onOpen={() => onOpenTask(t.id)} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center">
                        <div className="text-sm font-medium text-foreground">No tasks found</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            {filter === "unlisted"
                                ? "No unlisted tasks in the database."
                                : "No tasks to display."}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function IndexTaskCard({
    task,
    display,
    onOpen
}: {
    task: Task;
    display: DisplayPrefs;
    onOpen: () => void;
}) {
    const due = task.dueDate ?? null;

    const [{ isDragging }, dragRef] = useDrag({
        type: "TASK",
        item: () => ({ taskId: task.id, fromListId: null }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    return (
        <button
            ref={dragRef as any}
            className={cn(
                "w-full rounded-xl bg-transparent py-1.5 px-3 text-left hover:bg-accent/50 transition-colors",
                isDragging && "opacity-50 ring-2 ring-primary border-dashed"
            )}
            onClick={onOpen}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-light text-foreground-muted line-clamp-2">{task.title}</div>
                {display.showPriority ? (
                    <Badge variant={task.priority} className="shrink-0">
                        {task.priority === "critical"
                            ? "Critical"
                            : task.priority[0]!.toUpperCase() + task.priority.slice(1)}
                    </Badge>
                ) : null}
            </div>

            {display.showDueDate && due ? (
                <div className={cn("mt-3")}>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
                        📅 {due}
                    </span>
                </div>
            ) : null}
        </button>
    );
}
