"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import UploadBando from "@/components/UploadBando";
import CompanyForm from "@/components/CompanyForm";
import LoadingProgress from "@/components/LoadingProgress";
import ResultsView from "@/components/ResultsView";
import { analyzeBando, verifyEligibility, enrichVisura } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { AnalyzeResponse, VerifyResponse, CompanyData, Analysis } from "@/types";

type AppStep = "upload" | "form" | "loading" | "results";

export default function Home() {
  const [step, setStep] = useState<AppStep>("upload");
  const [bandoFile, setBandoFile] = useState<File | null>(null);
  const [bandoInfo, setBandoInfo] = useState<{ nome: string; ente: string } | null>(null);
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

  const handleBandoSelected = useCallback(async (file: File) => {
    setBandoFile(file);
    setError("");

    try {
      const result = await analyzeBando(file);
      setBandoInfo({
        nome: result.nome_bando || result.nome || "Bando caricato",
        ente: result.ente_erogatore || result.ente || "Ente identificato",
      });
      setAnalyzeResult(result);
      if (result.visura_data) {
        setVisuraPrefill(result.visura_data);
      }
    } catch {
      setBandoInfo({ nome: file.name, ente: "Ente in fase di identificazione" });
    }

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
      // Enrich with visura if provided
      let visuraText = "";
      if (data.visuraFile) {
        const enrichResult = await enrichVisura(data.visuraFile);
        if (enrichResult.visura_data) {
          setVisuraPrefill(enrichResult.visura_data);
        }
      }

      // Full analysis (re-analyze if needed)
      const analyzeRes = analyzeResult || await analyzeBando(bandoFile);
      if (!analyzeResult) setAnalyzeResult(analyzeRes);

      const verifyRes = await verifyEligibility({
        dati_azienda: company,
        parametri_finanziari: analyzeRes.parametri_finanziari,
        scheda_bando: analyzeRes.scheda || analyzeRes.testo_estratto || "",
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
  }, [bandoFile, analyzeResult]);

  const handleNewAnalysis = useCallback(() => {
    setStep("upload");
    setBandoFile(null);
    setBandoInfo(null);
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
                {step === "upload" ? "Nuova Analisi" :
                 step === "form" ? "Profilazione Azienda" :
                 step === "loading" ? "Elaborazione in corso" : "Risultati Analisi"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {step === "upload" ? "Carica il bando PDF per iniziare" :
                 step === "form" ? "Completa i dati azienda e carica documenti integrativi" :
                 step === "loading" ? "GrantFlow AI sta analizzando bando e requisiti" :
                 "Report completo e documenti generati"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="glass rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">Crediti Residui</p>
                <p className="text-lg font-bold text-white mt-0.5">42</p>
              </div>
              <div className="glass rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">Status DB</p>
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
          <div className="flex items-center gap-3 text-xs">
            {[
              { label: "Bando", active: step === "upload" || step === "form" || step === "loading" || step === "results",
                current: step === "upload" },
              { label: "Azienda", active: step === "form" || step === "loading" || step === "results",
                current: step === "form" },
              { label: "Report", active: step === "loading" || step === "results",
                current: step === "loading" },
              { label: "Export", active: step === "results", current: step === "results" },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 ${s.active ? "text-emerald-400" : "text-gray-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.current ? "bg-emerald-500" : s.active ? "bg-emerald-500/50" : "bg-gray-700"}`} />
                  {s.label}
                </div>
                {i < 3 && <span className="text-gray-700">—</span>}
              </div>
            ))}
          </div>

          {error && (
            <div className="glass rounded-xl p-4 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Phase 1: Upload Bando */}
          {step === "upload" && (
            <div className="animate-slide-up pt-8">
              <UploadBando onFileSelected={handleBandoSelected} />
            </div>
          )}

          {/* Phase 2: Profilazione */}
          {step === "form" && (
            <div className="animate-slide-up space-y-6">
              {bandoInfo && (
                <div className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{bandoInfo.nome}</p>
                    <p className="text-xs text-gray-500">{bandoInfo.ente}</p>
                  </div>
                  <button
                    onClick={handleNewAnalysis}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                  >
                    Cambia bando
                  </button>
                </div>
              )}
              <CompanyForm
                visuraPrefill={visuraPrefill}
                onAnalyze={handleFormSubmit}
                loading={loading}
              />
            </div>
          )}

          {/* Phase 3: Elaborazione */}
          {step === "loading" && (
            <div className="pt-12">
              <LoadingProgress />
            </div>
          )}

          {/* Phase 4: Risultati */}
          {step === "results" && verifyResult && companyData && (
            <div className="animate-slide-up">
              <ResultsView response={verifyResult} azienda={companyData} deepScan={analyzeResult?.deep_scan as any} />
            </div>
          )}

          {/* Latest Analyses (only on upload step) */}
          {step === "upload" && recentAnalyses.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/[0.04]">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-[0.1em]">Ultime Analisi</h3>
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
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-500/10">
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
