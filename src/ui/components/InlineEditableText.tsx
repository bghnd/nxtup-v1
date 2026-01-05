import React from "react";
import { cn } from "../lib/cn";

export function InlineEditableText({
  value,
  placeholder,
  className,
  inputClassName,
  disabled,
  ariaLabel,
  multiline,
  allowEmpty,
  truncate = true,
  onConfirm
}: {
  value: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
  multiline?: boolean;
  allowEmpty?: boolean;
  truncate?: boolean;
  onConfirm: (next: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  React.useEffect(() => {
    if (!editing) return;
    const t = window.setTimeout(() => {
      if (multiline) textareaRef.current?.focus();
      else inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [editing, multiline]);

  async function commit() {
    const next = draft.trim();
    if (!next.length && !allowEmpty) {
      setEditing(false);
      setDraft(value);
      return;
    }
    if (next === value.trim()) {
      setEditing(false);
      return;
    }
    try {
      setBusy(true);
      await onConfirm(next);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          className={cn(
            "w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20",
            inputClassName
          )}
          value={draft}
          disabled={busy}
          placeholder={placeholder}
          aria-label={ariaLabel ?? "Edit text"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
              setDraft(value);
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void commit();
            }
          }}
          onBlur={() => {
            if (allowEmpty || draft.trim().length > 0) void commit();
            else {
              setEditing(false);
              setDraft(value);
            }
          }}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        className={cn(
          "h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20",
          inputClassName
        )}
        value={draft}
        disabled={busy}
        placeholder={placeholder}
        aria-label={ariaLabel ?? "Edit text"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
            setDraft(value);
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
        }}
        onBlur={() => {
          setEditing(false);
          setDraft(value);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        truncate ? "min-w-0 truncate text-left" : "min-w-0 text-left",
        className,
        disabled && "opacity-60 cursor-not-allowed"
      )}
      aria-label={ariaLabel ?? "Edit text"}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setEditing(true);
      }}
      title={value}
    >
      {value || placeholder || ""}
    </button>
  );
}