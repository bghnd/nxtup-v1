import React, { useState } from "react";
import { useDrop, useDrag } from "react-dnd";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardProps } from "./Card";
import { cn } from "../lib/cn";
import { Task } from "../../domain/types";

const DND_MIME = "application/x-nxtup-task";

export function DroppableListCard({
    listId,
    listGroupId,
    isDraggable,
    onTaskDrop,
    className,
    children,
    flat,
    ...props
}: CardProps & {
    listId: string;
    listGroupId?: string | null;
    isDraggable?: boolean;
    onTaskDrop: (taskId: string, fromListId: string | null) => void;
}) {
    const [{ isOver }, dropRef] = useDrop({
        accept: "TASK",
        drop: (item: { taskId: string; fromListId: string | null }, monitor) => {
            // Don't handle drop if an older drop target already handled it
            if (monitor.didDrop()) return;
            onTaskDrop(item.taskId, item.fromListId);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true })
        })
    });

    const [{ isDragging }, dragRef] = useDrag({
        type: "LIST",
        item: () => ({ listId, listGroupId }),
        canDrag: () => !!isDraggable,
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    // Combine refs to support both behaviors on the root element
    const combineRefs = (el: HTMLDivElement | null) => {
        dropRef(el);
        if (isDraggable) {
            dragRef(el);
        }
    };

    return (
        <Card
            ref={combineRefs as any}
            flat={flat}
            className={cn(className, isOver && "ring-2 ring-primary bg-primary-50/50 transition-colors", isDragging && "opacity-50 border-primary border-dashed")}
            {...props}
        >
            {children}
        </Card>
    );
}

export function DoneSection({
    tasks,
    renderTask
}: {
    tasks: Task[];
    renderTask: (task: Task) => React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);

    if (tasks.length === 0) return null;

    return (
        <div className="mt-4 pt-4 border-t border-border">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground-muted transition-colors"
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Done ({tasks.length})
            </button>

            {isOpen && (
                <div className="mt-3 space-y-[2px] opacity-75">
                    {tasks.map(renderTask)}
                </div>
            )}
        </div>
    );
}
