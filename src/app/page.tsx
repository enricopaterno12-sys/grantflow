"use client";

import { useState, useCallback, useRef } from "react";
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
  const [loadingHistory, setLoadingHistory] = useState(false);
  const analyzePromiseRef = useRef<Promise<AnalyzeResponse> | null>(null);

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
    setBandoInfo({ nome: file.name, ente: "Analisi in corso..." });
    setStep("form");

    analyzePromiseRef.current = analyzeBando(file)
      .then((result) => {
        setAnalyzeResult(result);
        setBandoInfo({
          nome: result.nome_bando || result.nome || file.name,
          ente: result.ente_erogatore || result.ente || "Ente identificato",
        });
        if (result.visura_data) setVisuraPrefill(result.visura_data);
        return result;
      })
      .catch((err) => {
        setBandoInfo({ nome: file.name, ente: "Ente in fase di identificazione" });
        throw err;
      }) as Promise<AnalyzeResponse>;
  }, []);

  const handleFormSubmit = useCallback(async (data: {
    ragione_sociale: string; ateco: string; dimensione: string; regione: string;
    fatturato: number; dipendenti: number; data_costituzione: string;
    investimento: number; finanziamento_richiesto: number; visuraFile?: File | null;
    forma_giuridica: string; partita_iva: string; codice_fiscale: string;
    sede_legale: string; pec: string;
    utile_netto: number; debiti_finanziari: number; patrimonio_netto: number;
    de_minimis_importo: number; de_minimis_regime: string;
    descrizione_progetto: string; categoria_spesa: string;
    procedure_concorsuali: boolean;
  }) => {
    if (!bandoFile) return;
    setLoading(true);
    setError("");
    setStep("loading");

    const company: CompanyData = {
      ragione_sociale: data.ragione_sociale, ateco: data.ateco,
      dimensione: data.dimensione || undefined, regione: data.regione || undefined,
      fatturato: data.fatturato || undefined, dipendenti: data.dipendenti || undefined,
      data_costituzione: data.data_costituzione || undefined,
      investimento: data.investimento || undefined,
      finanziamento_richiesto: data.finanziamento_richiesto || undefined,
      forma_giuridica: data.forma_giuridica || undefined,
      partita_iva: data.partita_iva || undefined,
      codice_fiscale: data.codice_fiscale || undefined,
      sede_legale: data.sede_legale || undefined,
      pec: data.pec || undefined,
      utile_netto: data.utile_netto || undefined,
      debiti_finanziari: data.debiti_finanziari || undefined,
      patrimonio_netto: data.patrimonio_netto || undefined,
      de_minimis_importo: data.de_minimis_importo || undefined,
      de_minimis_regime: data.de_minimis_regime || undefined,
      descrizione_progetto: data.descrizione_progetto || undefined,
      categoria_spesa: data.categoria_spesa || undefined,
      procedure_concorsuali: data.procedure_concorsuali || undefined,
    };

    try {
      if (data.visuraFile) {
        const enrichResult = await enrichVisura(data.visuraFile);
        if (enrichResult.visura_data) setVisuraPrefill(enrichResult.visura_data);
      }

      let analyzeRes = analyzeResult;
      if (!analyzeRes) {
        try {
          analyzeRes = analyzePromiseRef.current ? await analyzePromiseRef.current : await analyzeBando(bandoFile);
        } catch {
          analyzeRes = await analyzeBando(bandoFile);
        }
        if (!analyzeRes) throw new Error("Analisi bando fallita");
        setAnalyzeResult(analyzeRes);
      }

      const verifyRes = await verifyEligibility({
        dati_azienda: company,
        parametri_finanziari: analyzeRes.parametri_finanziari,
        scheda_bando: analyzeRes.riepilogo || analyzeRes.scheda || analyzeRes.testo_estratto || "",
        deep_scan: (analyzeRes.deep_scan || {}) as any,
      });

      setVerifyResult(verifyRes);
      setCompanyData(company);
      setCurrentAnalysisId("result");

      // Brief pause to show 100% completion on loading screen
      setLoading(false);
      await new Promise((r) => setTimeout(r, 700));
      setStep("results");
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Errore durante l'analisi");
      setStep("form");
      setLoading(false);
    }
  }, [bandoFile, analyzeResult]);

  const handleSaveAnalysis = useCallback(async (name: string, tag?: string) => {
    const snapshot = { analyzeResult, verifyResult, companyData, bandoInfo, tag };
    const tempId = `local_${Date.now()}`;

    const optimistic: Analysis = {
      id: tempId, user_id: "anonymous", name,
      data: snapshot, created_at: new Date().toISOString(), is_pinned: false,
    };
    setAnalyses((prev) => [optimistic, ...prev]);
    setCurrentAnalysisId(tempId);

    try {
      const { data, error } = await supabase
        .from("analyses")
        .insert({ user_id: "anonymous", name, data: snapshot, is_pinned: false })
        .select().single();

      if (!error && data) {
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

  const handleSelectAnalysis = useCallback(async (id: string) => {
    setLoadingHistory(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) throw new Error(error?.message || "Analisi non trovata");

      const snap = (data as Analysis).data as Record<string, unknown>;
      const savedVerify = snap?.verifyResult as VerifyResponse | undefined;
      const savedCompany = snap?.companyData as CompanyData | undefined;
      const savedAnalyze = snap?.analyzeResult as AnalyzeResponse | undefined;
      const savedBandoInfo = snap?.bandoInfo as { nome: string; ente: string } | undefined;

      if (!savedVerify || !savedCompany) {
        throw new Error("Dati analisi incompleti o formato non valido");
      }

      setVerifyResult(savedVerify);
      setCompanyData(savedCompany);
      setAnalyzeResult(savedAnalyze || null);
      setBandoInfo(savedBandoInfo || null);
      setCurrentAnalysisId(id);

      await new Promise((r) => setTimeout(r, 400));
      setStep("results");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore caricamento analisi";
      setError(msg);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

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
        onSelectAnalysis={handleSelectAnalysis}
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

          {/* Step indicator (P2) */}
          <div className="flex items-center gap-3 text-xs">
            {[
              { label: "Bando", current: step === "upload" },
              { label: "Azienda", current: step === "form" },
              { label: "Report", current: step === "loading" },
              { label: "Export", current: step === "results" },
            ].map((s, i) => {
              const steps = ["upload", "form", "loading", "results"];
              const idx = steps.indexOf(step);
              const active = i === idx;
              const done = i < idx;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 ${active ? "text-emerald-400" : done ? "text-emerald-400/60" : "text-gray-500"}`}>
                    <span className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      active ? "bg-emerald-500 shadow-[0_0_6px_#00c896]" :
                      done ? "bg-emerald-500" : "bg-[#444]"
                    }`} />
                    <span className={`${active ? "font-semibold" : "font-normal"} transition-all`}>{s.label}</span>
                  </div>
                  {i < 3 && (
                    <span className={`w-6 h-px transition-colors duration-300 ${done || active ? "bg-emerald-500/50" : "bg-white/[0.06]"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {loadingHistory && (
            <div className="flex items-center justify-center py-20 animate-fade-in">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-emerald-400 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Caricamento analisi in corso...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="glass rounded-xl p-4 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Loading history — hide everything else */}
          {!loadingHistory && step === "upload" && (
            <div className="animate-slide-up pt-8">
              <UploadBando onFileSelected={handleBandoSelected} />
            </div>
          )}

          {!loadingHistory && step === "form" && (
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
                  <button onClick={handleNewAnalysis} className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">Cambia bando</button>
                </div>
              )}
              <CompanyForm
                visuraPrefill={visuraPrefill}
                parametriFinanziari={analyzeResult?.parametri_finanziari}
                regimeBando={analyzeResult?.deep_scan?.regimi_aiuto?.[0]?.tipo?.toLowerCase()}
                onAnalyze={handleFormSubmit}
                loading={loading}
              />
            </div>
          )}

          {!loadingHistory && step === "loading" && (
            <div className="pt-12">
              <LoadingProgress isLoading={loading} />
            </div>
          )}

          {!loadingHistory && step === "results" && verifyResult && companyData && (
            <div className="animate-slide-up">
              <ResultsView response={verifyResult} azienda={companyData} deepScan={analyzeResult?.deep_scan as any} />
              <div className="mt-8 flex items-center justify-between p-5 glass rounded-2xl">
                <div>
                  <p className="text-sm font-medium text-white">Analisi completata</p>
                  <p className="text-xs text-gray-500 mt-0.5">Salva questa analisi nello storico o avvia una nuova analisi</p>
                </div>
                <button onClick={handleNewAnalysis}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-900/20">
                  Nuova Analisi
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Save Modal (P8) */}
      {showSaveModal && (
        <SaveModal
          defaultName={defaultAnalysisName}
          ragioneSociale={companyData?.ragione_sociale}
          nomeBando={bandoInfo?.nome}
          onSave={handleSaveAnalysis}
          onDiscard={handleDiscardAnalysis}
        />
      )}
    </div>
  );
}
