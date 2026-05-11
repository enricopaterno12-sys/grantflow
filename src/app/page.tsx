"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import UploadZone from "@/components/UploadZone";
import CompanyForm from "@/components/CompanyForm";
import ResultsView from "@/components/ResultsView";
import { analyzeBando, verifyEligibility } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { AnalyzeResponse, VerifyResponse, CompanyData, Analysis } from "@/types";

type AppStep = "upload" | "form" | "results";

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

  const handleFileSelected = useCallback((file: File) => {
    setBandoFile(file);
  }, []);

  const handleVisuraSelected = useCallback(async (file: File) => {
    try {
      const result = await analyzeBando(file);
      if (result.visura_data) {
        setVisuraPrefill(result.visura_data);
      }
    } catch {
      // visura extraction failed silently
    }
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (!bandoFile) return;
    setLoading(true);
    setError("");
    try {
      const result = await analyzeBando(bandoFile);
      setAnalyzeResult(result);
      if (result.visura_data) {
        setVisuraPrefill(result.visura_data);
      }
      setStep("form");
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Errore analisi bando");
    } finally {
      setLoading(false);
    }
  }, [bandoFile]);

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
  }) => {
    if (!analyzeResult) return;
    setLoading(true);
    setError("");

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
      const result = await verifyEligibility({
        dati_azienda: company,
        parametri_finanziari: analyzeResult.parametri_finanziari,
        scheda_bando: analyzeResult.scheda,
        deep_scan: (analyzeResult.deep_scan || {}) as any,
      });
      setVerifyResult(result);
      setCompanyData(company);
      setStep("results");
      setCurrentAnalysisId("result");
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Errore verifica eligibility");
    } finally {
      setLoading(false);
    }
  }, [analyzeResult]);

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
        onSelectAnalysis={(id) => {
          setCurrentAnalysisId(id);
        }}
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
                  : "Risultati Analisi"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {step === "upload"
                  ? "Carica il bando PDF per iniziare l'analisi"
                  : step === "form"
                  ? "Inserisci i dati dell'azienda per la verifica di eligibility"
                  : "Report completo di eligibilità e business plan"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="glass rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  Crediti Residui
                </p>
                <p className="text-lg font-bold text-white mt-0.5">42</p>
              </div>
              <div className="glass rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  Status Database
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
                  <span className="text-sm font-medium text-emerald-400">Online</span>
                </div>
              </div>
              <div className="glass rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  Analisi Mensili
                </p>
                <p className="text-lg font-bold text-white mt-0.5">18</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="glass rounded-xl p-4 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Upload Step */}
          {step === "upload" && (
            <div className="space-y-6 animate-slide-up">
              <UploadZone
                onFileSelected={handleFileSelected}
                onVisuraSelected={handleVisuraSelected}
              />
              {bandoFile && (
                <button
                  onClick={handleStartAnalysis}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white font-medium rounded-xl transition-all duration-300 shadow-lg shadow-emerald-900/20 disabled:shadow-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analisi in corso...
                    </span>
                  ) : (
                    "Analizza Bando"
                  )}
                </button>
              )}
            </div>
          )}

          {/* Form Step */}
          {step === "form" && (
            <div className="animate-slide-up">
              <CompanyForm
                visuraPrefill={visuraPrefill}
                onAnalyze={handleFormSubmit}
                loading={loading}
              />
            </div>
          )}

          {/* Results Step */}
          {step === "results" && verifyResult && companyData && (
            <div className="animate-slide-up">
              <ResultsView response={verifyResult} azienda={companyData} deepScan={analyzeResult?.deep_scan as any} />
            </div>
          )}

          {/* Latest Completed Analyses */}
          {step === "upload" && recentAnalyses.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/[0.04]">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-[0.1em]">
                Ultime Analisi Completate
              </h3>
              <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {recentAnalyses.map((a, i) => (
                      <tr
                        key={a.id}
                        className={`${
                          i !== recentAnalyses.length - 1
                            ? "border-b border-white/[0.04]"
                            : ""
                        } hover:bg-white/[0.02] transition-colors`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                              <span className="text-xs font-bold text-emerald-400/70">
                                {a.nome_azienda?.charAt(0)?.toUpperCase() || "?"}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-200">
                              {a.nome_azienda}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">
                          {new Date(a.created_at).toLocaleDateString("it-IT", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
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
