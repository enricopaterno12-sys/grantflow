"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StatusBadge from "./StatusBadge";
import DocumentChecklist from "./DocumentChecklist";
import type {
  VerifyResponse,
  CompanyData,
  DeepScanResult,
  EligibilityResult,
  BusinessPlanResult,
  ChecklistItem,
  CalcoloFinanziario,
} from "@/types";

type ResultTab = "overview" | "requirements" | "financial" | "documents";

interface Props {
  response: VerifyResponse;
  azienda: CompanyData;
  deepScan?: DeepScanResult;
}

function StatCard({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="glass rounded-xl px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
        {label}
      </p>
      <p className={`text-lg font-bold mt-0.5 ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function ResultsView({ response, azienda, deepScan }: Props) {
  const {
    calcolo_finanziario: calcolo,
    valutazione_bilanci: valBil,
    valutazione_fatturato: valFat,
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

  const handleExport = useCallback(
    async (type: "docx" | "pptx") => {
      setExporting(type);
      try {
        const res = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            data: {
              azienda,
              calcolo,
              deepScan: deepScan || {},
              businessPlan: bpData,
              eligibility: eligibilityChecks,
              checklist: checklistItems,
            },
          }),
        });
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = type === "docx" ? `dossier_${azienda.ragione_sociale.replace(/\s+/g, "_")}.docx` : `pitch_${azienda.ragione_sociale.replace(/\s+/g, "_")}.pptx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Export error:", err);
      } finally {
        setExporting(null);
      }
    },
    [azienda, calcolo, deepScan, bpData, eligibilityChecks, checklistItems],
  );

  const tabs: { key: ResultTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "requirements", label: "Requisiti Tecnici" },
    { key: "financial", label: "Piano Finanziario" },
    { key: "documents", label: "Documenti Generati" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Risultati Analisi</h2>
          <StatusBadge stato={stato} probabilita={probabilita || eligibilityChecks?.probabilita} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("docx")}
            disabled={exporting === "docx"}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg shadow-emerald-900/20"
          >
            {exporting === "docx" ? "Generazione..." : "📄 Scarica Dossier DOCX"}
          </button>
          <button
            onClick={() => handleExport("pptx")}
            disabled={exporting === "pptx"}
            className="px-4 py-2 text-sm font-medium text-white bg-white/[0.06] hover:bg-white/[0.10] rounded-xl transition-all duration-200 disabled:opacity-50 border border-white/[0.06]"
          >
            {exporting === "pptx" ? "Generazione..." : "📊 Scarica Pitch PPTX"}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/[0.06]">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                tab === t.key ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Classificazione" value={eligibilityChecks?.overall || stato} valueClass={
              (eligibilityChecks?.overall || stato) === "VERDE" ? "text-emerald-400" :
              (eligibilityChecks?.overall || stato) === "ROSSO" ? "text-red-400" :
              "text-yellow-400"
            } />
            <StatCard label="Probabilità" value={`${eligibilityChecks?.probabilita || probabilita || "N/D"}%`} valueClass="text-emerald-400" />
            <StatCard label="Investimento" value={`€${calcolo.investimento_effettivo?.toLocaleString() ?? "—"}`} />
            <StatCard label="Contributo" value={`€${calcolo.contributo?.toLocaleString() ?? "—"}`} valueClass="text-emerald-400" />
            <StatCard label="DSCR" value={bpData?.dscr != null ? String(bpData.dscr) : "N/D"} valueClass="text-emerald-300" />
            <StatCard label="Payback" value={bpData?.payback_anni != null ? `${bpData.payback_anni} anni` : "N/D"} />
            <StatCard label="VAN" value={bpData?.van != null ? `€${bpData.van.toLocaleString()}` : "N/D"} valueClass="text-emerald-300" />
            <StatCard label="IRR" value={bpData?.irr != null ? `${bpData.irr}%` : "N/D"} />
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-3">
              Verifica Eligibility
            </h3>
            {eligibilityChecks?.checks && eligibilityChecks.checks.length > 0 ? (
              <div className="space-y-2">
                {eligibilityChecks.checks.map((check, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className={`flex-shrink-0 mt-0.5 ${
                      check.status === "PASS" ? "text-emerald-500" :
                      check.status === "WARN" ? "text-yellow-500" :
                      "text-red-500"
                    }`}>
                      {check.status === "PASS" ? "✅" : check.status === "WARN" ? "⚠️" : "❌"}
                    </span>
                    <div>
                      <p className="text-white font-medium">{check.nome}</p>
                      <p className="text-gray-500">{check.dettaglio}</p>
                      {check.riferimento && (
                        <p className="text-[11px] text-emerald-500/70 mt-0.5">{check.riferimento}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="prose prose-invert max-w-none text-sm text-gray-400">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{eligibility}</ReactMarkdown>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-3">
              Valutazioni
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500 text-sm">Stato bilanci:</span>{" "}
                <span className={`text-sm font-semibold ${valBil.stato === "VERDE" ? "text-emerald-400" : valBil.stato === "ROSSO" ? "text-red-400" : "text-yellow-400"}`}>
                  {valBil.stato}
                </span>
                <p className="text-gray-500 text-sm mt-1">{valBil.dettaglio}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Stato fatturato:</span>{" "}
                <span className={`text-sm font-semibold ${valFat.stato === "VERDE" ? "text-emerald-400" : valFat.stato === "ROSSO" ? "text-red-400" : "text-yellow-400"}`}>
                  {valFat.stato}
                </span>
                <p className="text-gray-500 text-sm mt-1">{valFat.dettaglio}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REQUIREMENTS TAB ── */}
      {tab === "requirements" && deepScan && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
              Codici ATECO
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-1">Ammessi:</p>
                <div className="flex flex-wrap gap-2">
                  {deepScan.ateco_ammessi?.map((a, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-900/20 text-emerald-400 text-xs font-medium border border-emerald-500/10">
                      {a}
                    </span>
                  )) || <span className="text-gray-600 text-sm">—</span>}
                </div>
              </div>
              {deepScan.ateco_esclusi?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Esclusi:</p>
                  <div className="flex flex-wrap gap-2">
                    {deepScan.ateco_esclusi.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-red-900/20 text-red-400 text-xs font-medium border border-red-500/10">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
              Massimali di Spesa
            </h3>
            {deepScan.massimali_spesa?.length > 0 ? (
              <div className="space-y-3">
                {deepScan.massimali_spesa.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                    <div>
                      <p className="text-sm font-medium text-white">{m.regime}</p>
                      {m.articolo && <p className="text-[11px] text-emerald-500/70">{m.articolo}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">€{m.importo.toLocaleString()}</p>
                      {m.periodo && <p className="text-[11px] text-gray-500">{m.periodo}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
              Scadenze
            </h3>
            {deepScan.scadenze?.length > 0 ? (
              <div className="space-y-3">
                {deepScan.scadenze.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                    <div>
                      <p className="text-sm text-white">
                        {s.apertura ? `${s.apertura} → ` : ""}{s.chiusura}
                      </p>
                      {s.articolo && <p className="text-[11px] text-emerald-500/70">{s.articolo}</p>}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.perentoria ? "bg-red-900/30 text-red-400" : "bg-yellow-900/30 text-yellow-400"
                    }`}>
                      {s.perentoria ? "Perentoria" : "Indicativa"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
              Criteri di Valutazione
            </h3>
            {deepScan.criteri_valutazione?.length > 0 ? (
              <div className="space-y-2">
                {deepScan.criteri_valutazione.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                    <div className="flex-1">
                      <p className="text-sm text-white">{c.criterio}</p>
                      {c.articolo && <p className="text-[11px] text-emerald-500/70">{c.articolo}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <span className="text-sm font-bold text-emerald-400">{c.punteggio_massimo} pt</span>
                      {c.peso && <span className="text-xs text-gray-500 ml-2">({c.peso}%)</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
              Spese Ammissibili
            </h3>
            {deepScan.spese_ammissibili?.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Categoria</th>
                      <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Dettaglio</th>
                      <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Aliquota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deepScan.spese_ammissibili.map((s, i) => (
                      <tr key={i} className="border-t border-white/[0.04]">
                        <td className="px-4 py-2.5 text-white">{s.categoria}</td>
                        <td className="px-4 py-2.5 text-gray-500">{s.dettaglio}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">{s.aliquota}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
              Regimi di Aiuto
            </h3>
            {deepScan.regimi_aiuto?.length > 0 ? (
              <div className="space-y-3">
                {deepScan.regimi_aiuto.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{r.tipo}</p>
                      <span className="text-sm font-bold text-emerald-400">{r.intensita_massima}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.regolamento}</p>
                    {r.articolo && <p className="text-[11px] text-emerald-500/70 mt-0.5">{r.articolo}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
          </div>
        </div>
      )}

      {/* ── FINANCIAL TAB ── */}
      {tab === "financial" && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
              Dettaglio Calcolo Finanziario
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">Contributo:</span> <span className="text-white font-medium">€{calcolo.contributo?.toLocaleString()}</span></div>
              <div><span className="text-gray-500">Finanziamento:</span> <span className="text-white font-medium">€{calcolo.finanziamento?.toLocaleString()}</span></div>
              <div><span className="text-gray-500">Aliquota contributo:</span> <span className="text-white font-medium">{calcolo.aliquota_contributo}%</span></div>
              <div><span className="text-gray-500">Aliquota finanziamento:</span> <span className="text-white font-medium">{calcolo.aliquota_finanziamento}%</span></div>
            </div>
            {calcolo.troncato && <p className="mt-3 text-yellow-400/80 text-sm">Investimento troncato al massimale del bando</p>}
            {!calcolo.successo && calcolo.errore && (
              <p className="mt-3 text-red-400/80 text-sm">{calcolo.errore}</p>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
              Indicatori Economici
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-white/[0.02]">
                <p className="text-gray-500 text-xs">DSCR</p>
                <p className="text-white font-bold text-lg">{bpData?.dscr ?? "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02]">
                <p className="text-gray-500 text-xs">Payback</p>
                <p className="text-white font-bold text-lg">{bpData?.payback_anni ?? "—"} anni</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02]">
                <p className="text-gray-500 text-xs">VAN</p>
                <p className="text-emerald-400 font-bold text-lg">€{bpData?.van?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02]">
                <p className="text-gray-500 text-xs">IRR</p>
                <p className="text-emerald-400 font-bold text-lg">{bpData?.irr ?? "—"}%</p>
              </div>
            </div>
          </div>

          {bpData?.cashflow && bpData.cashflow.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
                Proiezioni Cashflow
              </h3>
              <div className="overflow-hidden rounded-xl border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Anno</th>
                      <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Ricavi</th>
                      <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Costi</th>
                      <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bpData.cashflow.map((c) => (
                      <tr key={c.anno} className="border-t border-white/[0.04]">
                        <td className="px-4 py-2.5 text-white font-medium">Anno {c.anno}</td>
                        <td className="px-4 py-2.5 text-right text-gray-200">€{c.ricavi.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400">€{c.costi.toLocaleString()}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${c.netto >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          €{c.netto.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="glass rounded-2xl p-5 prose prose-invert max-w-none prose-emerald prose-headings:text-white prose-a:text-emerald-400">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{businessPlan}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {tab === "documents" && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass rounded-2xl p-5">
            <DocumentChecklist items={checklistItems} onChange={setChecklistItems} />
          </div>

          {calcolo.successo && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
                Generazione Documenti
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleExport("docx")}
                  disabled={exporting === "docx"}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all disabled:opacity-50 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {exporting === "docx" ? "Generazione in corso..." : "Dossier Tecnico (DOCX)"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sintesi bando, piano investimenti, cronoprogramma, DSCR, checklist documentale
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport("pptx")}
                  disabled={exporting === "pptx"}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all disabled:opacity-50 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {exporting === "pptx" ? "Generazione in corso..." : "Pitch di Presentazione (PPTX)"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Slide overview, financials, requisiti bando, eligibility checks per il cliente
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="glass rounded-2xl p-5 prose prose-invert max-w-none prose-emerald prose-headings:text-white prose-a:text-emerald-400">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{eligibility}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
