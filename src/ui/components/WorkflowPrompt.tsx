import React, { useRef, useEffect } from "react";
import { ArrowLeft, FileText, CheckSquare, Plus, ChevronDown, Mic, Square, Sparkles } from "lucide-react";

export function WorkflowPrompt() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInput = () => {
        if (textareaRef.current) {
            // Reset height to auto to shrink if text was deleted
            textareaRef.current.style.height = "auto";
            // Set height to match the new scrollHeight
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    useEffect(() => {
        handleInput();
    }, []);

    return (
        <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
                <div className="flex items-center gap-4">
                    <button className="hover:text-foreground transition-colors" aria-label="Back">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                        <FileText size={14} />
                        <span>0 Files With Changes</span>
                    </div>
                </div>
                <button className="flex items-center gap-1.5 bg-accent/50 hover:bg-accent px-2 py-1 rounded-md transition-colors text-foreground-muted hover:text-foreground">
                    <CheckSquare size={14} />
                    <span>Review Changes</span>
                </button>
            </div>

            <div className="rounded-xl bg-[#1e1e1e] border border-border/40 p-3 shadow-sm focus-within:ring-1 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all">
                <textarea
                    ref={textareaRef}
                    onInput={handleInput}
                    className="w-full bg-transparent resize-none text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-0 mb-2 overflow-hidden leading-relaxed"
                    rows={1}
                    placeholder="Ask anything, @ to mention, / for workflows"
                    style={{ minHeight: "24px" }}
                />
                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                        <button className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-white/5">
                            <Plus size={16} />
                        </button>
                        <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-white/5 px-2 py-1">
                            <span>Planning</span>
                            <ChevronDown size={14} />
                        </button>
                        <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-white/5 px-2 py-1">
                            <Sparkles size={14} className="text-blue-400" />
                            <span>Gemini 3.1 Pro (High)</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-white/5 flex items-center justify-center">
                            <Mic size={16} />
                        </button>
                        <button className="p-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg flex items-center justify-center">
                            <Square size={14} className="text-red-400 fill-red-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
