import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { motion } from "framer-motion";
import { Task } from "../../domain/types";
import { DisplayPrefs } from "../state/displayPrefs";
import { Badge } from "./Badge";
import { cn } from "../lib/cn";

const DND_MIME = "application/x-nxtup-task";

function formatDueDate(date?: string) {
    if (!date) return null;
    return date;
}

function priorityVariant(p: Task["priority"]): "low" | "medium" | "high" | "critical" {
    return p;
}

function StatPill({
    children,
    className
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground",
                className
            )}
        >
            {children}
        </span>
    );
}

export function DraggableTask({
    task,
    fromListId,
    onClick,
    display
}: {
    task: Task;
    fromListId: string | null;
    onClick: () => void;
    display: DisplayPrefs;
}) {
    const due = formatDueDate(task.dueDate);

    const [{ isDragging }, dragRef] = useDrag({
        type: "TASK",
        item: () => {
            const payload = { taskId: task.id, fromListId };
            return {
                id: task.id,
                [DND_MIME]: JSON.stringify(payload),
                "text/plain": task.id,
                ...payload // Also spread for react-dnd consumers
            };
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    return (
        <motion.button
            ref={dragRef}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "w-full text-left rounded-xl bg-transparent py-1.5 px-3 hover:bg-accent/50 transition-colors relative overflow-hidden",
                isDragging && "opacity-50 ring-2 ring-primary border-dashed"
            )}
            onClick={onClick}
            onDragStart={(e: any) => e.stopPropagation()}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-light text-foreground-muted line-clamp-2">{task.title}</div>
                {display.showPriority ? (
                    <Badge variant={priorityVariant(task.priority)} className="shrink-0">
                        {task.priority === "critical"
                            ? "Critical"
                            : task.priority[0]!.toUpperCase() + task.priority.slice(1)}
                    </Badge>
                ) : null}
            </div>

            {display.showDueDate || display.showChecklist || display.showComments ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {display.showDueDate && due ? <StatPill>📅 {due}</StatPill> : null}
                    {display.showChecklist ? (
                        <StatPill>
                            ☑️ {task.checklist.done}/{task.checklist.total}
                        </StatPill>
                    ) : null}
                    {display.showComments ? <StatPill>💬 {task.commentsCount}</StatPill> : null}
                </div>
            ) : null}

            {/* Floating tooltip/sidebar area can be constructed later or inline */}
        </motion.button>
    );
}
