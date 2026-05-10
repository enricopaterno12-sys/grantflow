"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StatusBadge from "./StatusBadge";
import type { VerifyResponse, CompanyData } from "@/types";

interface Props {
  response: VerifyResponse;
  azienda: CompanyData;
}

export default function ResultsView({ response, azienda }: Props) {
  const { calcolo_finanziario, valutazione_bilanci, valutazione_fatturato, eligibility, business_plan } = response;
  const [tab, setTab] = useState<"eligibility" | "plan">("eligibility");

  const probMatch = eligibility.match(/PROBABILITÀ\s*APPROVAZIONE\s*[:\-]?\s*(\d+)/i);
  const probabilita = probMatch ? parseInt(probMatch[1]) : null;

  const statoMatch = eligibility.match(/CLASSIFICAZIONE FINALE:\s*\[?(\w+)\]?/i);
  const stato = statoMatch?.[1]?.toUpperCase() ?? "N/D";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-2xl font-bold text-white">Risultati Analisi</h2>
        <StatusBadge stato={stato} probabilita={probabilita} />
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="bg-gray-800 rounded-xl p-4 flex-1 min-w-[140px]">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Probabilità</p>
          <p className="text-2xl font-bold text-white">{probabilita ?? "N/D"}%</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 flex-1 min-w-[140px]">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Investimento</p>
          <p className="text-2xl font-bold text-white">€{calcolo_finanziario.investimento_effettivo?.toLocaleString() ?? "—"}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 flex-1 min-w-[140px]">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Contributo</p>
          <p className="text-2xl font-bold text-green-400">€{calcolo_finanziario.contributo?.toLocaleString() ?? "—"}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 flex-1 min-w-[140px]">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Totale Agevolabile</p>
          <p className="text-2xl font-bold text-blue-400">€{calcolo_finanziario.totale_agevolabile?.toLocaleString() ?? "—"}</p>
        </div>
      </div>

      {calcolo_finanziario.successo && (
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Calcolo Finanziario</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-400">Contributo:</span> <span className="text-white font-medium">€{calcolo_finanziario.contributo?.toLocaleString()}</span></div>
            <div><span className="text-gray-400">Finanziamento:</span> <span className="text-white font-medium">€{calcolo_finanziario.finanziamento?.toLocaleString()}</span></div>
            <div><span className="text-gray-400">Aliquota contributo:</span> <span className="text-white font-medium">{calcolo_finanziario.aliquota_contributo}%</span></div>
            <div><span className="text-gray-400">Aliquota finanziamento:</span> <span className="text-white font-medium">{calcolo_finanziario.aliquota_finanziamento}%</span></div>
          </div>
          {calcolo_finanziario.troncato && (
            <p className="mt-2 text-yellow-400 text-sm">Investimento troncato al massimale del bando</p>
          )}
        </div>
      )}

      {!calcolo_finanziario.successo && calcolo_finanziario.errore && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-400 text-sm">{calcolo_finanziario.errore}</div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-800 rounded-xl p-4">
          <span className="text-gray-400">Stato bilanci:</span>{" "}
          <span className={`font-semibold ${valutazione_bilanci.stato === "VERDE" ? "text-green-400" : valutazione_bilanci.stato === "ROSSO" ? "text-red-400" : "text-yellow-400"}`}>
            {valutazione_bilanci.stato}
          </span>
          <p className="text-gray-400 mt-1">{valutazione_bilanci.dettaglio}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <span className="text-gray-400">Stato fatturato:</span>{" "}
          <span className={`font-semibold ${valutazione_fatturato.stato === "VERDE" ? "text-green-400" : valutazione_fatturato.stato === "ROSSO" ? "text-red-400" : "text-yellow-400"}`}>
            {valutazione_fatturato.stato}
          </span>
          <p className="text-gray-400 mt-1">{valutazione_fatturato.dettaglio}</p>
        </div>
      </div>

      <div className="border-b border-gray-700">
        <div className="flex gap-0">
          <button onClick={() => setTab("eligibility")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "eligibility" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-200"}`}>
            Eligibility & Matching
          </button>
          <button onClick={() => setTab("plan")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "plan" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-200"}`}>
            Business Plan
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-5 prose prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {tab === "eligibility" ? eligibility : business_plan}
        </ReactMarkdown>
      </div>
    </div>
  );
}
