"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Building, AlertCircle, Scan, CheckCircle2, Loader2 } from "lucide-react";
import DarkSelect from "./DarkSelect";
import { enrichVisura } from "@/lib/api";
import type { ParametriFinanziari } from "@/types";

interface Props {
  visuraPrefill?: { ragione_sociale?: string; ateco?: string };
  parametriFinanziari?: ParametriFinanziari;
  regimeBando?: string;
  onAnalyze: (data: {
    ragione_sociale: string; ateco: string; dimensione: string; regione: string;
    fatturato: number; dipendenti: number; data_costituzione: string;
    investimento: number; finanziamento_richiesto: number;
    forma_giuridica: string; partita_iva: string; codice_fiscale: string;
    sede_legale: string; pec: string;
    utile_netto: number; debiti_finanziari: number; patrimonio_netto: number;
    de_minimis_importo: number; de_minimis_regime: string;
    descrizione_progetto: string; categoria_spesa: string;
    procedure_concorsuali: boolean;
    custom_prompt?: string;
  }) => void;
  loading: boolean;
}

const REQUIRED_FIELDS = [
  "ragione_sociale", "ateco", "regione", "forma_giuridica", "partita_iva",
  "fatturato", "dipendenti", "investimento", "finanziamento_richiesto",
  "descrizione_progetto", "sede_legale", "data_costituzione", "dimensione",
] as const;

const inputClass = "w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all duration-200 text-sm";
const orangeInputClass = "w-full px-3.5 py-2.5 bg-white/[0.04] border border-orange-500/50 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/60 transition-all duration-200 text-sm";
const errorInputClass = "w-full px-3.5 py-2.5 bg-white/[0.04] border border-red-500/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/40 transition-all duration-200 text-sm";
const labelClass = "block text-sm font-medium text-gray-400 mb-1.5";

const FIELD_LABELS: Record<string, string> = {
  ragione_sociale: "Ragione Sociale", ateco: "Codice ATECO", regione: "Regione",
  forma_giuridica: "Forma Giuridica", partita_iva: "Partita IVA",
  fatturato: "Fatturato", dipendenti: "Dipendenti",
  investimento: "Investimento", finanziamento_richiesto: "Finanziamento Richiesto",
  descrizione_progetto: "Descrizione Progetto", sede_legale: "Sede Legale",
  data_costituzione: "Data Costituzione", dimensione: "Dimensione",
};

