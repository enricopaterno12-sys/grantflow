"use client";

import { useState } from "react";

interface Props {
  visuraPrefill?: { ragione_sociale?: string; ateco?: string };
  onAnalyze: (data: {
    ragione_sociale: string;
    ateco: string;
    dimensione: string;
    regione: string;
    fatturato: number;
    dipendenti: number;
    data_costituzione: string;
    investimento: number;
    finanziamento_richiesto: number;
  }) => void;
  loading: boolean;
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all duration-200 text-sm";

const labelClass = "block text-sm font-medium text-gray-400 mb-1.5";

export default function CompanyForm({ visuraPrefill, onAnalyze, loading }: Props) {
  const [form, setForm] = useState({
    ragione_sociale: visuraPrefill?.ragione_sociale || "",
    ateco: visuraPrefill?.ateco || "",
    dimensione: "",
    regione: "",
    fatturato: 0,
    dipendenti: 0,
    data_costituzione: "",
    investimento: 0,
    finanziamento_richiesto: 0,
  });

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze(form);
  };

  const isValid = form.ragione_sociale.trim() && form.ateco.trim() && form.fatturato > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>Ragione Sociale *</label>
            <input
              type="text"
              value={form.ragione_sociale}
              onChange={(e) => handleChange("ragione_sociale", e.target.value)}
              placeholder="Mia Impresa Srl"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Codice ATECO *</label>
            <input
              type="text"
              value={form.ateco}
              onChange={(e) => handleChange("ateco", e.target.value)}
              placeholder="62.01"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dimensione</label>
            <select
              value={form.dimensione}
              onChange={(e) => handleChange("dimensione", e.target.value)}
              className={inputClass}
            >
              <option value="">Seleziona...</option>
              <option value="Micro (0-9)">Micro (0-9)</option>
              <option value="Piccola (10-49)">Piccola (10-49)</option>
              <option value="Media (50-249)">Media (50-249)</option>
              <option value="Grande (250+)">Grande (250+)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Regione</label>
            <input
              type="text"
              value={form.regione}
              onChange={(e) => handleChange("regione", e.target.value)}
              placeholder="Puglia"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fatturato (€) *</label>
            <input
              type="number"
              value={form.fatturato || ""}
              onChange={(e) => handleChange("fatturato", Number(e.target.value))}
              min={0}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dipendenti</label>
            <input
              type="number"
              value={form.dipendenti || ""}
              onChange={(e) => handleChange("dipendenti", Number(e.target.value))}
              min={0}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Data Costituzione</label>
            <input
              type="date"
              value={form.data_costituzione}
              onChange={(e) => handleChange("data_costituzione", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Investimento (€)</label>
            <input
              type="number"
              value={form.investimento || ""}
              onChange={(e) => handleChange("investimento", Number(e.target.value))}
              min={0}
              step={1000}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Finanziamento Richiesto (€)</label>
            <input
              type="number"
              value={form.finanziamento_richiesto || ""}
              onChange={(e) => handleChange("finanziamento_richiesto", Number(e.target.value))}
              min={0}
              step={1000}
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid || loading}
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
          "Avvia Analisi"
        )}
      </button>
    </form>
  );
}
