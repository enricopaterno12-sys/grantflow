"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import HistoryItem from "./HistoryItem";
import type { Analysis } from "@/types";

interface Props {
  activeId?: string | null;
  onNewAnalysis: () => void;
  onSelectAnalysis: (id: string) => void;
}

export default function Sidebar({ activeId, onNewAnalysis, onSelectAnalysis }: Props) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setAnalyses(data);
    })();
  }, []);

  const deleteAnalysis = async (id: string) => {
    await supabase.from("analyses").delete().eq("id", id);
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <aside className="w-72 bg-gray-900 text-white flex flex-col h-screen flex-shrink-0">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold tracking-tight">🎯 GrantFlow AI</h1>
      </div>

      <div className="p-3">
        <button
          onClick={onNewAnalysis}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuova Analisi
        </button>
      </div>

      <div className="px-3 pb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cronologia</p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {analyses.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-500">Nessuna analisi salvata.</p>
        ) : (
          analyses.map((a) => (
            <div
              key={a.id}
              className={`border-l-2 ${activeId === a.id ? "border-blue-500 bg-gray-800" : "border-transparent"}`}
            >
              <HistoryItem
                nomeAzienda={a.nome_azienda}
                esito={a.esito_analisi}
                probabilita={a.probabilita}
                onSelect={() => onSelectAnalysis(a.id)}
                onDelete={() => deleteAnalysis(a.id)}
              />
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
