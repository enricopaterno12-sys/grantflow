"use client";

import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import type { VerifyResponse, CompanyData, DeepScanResult, AnalisiTecnicaItem, ChecklistPraticaItem } from "@/types";

type ResultTab = "overview" | "analysis" | "custom" | "data" | "checklist";

interface Props {
  response: VerifyResponse;
  azienda: CompanyData;
  deepScan?: DeepScanResult;
}

function RatingBadge({ rating, size = "lg" }: { rating: string; size?: "sm" | "lg" }) {
  const colors: Record<string, string> = {
    VERDE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    GIALLO: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    ROSSO: "bg-red-500/15 text-red-400 border-red-500/25",
    GRIGIO: "bg-gray-500/15 text-gray-400 border-gray-500/25",
  };
  const labels: Record<string, string> = {
    VERDE: "Ammissibile",
    GIALLO: "Ammissibile con riserva",
    ROSSO: "Non ammissibile",
    GRIGIO: "Dati insufficienti",
  };
  return (
    <div className={`inline-flex items-center gap-2.5 font-semibold rounded-xl border ${colors[rating] || colors.GRIGIO} ${size === "lg" ? "px-5 py-3 text-lg" : "px-3 py-1.5 text-sm"}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${rating === "VERDE" ? "bg-emerald-500" : rating === "GIALLO" ? "bg-yellow-500" : rating === "ROSSO" ? "bg-red-500" : "bg-gray-500"}`} />
      {labels[rating] || rating}
    </div>
  );
}

