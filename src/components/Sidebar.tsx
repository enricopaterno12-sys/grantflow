"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pin, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnalysisDropdown from "./AnalysisDropdown";
import type { Analysis } from "@/types";

interface Props {
  activeId?: string | null;
  onNewAnalysis: () => void;
  analyses: Analysis[];
  onAnalysesChange: (analyses: Analysis[]) => void;
  refreshKey?: number;
  onSelectAnalysis?: (id: string) => void;
}

function getMeta(a: Analysis) {
  const d = a.data as any;
  return {
    ragioneSociale: d?.companyData?.ragione_sociale || a.name || "Analisi senza nome",
    nomeBando: d?.bandoInfo?.nome || "",
    stato: d?.verifyResult?.eligibility_checks?.overall || "N/D",
    probabilita: d?.verifyResult?.eligibility_checks?.probabilita,
  };
}

function StatusDot({ stato }: { stato: string }) {
  const m: Record<string, string> = {
    VERDE: "bg-emerald-500 shadow-[0_0_4px_#00c896]",
    GIALLO: "bg-yellow-500 shadow-[0_0_4px_#ffa502]",
    ROSSO: "bg-red-500 shadow-[0_0_4px_#ff4757]",
    "N/D": "bg-gray-500",
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m[stato] || m["N/D"]}`} />;
}

export default function Sidebar({ activeId, onNewAnalysis, analyses, onAnalysesChange, refreshKey, onSelectAnalysis }: Props) {
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("analyses").select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) { console.error("Supabase fetch error:", error.message); return; }
      if (data) onAnalysesChange(data as Analysis[]);
    })();
  }, [onAnalysesChange, refreshKey]);

  const handleRename = useCallback(async (id: string, newName: string) => {
    onAnalysesChange(analyses.map((a) => (a.id === id ? { ...a, name: newName } : a)));
    await supabase.from("analyses").update({ name: newName }).eq("id", id);
  }, [analyses, onAnalysesChange]);

  const handleDelete = useCallback(async (id: string) => {
    onAnalysesChange(analyses.filter((a) => a.id !== id));
    await supabase.from("analyses").delete().eq("id", id);
  }, [analyses, onAnalysesChange]);

  const handleTogglePin = useCallback(async (id: string, pinned: boolean) => {
    onAnalysesChange(
      analyses.map((a) => (a.id === id ? { ...a, is_pinned: pinned } : a))
        .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
    );
    await supabase.from("analyses").update({ is_pinned: pinned }).eq("id", id);
  }, [analyses, onAnalysesChange]);

  const handleShare = useCallback(async (id: string) => {
    const url = `${window.location.origin}?analysis=${id}`;
    try { await navigator.clipboard.writeText(url); } catch {
      const input = document.createElement("input");
      input.value = url; document.body.appendChild(input);
      input.select(); document.execCommand("copy");
      document.body.removeChild(input);
    }
  }, []);

  return (
    <aside className="w-72 bg-[#121212] text-white flex flex-col h-screen flex-shrink-0 border-r border-white/[0.04]">
      <div className="p-5 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <span className="text-white text-sm font-bold tracking-tight">GF</span>
          </div>
          <h1 className="text-base font-semibold tracking-tight text-white">GrantFlow</h1>
        </div>
      </div>

      <div className="p-4">
        <button onClick={onNewAnalysis}
          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-900/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Nuova Analisi
        </button>
      </div>

      <div className="px-[18px] pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500/80">Cronologia</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {analyses.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3"><FileText className="w-5 h-5 text-gray-600" /></div>
            <p className="text-sm text-gray-500">Nessuna analisi salvata</p>
          </div>
        ) : analyses.map((a) => {
          const meta = getMeta(a);
          return (
            <div
              key={a.id}
              onClick={() => onSelectAnalysis?.(a.id)}
              className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                activeId === a.id ? "bg-white/[0.06] border border-white/[0.06]" : "hover:bg-white/[0.03] border border-transparent"
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center relative mt-0.5">
                  <StatusDot stato={meta.stato} />
                  {a.is_pinned && <span className="absolute -top-1 -right-1"><Pin className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500" /></span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">{meta.ragioneSociale}</p>
                  {meta.nomeBando && <p className="text-[11px] text-gray-500 truncate">{meta.nomeBando.slice(0, 25)}</p>}
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {new Date(a.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                    <span className="mx-1">·</span>
                    <span className={
                      meta.stato === "VERDE" ? "text-emerald-500/70" : meta.stato === "ROSSO" ? "text-red-400/70" : "text-yellow-500/70"
                    }>{meta.stato}{meta.probabilita != null ? ` ${meta.probabilita}%` : ""}</span>
                  </p>
                </div>
              </div>
              <AnalysisDropdown
                analysis={{ id: a.id, name: a.name, is_pinned: a.is_pinned }}
                onRename={handleRename} onDelete={handleDelete}
                onTogglePin={handleTogglePin} onShare={handleShare}
              />
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
