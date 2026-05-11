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

function StatCard({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
        {label}
      </p>
      <p className={`text-lg font-bold mt-0.5 ${valueClass}`}>{value}</p>
    </div>
  );
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
        <h2 className="text-xl font-semibold text-white">Risultati Analisi</h2>
        <StatusBadge stato={stato} probabilita={probabilita} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Probabilità" value={`${probabilita ?? "N/D"}%`} valueClass="text-emerald-400" />
        <StatCard label="Investimento" value={`€${calcolo_finanziario.investimento_effettivo?.toLocaleString() ?? "—"}`} />
        <StatCard label="Contributo" value={`€${calcolo_finanziario.contributo?.toLocaleString() ?? "—"}`} valueClass="text-emerald-400" />
        <StatCard label="Totale Agevolabile" value={`€${calcolo_finanziario.totale_agevolabile?.toLocaleString() ?? "—"}`} valueClass="text-emerald-300" />
      </div>

      {calcolo_finanziario.successo && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] mb-4">
            Dettaglio Calcolo Finanziario
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Contributo:</span>{" "}
              <span className="text-white font-medium">€{calcolo_finanziario.contributo?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Finanziamento:</span>{" "}
              <span className="text-white font-medium">€{calcolo_finanziario.finanziamento?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Aliquota contributo:</span>{" "}
              <span className="text-white font-medium">{calcolo_finanziario.aliquota_contributo}%</span>
            </div>
            <div>
              <span className="text-gray-500">Aliquota finanziamento:</span>{" "}
              <span className="text-white font-medium">{calcolo_finanziario.aliquota_finanziamento}%</span>
            </div>
          </div>
          {calcolo_finanziario.troncato && (
            <p className="mt-3 text-yellow-400/80 text-sm">Investimento troncato al massimale del bando</p>
          )}
        </div>
      )}

      {!calcolo_finanziario.successo && calcolo_finanziario.errore && (
        <div className="glass rounded-2xl p-4 border border-red-500/20">
          <p className="text-sm text-red-400">{calcolo_finanziario.errore}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4">
          <span className="text-gray-500 text-sm">Stato bilanci:</span>{" "}
          <span
            className={`text-sm font-semibold ${
              valutazione_bilanci.stato === "VERDE"
                ? "text-emerald-400"
                : valutazione_bilanci.stato === "ROSSO"
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            {valutazione_bilanci.stato}
          </span>
          <p className="text-gray-500 text-sm mt-1">{valutazione_bilanci.dettaglio}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <span className="text-gray-500 text-sm">Stato fatturato:</span>{" "}
          <span
            className={`text-sm font-semibold ${
              valutazione_fatturato.stato === "VERDE"
                ? "text-emerald-400"
                : valutazione_fatturato.stato === "ROSSO"
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            {valutazione_fatturato.stato}
          </span>
          <p className="text-gray-500 text-sm mt-1">{valutazione_fatturato.dettaglio}</p>
        </div>
      </div>

      <div className="border-b border-white/[0.06]">
        <div className="flex gap-6">
          <button
            onClick={() => setTab("eligibility")}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              tab === "eligibility"
                ? "text-emerald-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Eligibility & Matching
            {tab === "eligibility" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setTab("plan")}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              tab === "plan"
                ? "text-emerald-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Business Plan
            {tab === "plan" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 prose prose-invert max-w-none prose-emerald prose-headings:text-white prose-a:text-emerald-400 prose-strong:text-white prose-code:text-emerald-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {tab === "eligibility" ? eligibility : business_plan}
        </ReactMarkdown>
      </div>
    </div>
  );
}
