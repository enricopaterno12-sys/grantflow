"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit2, Trash2, Pin, PinOff, Share2 } from "lucide-react";

interface Props {
  analysis: { id: string; name: string; is_pinned: boolean };
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onShare: (id: string) => void;
}

export default function AnalysisDropdown({ analysis, onRename, onDelete, onTogglePin, onShare }: Props) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(analysis.name);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setRenaming(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== analysis.name) {
      onRename(analysis.id, trimmed);
    }
    setRenaming(false);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-500 hover:text-gray-300"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 py-1 bg-[#1A1A1A] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 animate-fade-in">
          {renaming ? (
            <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") { setRenaming(false); setOpen(false); }
                }}
                onBlur={handleRenameSubmit}
                className="w-full px-2.5 py-1.5 text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                placeholder="Nuovo nome..."
              />
            </div>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                Rename
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePin(analysis.id, !analysis.is_pinned); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                {analysis.is_pinned ? (
                  <PinOff className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Pin className="w-3.5 h-3.5 text-gray-500" />
                )}
                {analysis.is_pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onShare(analysis.id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-gray-500" />
                Share
              </button>
              <div className="h-px bg-white/[0.06] my-1" />
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(analysis.id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
