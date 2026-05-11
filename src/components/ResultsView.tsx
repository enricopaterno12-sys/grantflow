"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StatusBadge from "./StatusBadge";
import DocumentChecklist from "./DocumentChecklist";
import { parseValutazioneTecnica } from "@/lib/valutazioneTecnicaParser";
import type {
  VerifyResponse, CompanyData, DeepScanResult,
  EligibilityResult, BusinessPlanResult, ChecklistItem,
} from "@/types";

type ResultTab = "overview" | "requirements" | "financial" | "documents";

interface Props {
  response: VerifyResponse;
  azienda: CompanyData;
  deepScan?: DeepScanResult;
}

function StatCard({ label, value, valueClass = "text-white" }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${valueClass}`}>{value}</p>
    </div>
  );
}

function MiniCard({ label, value, semaforo, messaggio }: { label: string; value: React.ReactNode; semaforo?: "VERDE" | "GIALLO" | "ROSSO"; messaggio?: string }) {
  const borderMap = { VERDE: "border-emerald-500/20", GIALLO: "border-yellow-500/20", ROSSO: "border-red-500/20" };
  const dotMap = { VERDE: "bg-emerald-500", GIALLO: "bg-yellow-500", ROSSO: "bg-red-500" };
  const border = semaforo ? borderMap[semaforo] : "border-white/[0.04]";
  return (
    <div className={`glass rounded-xl px-3 py-2.5 border ${border}`}>
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{label}</p>
        {semaforo && <span className={`w-1.5 h-1.5 rounded-full ${dotMap[semaforo]}`} />}
      </div>
      <p className="text-sm font-bold mt-0.5 text-white">{value}</p>
      {messaggio && <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{messaggio}</p>}
    </div>
  );
}

export default function ResultsView({ response, azienda, deepScan }: Props) {
  const {
    calcolo_finanziario: calcolo,
    valutazione_bilanci: valBil,
    valutazione_fatturato: valFat,
    indipendenza_finanziaria: indFin,
    eligibility,
    eligibility_checks: eligibilityChecks,
    business_plan: businessPlan,
    business_plan_data: bpData,
    checklist,
  } = response;

  const [tab, setTab] = useState<ResultTab>("overview");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(checklist || []);
  const [exporting, setExporting] = useState<string | null>(null);

  const probMatch = eligibility.match(/PROBABILITÀ\s*APPROVAZIONE\s*[:\-]?\s*(\d+)/i);
  const probabilita = probMatch ? parseInt(probMatch[1]) : null;

  const statoMatch = eligibility.match(/CLASSIFICAZIONE FINALE:\s*\[?(\w+)\]?/i);
  const stato = statoMatch?.[1]?.toUpperCase() ?? "N/D";

  const handleExport = useCallback(async (type: "docx" | "pptx") => {
    setExporting(type);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, data: {
            azienda, calcolo, deepScan: deepScan || {},
            businessPlan: bpData, eligibility: eligibilityChecks,
            checklist: checklistItems,
          },
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "docx"
        ? `dossier_${azienda.ragione_sociale.replace(/\s+/g, "_")}.docx`
        : `pitch_${azienda.ragione_sociale.replace(/\s+/g, "_")}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(null);
    }
  }, [azienda, calcolo, deepScan, bpData, eligibilityChecks, checklistItems]);

  const tabs: { key: ResultTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "requirements", label: "Requisiti Tecnici" },
    { key: "financial", label: "Piano Finanziario" },
    { key: "documents", label: "Documenti Generati" },
  ];

  const overall = eligibilityChecks?.overall || stato;
  const prob = eligibilityChecks?.probabilita || probabilita;
  const probColor = prob != null ? (prob >= 75 ? "text-emerald-400" : prob >= 40 ? "text-yellow-400" : "text-red-400") : "text-gray-400";
  const investValue = calcolo.investimento_effettivo;
  const contribValue = calcolo.contributo;
  const finanzValue = calcolo.finanziamento;

  return (
    <div className="space-y-6">
      {/* Header + Export buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Risultati Analisi</h2>
          <StatusBadge stato={stato} probabilita={prob} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport("docx")} disabled={exporting === "docx"}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg shadow-emerald-900/20"
          >{exporting === "docx" ? "Generazione..." : "📄 Scarica Dossier DOCX"}</button>
          <button onClick={() => handleExport("pptx")} disabled={exporting === "pptx"}
            className="px-4 py-2 text-sm font-medium text-white bg-white/[0.06] hover:bg-white/[0.10] rounded-xl transition-all duration-200 disabled:opacity-50 border border-white/[0.06]"
          >{exporting === "pptx" ? "Generazione..." : "📊 Scarica Pitch PPTX"}</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/[0.06]">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium transition-colors relative ${tab === t.key ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}
            >
              {t.label}
              {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB (P5 + P6) ── */}
      {tab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Riga 1 — Primarie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5 flex flex-col justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">Classificazione</p>
              <div className={`mt-3 px-4 py-4 rounded-xl text-center ${
                overall === "VERDE" ? "bg-emerald-900/20 border border-emerald-500/20" :
                overall === "ROSSO" ? "bg-red-900/20 border border-red-500/20" :
                "bg-yellow-900/20 border border-yellow-500/20"
              }`}>
                <span className={`text-3xl font-bold ${
                  overall === "VERDE" ? "text-emerald-400" :
                  overall === "ROSSO" ? "text-red-400" : "text-yellow-400"
                }`}>{overall}</span>
              </div>
            </div>
            <div className="glass rounded-2xl p-5 flex flex-col justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">Probabilità</p>
              <p className={`text-3xl font-bold mt-3 ${probColor}`}>{prob != null ? `${prob}%` : "N/D"}</p>
            </div>
          </div>

          {/* Riga 2 — Secondarie */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="Investimento" value={
              investValue != null ? `€${investValue.toLocaleString()}` :
              <span className="text-gray-500 text-sm">Da definire <span className="text-[10px]">— inserisci importo</span></span>
            } />
            <StatCard label="Contributo" value={`€${contribValue?.toLocaleString() ?? "—"}`} valueClass="text-emerald-400" />
            <StatCard label="Finanziamento Agevolato" value={`€${finanzValue?.toLocaleString() ?? "—"}`} valueClass="text-emerald-400" />
          </div>

          {/* Riga 3 — Terziarie con semaforo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MiniCard label="DSCR" value={
              bpData?.dscr == null || bpData.dscr === 0
                ? <span className="text-gray-500 text-sm">N/C</span>
                : bpData.dscr.toFixed(2)
            } semaforo={
              bpData?.dscr == null || bpData.dscr === 0 ? "GIALLO" :
              bpData.dscr >= 1.3 ? "VERDE" :
              bpData.dscr >= 1.0 ? "GIALLO" : "ROSSO"
            } messaggio={
              bpData?.dscr == null || bpData.dscr === 0 ? "Dati insufficienti" :
              bpData.dscr >= 1.3 ? "Ottimo" :
              bpData.dscr >= 1.0 ? "Adeguato" : "Sotto soglia (min 1.0)"
            } />
            <MiniCard label="Payback" value={bpData?.payback_anni != null ? `${bpData.payback_anni} anni` : "—"} semaforo={
              bpData?.payback_anni == null ? "GIALLO" :
              bpData.payback_anni <= 3 ? "VERDE" :
              bpData.payback_anni <= 5 ? "GIALLO" : "ROSSO"
            } messaggio={
              bpData?.payback_anni == null ? "Dati insufficienti" :
              bpData.payback_anni <= 3 ? "Recupero rapido" :
              bpData.payback_anni <= 5 ? "Recupero standard" : "Recupero lungo"
            } />
            <MiniCard label="VAN" value={
              bpData?.van != null
                ? `€${bpData.van.toLocaleString()}`
                : "—"
            } semaforo={
              bpData?.van == null ? "GIALLO" :
              bpData.van > 0 ? "VERDE" : "ROSSO"
            } messaggio={
              bpData?.van == null ? "Dati insufficienti" :
              bpData.van > 0 ? "Progetto redditizio" : "Progetto non redditizio"
            } />
            <MiniCard label="IRR" value={
              bpData?.irr != null && (bpData.irr > 1000 || bpData.irr <= 0)
                ? <span className="text-yellow-400">N/A</span>
                : bpData?.irr != null ? `${bpData.irr.toFixed(2)}%` : "—"
            } semaforo={
              bpData?.irr == null || bpData.irr > 1000 || bpData.irr <= 0 ? "GIALLO" :
              bpData.irr > 10 ? "VERDE" :
              bpData.irr > 5 ? "GIALLO" : "ROSSO"
            } messaggio={
              bpData?.irr == null || bpData.irr > 1000 || bpData.irr <= 0 ? "Valore fuori range" :
              bpData.irr > 10 ? "Rendimento elevato" :
              bpData.irr > 5 ? "Rendimento adeguato" : "Rendimento basso"
            } />
          </div>

          {/* Eligibility Table (P6) */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Verifica Eligibility</h3>
            {eligibilityChecks?.checks && eligibilityChecks.checks.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Criterio</th>
                      <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Requisito del Bando</th>
                      <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Dato Azienda</th>
                      <th className="text-center px-4 py-2.5 text-gray-400 font-medium">Esito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibilityChecks.checks.map((check, i) => {
                      const parts = check.dettaglio.split("—").map((s) => s.trim());
                      const requisito = parts.length > 1 ? parts[0] : "";
                      const dato = parts.length > 1 ? parts.slice(1).join(" — ") : check.dettaglio;
                      return (
                        <tr key={i} className={`border-t border-white/[0.04] ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                          <td className="px-4 py-2.5 text-white font-medium">{check.nome}</td>
                          <td className="px-4 py-2.5 text-gray-400">{requisito || "—"}</td>
                          <td className="px-4 py-2.5 text-gray-300">{dato}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              check.status === "PASS" ? "bg-emerald-900/30 text-emerald-400" :
                              check.status === "WARN" ? "bg-yellow-900/30 text-yellow-400" :
                              "bg-red-900/30 text-red-400"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                check.status === "PASS" ? "bg-emerald-500" :
                                check.status === "WARN" ? "bg-yellow-500" : "bg-red-500"
                              }`} />
                              {check.status === "PASS" ? "OK" : check.status === "WARN" ? "VERIFICA" : "INSUFFICIENTE"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {eligibilityChecks.motivazioni && (
                  <div className="mt-4 p-4 rounded-xl bg-yellow-900/10 border border-yellow-500/10">
                    <p className="text-xs font-semibold text-yellow-400 mb-1">Raccomandazioni prioritarie</p>
                    <p className="text-sm text-gray-300">{eligibilityChecks.motivazioni}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="prose prose-invert max-w-none text-sm text-gray-400">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{eligibility}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Valutazioni */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-3">Valutazioni</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500 text-sm">Stato bilanci:</span>{" "}
                <span className={`text-sm font-semibold ${valBil.stato === "VERDE" ? "text-emerald-400" : valBil.stato === "ROSSO" ? "text-red-400" : "text-yellow-400"}`}>{valBil.stato}</span>
                <p className="text-gray-500 text-sm mt-1">{valBil.dettaglio}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Stato fatturato:</span>{" "}
                <span className={`text-sm font-semibold ${valFat.stato === "VERDE" ? "text-emerald-400" : valFat.stato === "ROSSO" ? "text-red-400" : "text-yellow-400"}`}>{valFat.stato}</span>
                <p className="text-gray-500 text-sm mt-1">{valFat.dettaglio}</p>
              </div>
              {indFin && (
                <div>
                  <span className="text-gray-500 text-sm">Indipendenza Finanziaria:</span>{" "}
                  <span className={`text-sm font-semibold ${indFin.stato === "VERDE" ? "text-emerald-400" : indFin.stato === "ROSSO" ? "text-red-400" : "text-yellow-400"}`}>{indFin.stato}</span>
                  <p className="text-gray-500 text-sm mt-1">{indFin.dettaglio}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REQUIREMENTS TAB ── */}
      {tab === "requirements" && deepScan && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Codici ATECO</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-1">Ammessi:</p>
                <div className="flex flex-wrap gap-2">
                  {deepScan.ateco_ammessi?.map((a, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-900/20 text-emerald-400 text-xs font-medium border border-emerald-500/10">{a}</span>
                  )) || <span className="text-gray-600 text-sm">—</span>}
                </div>
              </div>
              {deepScan.ateco_esclusi?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Esclusi:</p>
                  <div className="flex flex-wrap gap-2">
                    {deepScan.ateco_esclusi.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-red-900/20 text-red-400 text-xs font-medium border border-red-500/10">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Massimali di Spesa</h3>
            {deepScan.massimali_spesa?.length > 0 ? (
              <div className="space-y-3">
                {deepScan.massimali_spesa.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                    <div><p className="text-sm font-medium text-white">{m.regime}</p>{m.articolo && <p className="text-[11px] text-emerald-500/70">{m.articolo}</p>}</div>
                    <div className="text-right"><p className="text-sm font-bold text-white">€{m.importo.toLocaleString()}</p>{m.periodo && <p className="text-[11px] text-gray-500">{m.periodo}</p>}</div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">—</p>}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Scadenze</h3>
            {deepScan.scadenze?.length > 0 ? (
              <div className="space-y-3">
                {deepScan.scadenze.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                    <div><p className="text-sm text-white">{s.apertura ? `${s.apertura} → ` : ""}{s.chiusura}</p>{s.articolo && <p className="text-[11px] text-emerald-500/70">{s.articolo}</p>}</div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.perentoria ? "bg-red-900/30 text-red-400" : "bg-yellow-900/30 text-yellow-400"}`}>{s.perentoria ? "Perentoria" : "Indicativa"}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">—</p>}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Criteri di Valutazione</h3>
            {deepScan.criteri_valutazione?.length > 0 ? (
              <div className="space-y-2">
                {deepScan.criteri_valutazione.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                    <div className="flex-1"><p className="text-sm text-white">{c.criterio}</p>{c.articolo && <p className="text-[11px] text-emerald-500/70">{c.articolo}</p>}</div>
                    <div className="text-right flex-shrink-0 ml-4"><span className="text-sm font-bold text-emerald-400">{c.punteggio_massimo} pt</span>{c.peso && <span className="text-xs text-gray-500 ml-2">({c.peso}%)</span>}</div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">—</p>}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Spese Ammissibili</h3>
            {deepScan.spese_ammissibili?.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead><tr className="bg-white/[0.02]">
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Categoria</th>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Dettaglio</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Aliquota</th>
                  </tr></thead>
                  <tbody>{deepScan.spese_ammissibili.map((s, i) => (
                    <tr key={i} className="border-t border-white/[0.04]">
                      <td className="px-4 py-2.5 text-white">{s.categoria}</td>
                      <td className="px-4 py-2.5 text-gray-500">{s.dettaglio}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">{s.aliquota}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="text-sm text-gray-500">—</p>}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Regimi di Aiuto</h3>
            {deepScan.regimi_aiuto?.length > 0 ? (
              <div className="space-y-3">
                {deepScan.regimi_aiuto.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.02]">
                    <div className="flex items-center justify-between"><p className="text-sm font-medium text-white">{r.tipo}</p><span className="text-sm font-bold text-emerald-400">{r.intensita_massima}%</span></div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.regolamento}</p>
                    {r.articolo && <p className="text-[11px] text-emerald-500/70 mt-0.5">{r.articolo}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">—</p>}
          </div>
        </div>
      )}

      {/* ── FINANCIAL TAB ── */}
      {tab === "financial" && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Dettaglio Calcolo Finanziario</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">Contributo:</span> <span className="text-white font-medium">€{calcolo.contributo?.toLocaleString()}</span></div>
              <div><span className="text-gray-500">Finanziamento:</span> <span className="text-white font-medium">€{calcolo.finanziamento?.toLocaleString()}</span></div>
              <div><span className="text-gray-500">Aliquota contributo:</span> <span className="text-white font-medium">{calcolo.aliquota_contributo}%</span></div>
              <div><span className="text-gray-500">Aliquota finanziamento:</span> <span className="text-white font-medium">{calcolo.aliquota_finanziamento}%</span></div>
            </div>
            {calcolo.troncato && <p className="mt-3 text-yellow-400/80 text-sm">Investimento troncato al massimale del bando</p>}
            {!calcolo.successo && calcolo.errore && <p className="mt-3 text-red-400/80 text-sm">{calcolo.errore}</p>}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Indicatori Economici</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-gray-500 text-xs">DSCR</p><p className="text-white font-bold text-lg">{bpData?.dscr ?? "—"}</p></div>
              <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-gray-500 text-xs">Payback</p><p className="text-white font-bold text-lg">{bpData?.payback_anni ?? "—"} anni</p></div>
              <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-gray-500 text-xs">VAN</p><p className={`font-bold text-lg ${bpData?.van != null && bpData.van < 0 ? "text-red-400" : "text-emerald-400"}`}>€{bpData?.van?.toLocaleString() ?? "—"}</p></div>
              <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-gray-500 text-xs">IRR</p><p className="text-emerald-400 font-bold text-lg">{bpData?.irr ?? "—"}%</p></div>
            </div>
          </div>

          {bpData?.cashflow && bpData.cashflow.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Proiezioni Cashflow</h3>
              <div className="overflow-hidden rounded-xl border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead><tr className="bg-white/[0.02]">
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Anno</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Ricavi</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Costi</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Netto</th>
                  </tr></thead>
                  <tbody>{bpData.cashflow.map((c) => (
                    <tr key={c.anno} className="border-t border-white/[0.04]">
                      <td className="px-4 py-2.5 text-white font-medium">Anno {c.anno}</td>
                      <td className="px-4 py-2.5 text-right text-gray-200">€{c.ricavi.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">€{c.costi.toLocaleString()}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${c.netto >= 0 ? "text-emerald-400" : "text-red-400"}`}>€{c.netto.toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          <div className="glass rounded-2xl p-5 prose prose-invert max-w-none prose-emerald prose-headings:text-white prose-a:text-emerald-400">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{businessPlan}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* ── DOCUMENTS TAB (P7) ── */}
      {tab === "documents" && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass rounded-2xl p-5">
            <DocumentChecklist items={checklistItems} onChange={setChecklistItems} />
          </div>

          {calcolo.successo && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Generazione Documenti</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => handleExport("docx")} disabled={exporting === "docx"}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all disabled:opacity-50 text-left">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div><p className="text-sm font-medium text-white">{exporting === "docx" ? "Generazione in corso..." : "Dossier Tecnico (DOCX)"}</p><p className="text-xs text-gray-500 mt-0.5">Sintesi bando, piano investimenti, cronoprogramma, DSCR, checklist documentale</p></div>
                </button>
                <button onClick={() => handleExport("pptx")} disabled={exporting === "pptx"}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all disabled:opacity-50 text-left">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                  </div>
                  <div><p className="text-sm font-medium text-white">{exporting === "pptx" ? "Generazione in corso..." : "Pitch di Presentazione (PPTX)"}</p><p className="text-xs text-gray-500 mt-0.5">Slide overview, financials, requisiti bando, eligibility checks per il cliente</p></div>
                </button>
              </div>
            </div>
          )}

          {/* Valutazione Tecnica strutturata (P7) */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">Valutazione Tecnica</h3>
            <div className="space-y-4">
              {(() => {
                const sections = parseValutazioneTecnica(eligibility || "");
                if (sections.length === 0) return <p className="text-sm text-gray-500">Nessun dato disponibile</p>;
                return sections.map((sec, i) => {
                  switch (sec.type) {
                    case "h4":
                      return <div key={i}><h4 className="text-sm font-semibold text-white mb-1">{sec.label}</h4><p className="text-sm text-gray-300">{sec.content as string}</p></div>;
                    case "p":
                      return <p key={i} className="text-sm text-gray-300">{sec.content as string}</p>;
                    case "ul":
                      return <div key={i}><h4 className="text-sm font-semibold text-white mb-2">{sec.label}</h4><ul className="space-y-1">{(sec.content as string[]).map((item, j) => <li key={j} className="flex items-start gap-2 text-sm text-gray-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />{item}</li>)}</ul></div>;
                    case "ol":
                      return <div key={i}><h4 className="text-sm font-semibold text-white mb-2">{sec.label}</h4><ol className="space-y-1 list-decimal list-inside">{(sec.content as string[]).map((item, j) => <li key={j} className="text-sm text-gray-300">{item}</li>)}</ol></div>;
                    case "table": {
                      const { rows } = sec.content as { rows: string[][] };
                      if (rows.length === 0) return null;
                      const [header, ...body] = rows;
                      return <div key={i}><h4 className="text-sm font-semibold text-white mb-2">{sec.label}</h4><div className="overflow-hidden rounded-xl border border-white/[0.04]"><table className="w-full text-sm"><thead><tr className="bg-white/[0.02]">{header?.map((h, j) => <th key={j} className="text-left px-3 py-2 text-gray-400 font-medium">{h}</th>)}</tr></thead><tbody>{body.map((row, r) => <tr key={r} className="border-t border-white/[0.04]">{row.map((cell, c) => <td key={c} className="px-3 py-2 text-gray-300">{cell}</td>)}</tr>)}</tbody></table></div></div>;
                    }
                    case "box": {
                      const colorMap = { verde: { bg: "bg-emerald-900/20 border-emerald-500/20 text-emerald-400", icn: "🟢" }, giallo: { bg: "bg-yellow-900/20 border-yellow-500/20 text-yellow-400", icn: "🟡" }, rosso: { bg: "bg-red-900/20 border-red-500/20 text-red-400", icn: "🔴" } };
                      const c = colorMap[sec.boxColor || "giallo"];
                      return <div key={i} className={`p-4 rounded-xl border ${c.bg}`}><p className="text-sm font-bold">{c.icn} {(sec.content as string).replace(/[\[\]]/g, "")}</p></div>;
                    }
                    default:
                      return null;
                  }
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
