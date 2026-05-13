"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export default function DarkSelect({ value, onChange, options, placeholder = "Seleziona...", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const safeOptions = options && options.length > 0 ? options : null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideBtn = btnRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideBtn && !insideMenu) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width });
      }
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const selected = safeOptions?.find((o) => o.value === value);

  return (
    <div className="relative overflow-visible">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 ${className} ${
          selected ? "text-white" : "text-gray-600"
        }`}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && coords && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 99999 }}
          className="bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 py-1 max-h-60 overflow-y-auto"
        >
          {safeOptions ? safeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                opt.value === value
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-gray-100 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          )) : (
            <div className="px-3.5 py-2.5 text-sm text-gray-400">Nessuna opzione</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
