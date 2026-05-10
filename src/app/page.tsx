"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";
import UploadZone from "@/components/UploadZone";
import CompanyForm from "@/components/CompanyForm";
import ResultsView from "@/components/ResultsView";
import { analyzeBando, verifyEligibility } from "@/lib/api";
import { useAnalyses } from "@/hooks/useAnalyses";
import type { AnalyzeResponse, VerifyResponse, CompanyData, AppStep } from "@/types";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { saveAnalysis } = useAnalyses();

  const [step, setStep] = useState<AppStep>("upload");
  const [bandoFile, setBandoFile] = useState<File | null>(null);
  const [visuraPrefill, setVisuraPrefill] = useState<{ ragione_sociale?: string; ateco?: string } | undefined>();
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

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
      });
      setVerifyResult(result);
      setCompanyData(company);
      setStep("results");

      const statoMatch = result.eligibility.match(/CLASSIFICAZIONE FINALE:\s*\[?(\w+)\]?/i);
      const probMatch = result.eligibility.match(/PROBABILITÀ\s*APPROVAZIONE\s*[:\-]?\s*(\d+)/i);

      const saved = await saveAnalysis({
        nome_azienda: data.ragione_sociale,
        esito_analisi: statoMatch?.[1]?.toUpperCase() ?? "N/D",
        probabilita: probMatch ? parseInt(probMatch[1]) : undefined,
        ateco: data.ateco,
        investimento: data.investimento || undefined,
        scheda_bando: analyzeResult.scheda,
        eligibility: result.eligibility,
        business_plan: result.business_plan,
        parametri_finanziari: analyzeResult.parametri_finanziari,
        calcolo_finanziario: result.calcolo_finanziario,
      });
      setCurrentAnalysisId(saved.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Errore verifica eligibility");
    } finally {
      setLoading(false);
    }
  }, [analyzeResult, saveAnalysis]);

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

  if (authLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-400">Caricamento...</p></div>;
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar
        activeId={currentAnalysisId}
        onNewAnalysis={handleNewAnalysis}
        onSelectAnalysis={(id) => {
          setCurrentAnalysisId(id);
        }}
      />

      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}

        {step === "upload" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">Nuova Analisi</h2>
            <p className="text-gray-400">Carica il bando PDF per iniziare l'analisi.</p>
            <UploadZone onFileSelected={handleFileSelected} onVisuraSelected={handleVisuraSelected} />
            {bandoFile && (
              <button
                onClick={handleStartAnalysis}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition-colors"
              >
                {loading ? "Analisi in corso..." : "📄 Analizza Bando"}
              </button>
            )}
          </div>
        )}

        {step === "form" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">Dati Azienda</h2>
            <p className="text-gray-400">Inserisci i dati dell'azienda per la verifica di eligibility.</p>
            <CompanyForm visuraPrefill={visuraPrefill} onAnalyze={handleFormSubmit} loading={loading} />
          </div>
        )}

        {step === "results" && verifyResult && companyData && (
          <div className="max-w-4xl mx-auto">
            <ResultsView response={verifyResult} azienda={companyData} />
          </div>
        )}
      </main>
    </div>
  );
}
