"use client";

import { useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import UploadBando from "@/components/UploadBando";
import CompanyForm from "@/components/CompanyForm";
import LoadingProgress from "@/components/LoadingProgress";
import ResultsView from "@/components/ResultsView";
import SaveModal from "@/components/SaveModal";
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
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const resetAnalysis = useCallback(() => {
    setStep("upload");
    setBandoFile(null);
    setBandoInfo(null);
    setVisuraPrefill(undefined);
    setAnalyzeResult(null);
    setVerifyResult(null);
    setCompanyData(null);
    setError("");
    setCurrentAnalysisId(null);
    setShowSaveModal(false);
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
      if (data.visuraFile) {
        const enrichResult = await enrichVisura(data.visuraFile);
        if (enrichResult.visura_data) {
          setVisuraPrefill(enrichResult.visura_data);
        }
      }

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

  const handleSaveAnalysis = useCallback(async (name: string) => {
    const snapshot = { analyzeResult, verifyResult, companyData, bandoInfo };
    const tempId = `local_${Date.now()}`;

    // 1. Optimistic: show in sidebar immediately
    const optimistic: Analysis = {
      id: tempId,
      user_id: "anonymous",
      name,
      data: snapshot,
      created_at: new Date().toISOString(),
      is_pinned: false,
    };
    setAnalyses((prev) => [optimistic, ...prev]);
    setCurrentAnalysisId(tempId);

    // 2. Attempt Supabase save (may fail if schema mismatch)
    try {
      const { data, error } = await supabase
        .from("analyses")
        .insert({ user_id: "anonymous", name, data: snapshot, is_pinned: false })
        .select()
        .single();

      if (!error && data) {
        // Replace temp entry with real server record
        setAnalyses((prev) => prev.map((a) => (a.id === tempId ? (data as Analysis) : a)));
        setCurrentAnalysisId(data.id);
        setRefreshKey((k) => k + 1);
      } else if (error) {
        console.error("Supabase save failed:", error.message);
      }
    } catch (err) {
      console.error("Supabase save threw:", err);
    }

    resetAnalysis();
  }, [analyzeResult, verifyResult, companyData, bandoInfo, resetAnalysis]);

  const handleNewAnalysis = useCallback(() => {
    if (step === "results" && companyData && verifyResult) {
      setShowSaveModal(true);
      return;
    }
    resetAnalysis();
  }, [step, companyData, verifyResult, resetAnalysis]);

  const handleDiscardAnalysis = useCallback(() => {
    resetAnalysis();
  }, [resetAnalysis]);

  const defaultAnalysisName = companyData
    ? `Analisi ${companyData.ragione_sociale} - ${new Date().toLocaleDateString("it-IT")}`
    : `Analisi ${new Date().toLocaleDateString("it-IT")}`;

  return (
    <div className="flex h-screen bg-night">
      <Sidebar
        activeId={currentAnalysisId}
        onNewAnalysis={handleNewAnalysis}
        analyses={analyses}
        onAnalysesChange={setAnalyses}
        refreshKey={refreshKey}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8 space-y-8 animate-fade-in">
          {/* Header */}
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

              {/* Save / Nuova Analisi buttons */}
              <div className="mt-8 flex items-center justify-between p-5 glass rounded-2xl">
                <div>
                  <p className="text-sm font-medium text-white">Analisi completata</p>
                  <p className="text-xs text-gray-500 mt-0.5">Salva questa analisi nello storico o avvia una nuova analisi</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleNewAnalysis}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-900/20"
                  >
                    Nuova Analisi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Save Modal */}
      {showSaveModal && (
        <SaveModal
          defaultName={defaultAnalysisName}
          onSave={handleSaveAnalysis}
          onDiscard={handleDiscardAnalysis}
        />
      )}
    </div>
  );
}
