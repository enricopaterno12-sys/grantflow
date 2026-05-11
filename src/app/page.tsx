"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import UploadBando from "@/components/UploadBando";
import CompanyForm from "@/components/CompanyForm";
import LoadingProgress from "@/components/LoadingProgress";
import ResultsView from "@/components/ResultsView";
import { analyzeBando, verifyEligibility } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { AnalyzeResponse, VerifyResponse, CompanyData, Analysis } from "@/types";

type AppStep = "upload" | "form" | "loading" | "results";

export default function Home() {
  const [step, setStep] = useState<AppStep>("upload");
  const [bandoFile, setBandoFile] = useState<File | null>(null);
  const [visuraPrefill, setVisuraPrefill] = useState<{ ragione_sociale?: string; ateco?: string } | undefined>();
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setRecentAnalyses(data);
    })();
  }, []);

  const handleBandoSelected = useCallback((file: File) => {
    setBandoFile(file);
    setError("");
    setStep("form");
  }, []);

  const handleFormSubmit = useCallback(async (data: {
    ragione_sociale: string;
    ateco: string;
    dimensione: string;
    regione: string;
    fatturato: number;
    dipendenti: number;
    data_costituzione: string;
    investimento: number;
    finanziamento_richiesto: number;
    visuraFile?: File | null;
  }) => {
    if (!bandoFile) return;
    setLoading(true);
    setError("");
    setStep("loading");

    const company: CompanyData = {
      ragione_sociale: data.ragione_sociale,
      ateco: data.ateco,
      dimensione: data.dimensione || undefined,
      regione: data.regione || undefined,
      fatturato: data.fatturato || undefined,
      dipendenti: data.dipendenti || undefined,
      data_costituzione: data.data_costituzione || undefined,
      investimento: data.investimento || undefined,
      finanziamento_richiesto: data.finanziamento_richiesto || undefined,
    };

    try {
      // Phase 3a: Deep scan del bando
      const analyzeRes = await analyzeBando(bandoFile, data.visuraFile || undefined);
      setAnalyzeResult(analyzeRes);

      if (analyzeRes.visura_data) {
        setVisuraPrefill(analyzeRes.visura_data);
      }

      // Phase 3b: Verifica eligibility
      const verifyRes = await verifyEligibility({
        dati_azienda: company,
        parametri_finanziari: analyzeRes.parametri_finanziari,
        scheda_bando: analyzeRes.scheda,
        deep_scan: (analyzeRes.deep_scan || {}) as any,
      });
      setVerifyResult(verifyRes);
      setCompanyData(company);
      setStep("results");
      setCurrentAnalysisId("result");
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Errore durante l'analisi");
      setStep("form");
    } finally {
      setLoading(false);
    }
  }, [bandoFile]);

  const handleNewAnalysis = useCallback(() => {
    setStep("upload");
    setBandoFile(null);
    setVisuraPrefill(undefined);
    setAnalyzeResult(null);
    setVerifyResult(null);
    setCompanyData(null);
    setError("");
    setCurrentAnalysisId(null);
  }, []);

  return (
    <div className="flex h-screen bg-night">
      <Sidebar
        activeId={currentAnalysisId}
        onNewAnalysis={handleNewAnalysis}
        onSelectAnalysis={(id) => setCurrentAnalysisId(id)}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8 space-y-8 animate-fade-in">
          {/* Status Dashboard */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {step === "upload"
                  ? "Nuova Analisi"
                  : step === "form"
                  ? "Dati Azienda"
                  : step === "loading"
                  ? "Elaborazione in corso"
                  : "Risultati Analisi"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {step === "upload"
                  ? "Carica il bando PDF per iniziare"
                  : step === "form"
                  ? "Completa i dati dell'azienda e clicca Analizza Bando"
                  : step === "loading"
                  ? "GrantFlow AI sta elaborando il bando e i dati aziendali"
                  : "Report completo di eligibilità e documenti generati"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="glass rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">Crediti Residui</p>
                <p className="text-lg font-bold text-white mt-0.5">42</p>
              </div>
              <div className="glass rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">Status Database</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
                  <span className="text-sm font-medium text-emerald-400">Online</span>
                </div>
              </div>
              <div className="glass rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">Analisi Mensili</p>
                <p className="text-lg font-bold text-white mt-0.5">18</p>
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`flex items-center gap-1.5 ${step === "upload" || step === "form" || step === "loading" || step === "results" ? "text-emerald-400" : "text-gray-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${step === "upload" ? "bg-emerald-500" : "bg-emerald-500/50"}`} />
              Bando
            </span>
            <span className="text-gray-700">—</span>
            <span className={`flex items-center gap-1.5 ${step === "form" || step === "loading" || step === "results" ? "text-emerald-400" : "text-gray-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${step === "form" ? "bg-emerald-500" : step === "loading" || step === "results" ? "bg-emerald-500/50" : "bg-gray-700"}`} />
              Azienda
            </span>
            <span className="text-gray-700">—</span>
            <span className={`flex items-center gap-1.5 ${step === "loading" || step === "results" ? "text-emerald-400" : "text-gray-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${step === "loading" ? "bg-emerald-500 animate-pulse-dot" : step === "results" ? "bg-emerald-500" : "bg-gray-700"}`} />
              Report
            </span>
          </div>

          {error && (
            <div className="glass rounded-xl p-4 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Phase 1: Bando Upload */}
          {step === "upload" && (
            <div className="animate-slide-up pt-8">
              <UploadBando onFileSelected={handleBandoSelected} />
            </div>
          )}

          {/* Phase 2: Company Profiling + Visura */}
          {step === "form" && (
            <div className="animate-slide-up">
              <CompanyForm
                visuraPrefill={visuraPrefill}
                onAnalyze={handleFormSubmit}
                loading={loading}
              />
            </div>
          )}

          {/* Phase 3: Loading / Elaboration */}
          {step === "loading" && (
            <div className="pt-12">
              <LoadingProgress />
            </div>
          )}

          {/* Phase 4: Results */}
          {step === "results" && verifyResult && companyData && (
            <div className="animate-slide-up">
              <ResultsView response={verifyResult} azienda={companyData} deepScan={analyzeResult?.deep_scan as any} />
            </div>
          )}

          {/* Latest Completed Analyses (only on upload step) */}
          {step === "upload" && recentAnalyses.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/[0.04]">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-[0.1em]">Ultime Analisi Completate</h3>
              <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {recentAnalyses.map((a, i) => (
                      <tr key={a.id} className={i !== recentAnalyses.length - 1 ? "border-b border-white/[0.04]" : ""}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                              <span className="text-xs font-bold text-emerald-400/70">{a.nome_azienda?.charAt(0)?.toUpperCase() || "?"}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-200">{a.nome_azienda}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">
                          {new Date(a.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Completato
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
