"use client";

import { useState, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableSearchProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
}

export function ExpandableSearch({ value, onChange, placeholder = "Rechercher...", className }: ExpandableSearchProps) {
    const [expanded, setExpanded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleExpand = () => {
        setExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleBlur = () => {
        if (!value) setExpanded(false);
    };

    return (
        <div 
            className={cn(
                "relative flex items-center justify-end h-10 transition-all duration-300 ease-in-out", 
                expanded ? "w-48 sm:w-64" : "w-10", 
                className
            )}
            onMouseLeave={() => { if(!value && document.activeElement !== inputRef.current) setExpanded(false) }}
        >
            <div
                onClick={handleExpand}
                className={cn(
                    "absolute flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 z-10 cursor-pointer pointer-events-auto",
                    expanded 
                        ? "left-0 text-violet-400 bg-transparent hover:text-violet-300" 
                        : "right-0 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-white/5 shadow-lg"
                )}
            >
                <Search className={cn("transition-transform duration-300", expanded ? "w-4 h-4 scale-90" : "w-4 h-4")} />
            </div>

            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={cn(
                    "absolute inset-0 w-full h-full bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-full text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 shadow-inner transition-all duration-300",
                    expanded ? "opacity-100 pl-10 pr-10" : "opacity-0 pointer-events-none pl-4 pr-4"
                )}
            />
            {expanded && value && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange("");
                        inputRef.current?.focus();
                    }}
                    className="absolute right-3 flex items-center justify-center p-1 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-colors z-20 pointer-events-auto"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}
