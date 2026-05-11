"use client";

import { useState } from "react";
import type { ChecklistItem } from "@/types";

interface Props {
  items: ChecklistItem[];
  onChange?: (items: ChecklistItem[]) => void;
}

export default function DocumentChecklist({ items: initialItems, onChange }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);

  const toggle = (id: string) => {
    const next = items.map((item) =>
      item.id === id ? { ...item, completato: !item.completato } : item,
    );
    setItems(next);
    onChange?.(next);
  };

  const completati = items.filter((i) => i.completato).length;
  const totali = items.length;
  const progresso = totali > 0 ? Math.round((completati / totali) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Documenti Necessari</h3>
        <span className="text-xs text-gray-500">
          {completati}/{totali} completati
        </span>
      </div>

      <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${progresso}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
              item.completato
                ? "bg-emerald-900/10 border border-emerald-500/10"
                : "glass-hover border border-transparent"
            }`}
          >
            <div
              className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                item.completato
                  ? "bg-emerald-600 border-emerald-600"
                  : "border-white/20 hover:border-emerald-500/50"
              }`}
            >
              {item.completato && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm transition-colors ${item.completato ? "text-gray-500 line-through" : "text-gray-200"}`}>
                {item.nome}
              </p>
              {!item.completato && item.deadline && (
                <p className="text-xs text-gray-600 mt-0.5">Scadenza: {item.deadline}</p>
              )}
            </div>
            {item.obbligatorio && !item.completato && (
              <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                Obbligatorio
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
