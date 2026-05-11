"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const TAGS = ["Prioritario", "In lavorazione", "Archiviato", "Da presentare"];

interface Props {
  defaultName: string;
  ragioneSociale?: string;
  nomeBando?: string;
  onSave: (name: string, tag?: string) => void;
  onDiscard: () => void;
}

export default function SaveModal({ defaultName, ragioneSociale, nomeBando, onSave, onDiscard }: Props) {
  const previewName = ragioneSociale
    ? `${ragioneSociale} — ${(nomeBando || "").slice(0, 25)} — ${new Date().toLocaleDateString("it-IT")}`
    : defaultName;

  const [name, setName] = useState(previewName);
  const [tag, setTag] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, []);

  const handleSave = () => { const t = name.trim(); if (t) onSave(t, tag || undefined); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 bg-[#1A1A1A] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h3 className="text-lg font-semibold text-white">Salva analisi</h3>
          <button onClick={onDiscard} className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-400">Vuoi salvare questa analisi nello storico?</p>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome Analisi</label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onDiscard(); }}
              placeholder="Analisi [Azienda] - [Data]"
              className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all duration-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Tag (opzionale)</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(tag === t ? "" : t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    tag === t
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:border-white/[0.12]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
          <button onClick={onDiscard} className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all">No, scarta</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-emerald-900/20"
          >
            Sì, Salva
          </button>
        </div>
      </div>
    </div>
  );
}