export default function CompanyForm({ visuraPrefill, parametriFinanziari, regimeBando, onAnalyze, loading }: Props) {
  const [form, setForm] = useState({
    ragione_sociale: visuraPrefill?.ragione_sociale || "", ateco: visuraPrefill?.ateco || "",
    dimensione: "", regione: "", fatturato: 0, dipendenti: 0, data_costituzione: "",
    investimento: 0, finanziamento_richiesto: 0,
    forma_giuridica: "", partita_iva: "", codice_fiscale: "", sede_legale: "", pec: "",
    utile_netto: 0, debiti_finanziari: 0, patrimonio_netto: 0,
    de_minimis_importo: 0, de_minimis_regime: "",
    descrizione_progetto: "", categoria_spesa: "", procedure_concorsuali: false,
  });
  const [companyDocFile, setCompanyDocFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionDone, setExtractionDone] = useState(false);
  const [extractionError, setExtractionError] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const emptyRequiredAfterExtraction = useMemo(() => {
    if (!extractionDone) return new Set<string>();
    const empty = new Set<string>();
    for (const field of REQUIRED_FIELDS) {
      const val = form[field as keyof typeof form];
      if (val === "" || val === 0 || val === false) empty.add(field);
    }
    return empty;
  }, [extractionDone, form]);

  const isSubmitDisabled = loading || (extractionDone && emptyRequiredAfterExtraction.size > 0);

  const handleChange = (field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (submitted && value) setErrors((prev) => ({ ...prev, [field]: false }));
  };

  const getInputClass = (field: string) => {
    if (errors[field]) return errorInputClass;
    if (emptyRequiredAfterExtraction.has(field)) return orangeInputClass;
    return inputClass;
  };

  const handleCompanyDocDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setCompanyDocFile(file);
    setExtracting(true);
    setExtractionError("");
    setExtractionDone(false);
    try {
      const result = await enrichVisura(file);
      setExtractedData(result);
    } catch (err: any) {
      setExtractionError(err.response?.data?.detail || err.message || "Errore estrazione dati");
      setExtracting(false);
    }
  }, []);

  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!extractedData) return;
    const entries = Object.entries(extractedData).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    );
    entries.forEach(([key, value], idx) => {
      setTimeout(() => {
        setForm((prev) => ({ ...prev, [key]: value }));
      }, idx * 100);
    });
    setTimeout(() => {
      setExtracting(false);
      setExtractionDone(true);
    }, entries.length * 100 + 300);
  }, [extractedData]);

  const companyDocDrop = useDropzone({
    onDrop: handleCompanyDocDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    multiple: false,
    disabled: extracting,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs: Record<string, boolean> = {};
    if (!form.ragione_sociale.trim()) errs.ragione_sociale = true;
    if (!form.ateco.trim()) errs.ateco = true;
    if (!form.regione.trim()) errs.regione = true;
    if (!form.forma_giuridica.trim()) errs.forma_giuridica = true;
    if (!form.partita_iva.trim()) errs.partita_iva = true;
    if (form.fatturato <= 0) errs.fatturato = true;
    if (form.dipendenti <= 0) errs.dipendenti = true;
    if (form.investimento <= 0) errs.investimento = true;
    if (form.finanziamento_richiesto <= 0) errs.finanziamento_richiesto = true;
    if (!form.descrizione_progetto.trim()) errs.descrizione_progetto = true;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onAnalyze({ ...form, custom_prompt: customPrompt || undefined });
  };

  const selectClass = inputClass;
  const rangeMin = parametriFinanziari?.limite_min_investimento;
  const rangeMax = parametriFinanziari?.limite_max_investimento;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
      {/* ── SEZIONE 0: Documento Azienda (upload dedicato) ── */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Scan className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Documento Azienda</h3>
            <p className="text-xs text-gray-500">Carica Visura Camerale o Scheda Azienda per auto-compilazione</p>
          </div>
        </div>

        {extracting ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-300">L'IA sta estraendo i dati dal documento...</p>
            <div className="mt-4 w-full max-w-xs mx-auto bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          </div>
        ) : extractionDone && !extractionError ? (
          <div className="p-5 rounded-xl bg-emerald-900/10 border border-emerald-500/10 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-emerald-400 font-medium">Dati estratti con successo</p>
            <p className="text-xs text-gray-500 mt-1">Verifica e modifica manualmente se necessario</p>
          </div>
        ) : extractionError ? (
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/20 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-300">{extractionError}</p>
            <p className="text-xs text-gray-500 mt-2">Inserisci i dati manualmente o riprova</p>
          </div>
        ) : null}

        <div
          {...companyDocDrop.getRootProps()}
          className={`mt-3 group relative cursor-pointer p-8 text-center transition-all duration-300 rounded-2xl border-2 border-dashed ${
            companyDocDrop.isDragActive
              ? "border-emerald-500/50 bg-emerald-500/5"
              : companyDocFile
              ? "border-emerald-500/20 bg-emerald-500/[0.02]"
              : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
          } ${extracting ? "pointer-events-none opacity-50" : ""}`}
        >
          <input {...companyDocDrop.getInputProps()} />
          {companyDocFile && !extracting ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-medium text-white">{companyDocFile.name}</p>
              <p className="text-xs text-gray-500">{(companyDocFile.size / 1024).toFixed(0)} KB — Rilascia un altro file per sostituire</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-gray-500 group-hover:text-gray-400 transition-colors" />
              <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                Trascina qui Visura Camerale o Scheda Azienda
              </p>
              <p className="text-xs text-gray-600">PDF o TXT — l'IA estrarrà automaticamente i dati</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sezione A: Dati Anagrafici ── */}
      <div className="glass rounded-2xl p-6 overflow-visible">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Building className="w-4 h-4 text-emerald-400" /></div>
          <div>
            <h3 className="text-sm font-semibold text-white">Dati Anagrafici</h3>
            <p className="text-xs text-gray-500">Informazioni sull&apos;impresa richiedente</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>Ragione Sociale <span className="text-red-400">*</span></label>
            <input type="text" value={form.ragione_sociale} onChange={(e) => handleChange("ragione_sociale", e.target.value)} placeholder="Mia Impresa Srl" className={getInputClass("ragione_sociale")} />
            {emptyRequiredAfterExtraction.has("ragione_sociale") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.ragione_sociale}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div>
            <label className={labelClass}>Codice ATECO <span className="text-red-400">*</span></label>
            <input type="text" value={form.ateco} onChange={(e) => handleChange("ateco", e.target.value)} placeholder="62.01" className={getInputClass("ateco")} />
            <p className="text-[11px] text-gray-600 mt-1">Formato: XX.XX.XX — es. 62.01.09</p>
            {emptyRequiredAfterExtraction.has("ateco") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.ateco}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div>
            <label className={labelClass}>Dimensione <span className="text-red-400">*</span></label>
            <DarkSelect value={form.dimensione} onChange={(v) => handleChange("dimensione", v)} options={[
              { value: "Micro (0-9)", label: "Micro (0-9)" }, { value: "Piccola (10-49)", label: "Piccola (10-49)" },
              { value: "Media (50-249)", label: "Media (50-249)" }, { value: "Grande (250+)", label: "Grande (250+)" },
            ]} placeholder="Seleziona..." />
            {emptyRequiredAfterExtraction.has("dimensione") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.dimensione}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div>
            <label className={labelClass}>Regione <span className="text-red-400">*</span></label>
            <input type="text" value={form.regione} onChange={(e) => handleChange("regione", e.target.value)} placeholder="Puglia" className={getInputClass("regione")} />
            {emptyRequiredAfterExtraction.has("regione") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.regione}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div>
            <label className={labelClass}>Data Costituzione <span className="text-red-400">*</span></label>
            <input type="date" value={form.data_costituzione} onChange={(e) => handleChange("data_costituzione", e.target.value)} className={getInputClass("data_costituzione")} />
            {emptyRequiredAfterExtraction.has("data_costituzione") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.data_costituzione}. Inseriscilo manualmente per procedere.</p>}
          </div>
        </div>
      </div>

      {/* ── Sezione B: Dati Giuridici ── */}
      <div className="glass rounded-2xl p-6 overflow-visible">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Building className="w-4 h-4 text-emerald-400" /></div>
          <div>
            <h3 className="text-sm font-semibold text-white">Dati Giuridici</h3>
            <p className="text-xs text-gray-500">Informazioni legali e fiscali</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>Forma Giuridica <span className="text-red-400">*</span></label>
            <DarkSelect value={form.forma_giuridica} onChange={(v) => handleChange("forma_giuridica", v)} options={[
              { value: "Srl", label: "Srl" }, { value: "Spa", label: "Spa" },
              { value: "Srl Unipersonale", label: "Srl Unipersonale" },
              { value: "Società Cooperativa", label: "Società Cooperativa" },
              { value: "Ditta Individuale", label: "Ditta Individuale" },
              { value: "Snc", label: "Snc" }, { value: "Sas", label: "Sas" },
              { value: "Altro", label: "Altro" },
            ]} placeholder="Seleziona..." />
            {emptyRequiredAfterExtraction.has("forma_giuridica") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.forma_giuridica}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div>
            <label className={labelClass}>Partita IVA <span className="text-red-400">*</span></label>
            <input type="text" value={form.partita_iva} onChange={(e) => handleChange("partita_iva", e.target.value)} placeholder="01234567890" className={getInputClass("partita_iva")} />
            {emptyRequiredAfterExtraction.has("partita_iva") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.partita_iva}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div>
            <label className={labelClass}>Codice Fiscale</label>
            <input type="text" value={form.codice_fiscale} onChange={(e) => handleChange("codice_fiscale", e.target.value)} placeholder="RSSMRA85M01A001X" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sede Legale <span className="text-red-400">*</span></label>
            <input type="text" value={form.sede_legale} onChange={(e) => handleChange("sede_legale", e.target.value)} placeholder="Via Roma 1, Milano" className={getInputClass("sede_legale")} />
            {emptyRequiredAfterExtraction.has("sede_legale") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.sede_legale}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div>
            <label className={labelClass}>PEC</label>
            <input type="text" value={form.pec} onChange={(e) => handleChange("pec", e.target.value)} placeholder="azienda@pec.it" className={inputClass} />
          </div>
        </div>
      </div>

      {/* ── Sezione C: Dati Economico-Finanziari ── */}
      <div className="glass rounded-2xl p-6 overflow-visible">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Building className="w-4 h-4 text-emerald-400" /></div>
          <div>
            <h3 className="text-sm font-semibold text-white">Dati Economico-Finanziari</h3>
            <p className="text-xs text-gray-500">Situazione economica e piano investimenti</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>Fatturato (€) <span className="text-red-400">*</span></label>
            <input type="number" value={form.fatturato || ""} onChange={(e) => handleChange("fatturato", Number(e.target.value))} min={0} placeholder="0" className={getInputClass("fatturato")} />
            {emptyRequiredAfterExtraction.has("fatturato") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.fatturato}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div>
            <label className={labelClass}>Dipendenti <span className="text-red-400">*</span></label>
            <input type="number" value={form.dipendenti || ""} onChange={(e) => handleChange("dipendenti", Number(e.target.value))} min={0} placeholder="0" className={getInputClass("dipendenti")} />
            {emptyRequiredAfterExtraction.has("dipendenti") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.dipendenti}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div>
            <label className={labelClass}>Utile Netto (€)</label>
            <input type="number" value={form.utile_netto || ""} onChange={(e) => handleChange("utile_netto", Number(e.target.value))} min={0} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Debiti Finanziari (€)</label>
            <input type="number" value={form.debiti_finanziari || ""} onChange={(e) => handleChange("debiti_finanziari", Number(e.target.value))} min={0} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Patrimonio Netto (€)</label>
            <input type="number" value={form.patrimonio_netto || ""} onChange={(e) => handleChange("patrimonio_netto", Number(e.target.value))} min={0} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Investimento (€) <span className="text-red-400">*</span></label>
            <input type="number" value={form.investimento || ""} onChange={(e) => handleChange("investimento", Number(e.target.value))} min={0} step={1000} placeholder="0" className={getInputClass("investimento")} />
            {form.investimento > 0 && rangeMin != null && rangeMax != null && (
              <p className="text-[11px] text-emerald-500/70 mt-1">Range ammesso dal bando: €{rangeMin.toLocaleString()} — €{rangeMax.toLocaleString()}</p>
            )}
            {emptyRequiredAfterExtraction.has("investimento") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.investimento}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div>
            <label className={labelClass}>Finanziamento Richiesto (€) <span className="text-red-400">*</span></label>
            <input type="number" value={form.finanziamento_richiesto || ""} onChange={(e) => handleChange("finanziamento_richiesto", Number(e.target.value))} min={0} step={1000} placeholder="0" className={getInputClass("finanziamento_richiesto")} />
            {emptyRequiredAfterExtraction.has("finanziamento_richiesto") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.finanziamento_richiesto}. Inseriscilo manualmente per procedere.</p>}
          </div>
        </div>
      </div>

      {/* ── Sezione D: De Minimis ── */}
      <div className="glass rounded-2xl p-6 overflow-visible">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Building className="w-4 h-4 text-emerald-400" /></div>
          <div>
            <h3 className="text-sm font-semibold text-white">De Minimis</h3>
            <p className="text-xs text-gray-500">Aiuti de minimis già ricevuti</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Importo De Minimis (€)</label>
            <input type="number" value={form.de_minimis_importo || ""} onChange={(e) => handleChange("de_minimis_importo", Number(e.target.value))} min={0} placeholder="0" className={inputClass} />
            <p className="text-[11px] text-gray-600 mt-1">Totale aiuti de minimis ricevuti nell'esercizio in corso e nei due precedenti</p>
          </div>
          <div>
            <label className={labelClass}>Regime De Minimis</label>
            <DarkSelect value={form.de_minimis_regime} onChange={(v) => handleChange("de_minimis_regime", v)} options={[
              { value: "Nessuno", label: "Nessuno" },
              { value: "Reg. UE 1407/2013", label: "Reg. UE 1407/2013" },
              { value: "Reg. UE 1408/2013", label: "Reg. UE 1408/2013 (Servizi di interesse economico generale)" },
              { value: "Reg. UE 717/2014", label: "Reg. UE 717/2014 (Pesca e acquacoltura)" },
              { value: "Reg. UE 2831/2023", label: "Reg. UE 2831/2023 (nuovo)" },
              { value: "Altro", label: "Altro" },
            ]} placeholder="Seleziona..." />
          </div>
        </div>
      </div>

      {/* ── Sezione E: Progetto ── */}
      <div className="glass rounded-2xl p-6 overflow-visible">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Building className="w-4 h-4 text-emerald-400" /></div>
          <div>
            <h3 className="text-sm font-semibold text-white">Dettaglio Progetto</h3>
            <p className="text-xs text-gray-500">Descrizione dell'iniziativa e categoria di spesa</p>
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Descrizione Progetto <span className="text-red-400">*</span></label>
            <textarea value={form.descrizione_progetto} onChange={(e) => handleChange("descrizione_progetto", e.target.value)} placeholder="Descrivi brevemente il progetto oggetto della richiesta di agevolazione..." className={`${getInputClass("descrizione_progetto")} min-h-[100px] resize-y`} />
            {emptyRequiredAfterExtraction.has("descrizione_progetto") && <p className="text-[11px] text-orange-400 mt-1">Dati insufficienti nel documento per il campo {FIELD_LABELS.descrizione_progetto}. Inseriscilo manualmente per procedere.</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Categoria Spesa</label>
              <DarkSelect value={form.categoria_spesa} onChange={(v) => handleChange("categoria_spesa", v)} options={[
                { value: "Software e IT", label: "Software e IT" },
                { value: "Macchinari e Attrezzature", label: "Macchinari e Attrezzature" },
                { value: "Immobili e Opere Edili", label: "Immobili e Opere Edili" },
                { value: "Consulenza e Servizi", label: "Consulenza e Servizi" },
                { value: "Ricerca e Sviluppo", label: "Ricerca e Sviluppo" },
                { value: "Formazione", label: "Formazione" },
                { value: "Altro", label: "Altro" },
              ]} placeholder="Seleziona..." />
            </div>
            <div>
              <label className={labelClass}>Procedure Concorsuali</label>
              <DarkSelect value={form.procedure_concorsuali ? "si" : "no"} onChange={(v) => handleChange("procedure_concorsuali", v === "si")} options={[
                { value: "no", label: "Nessuna procedura in corso" },
                { value: "si", label: "Procedura concorsuale in corso" },
              ]} placeholder="Seleziona..." />
            </div>
          </div>
          {!form.procedure_concorsuali && regimeBando?.includes("de minimis") && (
            <div className="p-4 rounded-xl bg-emerald-900/10 border border-emerald-500/10">
              <p className="text-sm text-emerald-400">Verifica De Minimis necessaria per questo bando — assicurati che l'importo indicato non superi il massimale di €300.000</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sezione F: Prompt Custom ── */}
      <div className="glass rounded-2xl p-6 overflow-visible">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Richieste di Analisi Aggiuntive (Opzionale)</h3>
            <p className="text-xs text-gray-500">Richiesta specifica per l'IA</p>
          </div>
        </div>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={"Inserisci qui una richiesta specifica per l'IA (es. \"Verifica se la spesa X è ammissibile come software 4.0\", \"Analizza in dettaglio il rischio sul cumulo dei contributi\", ecc.)"}
          className={`${inputClass} min-h-[100px] resize-y`}
        />
      </div>

      {/* ── Errori submit ── */}
      {submitted && Object.keys(errors).length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/20 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">Compila i campi obbligatori: {Object.keys(errors).join(", ")}</p>
        </div>
      )}

      {/* ── Avviso campi mancanti dopo estrazione ── */}
      {extractionDone && emptyRequiredAfterExtraction.size > 0 && !submitted && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-orange-900/20 border border-orange-500/20">
          <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-orange-300">Alcuni dati richiesti non sono presenti nel documento caricato:</p>
            <p className="text-xs text-orange-400/80 mt-1">{Array.from(emptyRequiredAfterExtraction).map((f) => FIELD_LABELS[f] || f).join(", ")}</p>
            <p className="text-xs text-gray-500 mt-1">Inseriscili manualmente per procedere con l'analisi.</p>
          </div>
        </div>
      )}

      {/* ── Submit Button ── */}
      <button type="submit" disabled={isSubmitDisabled}
        className={`w-full py-3.5 font-medium rounded-xl transition-all duration-300 shadow-lg ${
          isSubmitDisabled
            ? "bg-gray-800 text-gray-600 shadow-none cursor-not-allowed"
            : "bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-900/20"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Preparazione...
          </span>
        ) : extractionDone && emptyRequiredAfterExtraction.size > 0 ? (
          "Compila i campi mancanti per procedere"
        ) : (
          "Analizza Bando e Genera Dossier"
        )}
      </button>
    </form>
  );
}