export default function ResultsView({ response, azienda, deepScan }: Props) {
  const { calcolo_finanziario: calcolo, analisi_concisa: analisi, business_plan_data: bpData, custom_prompt } = response;

  const esito = analisi?.esito;
  const rating = esito?.rating || "N/D";
  const probabilita = esito?.probabilita;
  const analisiTecnica: AnalisiTecnicaItem[] = (analisi?.analisi_tecnica || []) as AnalisiTecnicaItem[];
  const analisiCustom = analisi?.analisi_custom;
  const rawChecklist = (analisi?.checklist_pratica || []) as ChecklistPraticaItem[];
  const scudo = esito?.scudo_anti_errore || "";

  const [tab, setTab] = useState<ResultTab>("overview");
  const [checklist, setChecklist] = useState<ChecklistPraticaItem[]>(() =>
    rawChecklist.length > 0
      ? rawChecklist.map((c) => ({ ...c, completato: false }))
      : [
          { nome: "DURC (Documento Unico di Regolarità Contributiva)", obbligatorio: true, completato: false },
          { nome: "Certificazione Antimafia", obbligatorio: true, completato: false },
          { nome: "Preventivi di spesa (almeno 3 per ogni voce)", obbligatorio: true, completato: false },
          { nome: "Visura camerale aggiornata", obbligatorio: true, completato: false },
          { nome: "Atto costitutivo e statuto", obbligatorio: true, completato: false },
        ],
  );

  useEffect(() => {
    if (rawChecklist.length > 0) {
      setChecklist(rawChecklist.map((c) => ({ ...c, completato: false })));
    }
  }, [rawChecklist]);

  const tabs: { key: ResultTab; label: string }[] = [
    { key: "overview", label: "Overview & Esito" },
    { key: "analysis", label: "Analisi Tecnica e Spese" },
    ...(custom_prompt ? [{ key: "custom" as const, label: "Analisi Custom" }] : []),
    { key: "data", label: "Dati Core" },
    { key: "checklist", label: "Checklist Pratica" },
  ];

  const toggleChecklist = (index: number) => {
    setChecklist((prev) => prev.map((c, i) => (i === index ? { ...c, completato: !c.completato } : c)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Risultati Analisi</h2>
          <StatusBadge stato={rating} probabilita={probabilita ?? null} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/[0.06]">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${tab === t.key ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}
            >
              {t.label}
              {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: Overview & Esito ── */}
      {tab === "overview" && (
        <div className="space-y-5 animate-fade-in">
          {/* Rating badge + probabilita */}
          <div className="flex items-center gap-6 flex-wrap">
            <RatingBadge rating={rating} size="lg" />
            {probabilita != null && (
              <div className="text-center">
                <p className={`text-3xl font-bold ${probabilita >= 75 ? "text-emerald-400" : probabilita >= 40 ? "text-yellow-400" : probabilita > 0 ? "text-red-400" : "text-gray-400"}`}>{probabilita}%</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.1em] mt-0.5">Probabilità</p>
              </div>
            )}
          </div>

          {/* Dati Chiave Concessione */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Dati Chiave Concessione</h3>
            <div className="overflow-hidden rounded-xl border border-white/[0.04]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Parametro</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Valore</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-white/[0.04]">
                    <td className="px-4 py-2.5 text-gray-300">Contributo Massimo Concedibile</td>
                    <td className="px-4 py-2.5 text-right text-white font-medium">€{(esito?.contributo_massimo_concedibile ?? calcolo?.contributo ?? 0).toLocaleString()}</td>
                  </tr>
                  <tr className="border-t border-white/[0.04] bg-white/[0.01]">
                    <td className="px-4 py-2.5 text-gray-300">Intensità d'aiuto</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">{esito?.intensita_aiuto ?? calcolo?.aliquota_contributo ?? 0}%</td>
                  </tr>
                  <tr className="border-t border-white/[0.04]">
                    <td className="px-4 py-2.5 text-gray-300">Regime di aiuti</td>
                    <td className="px-4 py-2.5 text-right text-white font-medium">{esito?.regime_aiuti || "N/D"}</td>
                  </tr>
                  <tr className="border-t border-white/[0.04] bg-white/[0.01]">
                    <td className="px-4 py-2.5 text-gray-300">Investimento</td>
                    <td className="px-4 py-2.5 text-right text-white font-medium">€{(calcolo?.investimento_effettivo ?? azienda.investimento ?? 0).toLocaleString()}</td>
                  </tr>
                  <tr className="border-t border-white/[0.04]">
                    <td className="px-4 py-2.5 text-gray-300">Finanziamento Agevolato</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">€{(calcolo?.finanziamento ?? 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Scudo Anti-Errore */}
          {scudo && (
            <div className="glass rounded-2xl p-5 border border-yellow-500/10">
              <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-[0.1em] mb-3">Scudo Anti-Errore</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{scudo}</p>
            </div>
          )}

          {/* Riga KPI finanziari supplementari */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="glass rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">DSCR</p>
              <p className={`text-sm font-bold mt-0.5 ${bpData?.dscr != null && bpData.dscr >= 1.3 ? "text-emerald-400" : bpData?.dscr != null && bpData.dscr >= 1.0 ? "text-yellow-400" : "text-gray-400"}`}>{bpData?.dscr != null ? bpData.dscr.toFixed(2) : "N/C"}</p>
            </div>
            <div className="glass rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">Payback</p>
              <p className="text-sm font-bold mt-0.5 text-white">{bpData?.payback_anni != null ? `${bpData.payback_anni} anni` : "—"}</p>
            </div>
            <div className="glass rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">VAN</p>
              <p className={`text-sm font-bold mt-0.5 ${bpData?.van != null && bpData.van >= 0 ? "text-emerald-400" : "text-red-400"}`}>{bpData?.van != null ? `€${bpData.van.toLocaleString()}` : "—"}</p>
            </div>
            <div className="glass rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">IRR</p>
              <p className="text-sm font-bold mt-0.5 text-emerald-400">{bpData?.irr != null && bpData.irr <= 1000 ? `${bpData.irr.toFixed(1)}%` : "N/A"}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Analisi Tecnica e Spese ── */}
      {tab === "analysis" && (
        <div className="animate-fade-in">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Corrispondenza Spese — Bando</h3>
            {analisiTecnica.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-[30%]">Spesa Inserita</th>
                      <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Articolo / Corrispondenza nel Bando</th>
                      <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-[12%]">Aliquota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisiTecnica.map((item, i) => (
                      <tr key={i} className={`border-t border-white/[0.04] ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                        <td className="px-4 py-2.5 text-white font-medium">{item.categoria_spesa}</td>
                        <td className="px-4 py-2.5 text-gray-400">{item.corrispondenza}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">{item.aliquota != null ? `${item.aliquota}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nessuna corrispondenza disponibile</p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Analisi Custom ── */}
      {tab === "custom" && (
        <div className="animate-fade-in">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Risposta alla Richiesta Specifica</h3>
            {custom_prompt && (
              <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.1em] mb-1">Richiesta inserita</p>
                <p className="text-sm text-gray-300 italic">{custom_prompt}</p>
              </div>
            )}
            <div className="p-4 rounded-xl bg-emerald-900/10 border border-emerald-500/10">
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{analisiCustom || "Nessuna risposta disponibile."}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Dati Core ── */}
      {tab === "data" && (
        <div className="animate-fade-in space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Dati Core Bando */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-[0.1em] mb-4">Dati Core Bando</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Ente</span>
                  <span className="text-sm text-white font-medium">—</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Scadenza</span>
                  <span className="text-sm text-white font-medium">{deepScan?.scadenze?.[0]?.chiusura || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Budget / Massimale</span>
                  <span className="text-sm text-white font-medium">
                    {deepScan?.massimali_spesa?.[0] ? `€${deepScan.massimali_spesa[0].importo.toLocaleString()}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Investimento Min</span>
                  <span className="text-sm text-white font-medium">
                    {deepScan?.spese_ammissibili?.[0]?.aliquota != null ? `${deepScan.spese_ammissibili[0].aliquota}%` : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-500">Requisiti Accesso</span>
                  <span className="text-sm text-white font-medium text-right max-w-[200px]">{deepScan?.requisiti_accesso?.slice(0, 2).join(", ") || "—"}</span>
                </div>
              </div>
            </div>

            {/* Dati Core Azienda */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-[0.1em] mb-4">Dati Core Azienda</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Ragione Sociale</span>
                  <span className="text-sm text-white font-medium">{azienda.ragione_sociale}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">ATECO</span>
                  <span className="text-sm text-white font-medium">{azienda.ateco || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Sede</span>
                  <span className="text-sm text-white font-medium">{azienda.sede_legale || azienda.regione || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Fatturato</span>
                  <span className="text-sm text-white font-medium">€{(azienda.fatturato || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Dipendenti</span>
                  <span className="text-sm text-white font-medium">{azienda.dipendenti || 0}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-500">Investimento Totale</span>
                  <span className="text-sm text-white font-medium">€{(azienda.investimento || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Riepilogo Finanziario */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Riepilogo Finanziario</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-white/[0.02]">
                <p className="text-gray-500 text-xs">Contributo</p>
                <p className="text-emerald-400 font-bold text-lg">€{(calcolo?.contributo || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02]">
                <p className="text-gray-500 text-xs">Finanziamento</p>
                <p className="text-emerald-400 font-bold text-lg">€{(calcolo?.finanziamento || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02]">
                <p className="text-gray-500 text-xs">DSCR</p>
                <p className="text-white font-bold text-lg">{bpData?.dscr != null ? bpData.dscr.toFixed(2) : "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02]">
                <p className="text-gray-500 text-xs">IRR</p>
                <p className="text-white font-bold text-lg">{bpData?.irr != null && bpData.irr <= 1000 ? `${bpData.irr.toFixed(1)}%` : "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: Checklist Pratica ── */}
      {tab === "checklist" && (
        <div className="animate-fade-in">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Documenti Necessari alla Presentazione</h3>
            <div className="space-y-1">
              {checklist.map((item, i) => (
                <div key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    item.completato ? "bg-emerald-900/10 border border-emerald-500/10" : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"
                  }`}
                  onClick={() => toggleChecklist(i)}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    item.completato ? "bg-emerald-500 border-emerald-500" : "border-gray-600 hover:border-gray-500"
                  }`}>
                    {item.completato && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.completato ? "text-emerald-400 line-through" : "text-white"}`}>{item.nome}</p>
                  </div>
                  {item.obbligatorio && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 flex-shrink-0">Obbligatorio</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.04]">
              <p className="text-xs text-gray-500">{checklist.filter((c) => c.completato).length} / {checklist.length} documenti pronti</p>
              {checklist.filter((c) => c.completato).length === checklist.length && checklist.length > 0 && (
                <span className="text-xs font-medium text-emerald-400">Tutti i documenti sono pronti</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
