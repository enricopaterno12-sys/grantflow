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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Ragione Sociale *</label>
          <input type="text" value={form.ragione_sociale} onChange={(e) => handleChange("ragione_sociale", e.target.value)} placeholder="Mia Impresa Srl" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Codice ATECO *</label>
          <input type="text" value={form.ateco} onChange={(e) => handleChange("ateco", e.target.value)} placeholder="62.01" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Dimensione</label>
          <select value={form.dimensione} onChange={(e) => handleChange("dimensione", e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleziona...</option>
            <option value="Micro (0-9)">Micro (0-9)</option>
            <option value="Piccola (10-49)">Piccola (10-49)</option>
            <option value="Media (50-249)">Media (50-249)</option>
            <option value="Grande (250+)">Grande (250+)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Regione</label>
          <input type="text" value={form.regione} onChange={(e) => handleChange("regione", e.target.value)} placeholder="Puglia" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Fatturato (€) *</label>
          <input type="number" value={form.fatturato || ""} onChange={(e) => handleChange("fatturato", Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Dipendenti</label>
          <input type="number" value={form.dipendenti || ""} onChange={(e) => handleChange("dipendenti", Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Data Costituzione</label>
          <input type="date" value={form.data_costituzione} onChange={(e) => handleChange("data_costituzione", e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Investimento (€)</label>
          <input type="number" value={form.investimento || ""} onChange={(e) => handleChange("investimento", Number(e.target.value))} min={0} step={1000} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Finanziamento Richiesto (€)</label>
          <input type="number" value={form.finanziamento_richiesto || ""} onChange={(e) => handleChange("finanziamento_richiesto", Number(e.target.value))} min={0} step={1000} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid || loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition-colors"
      >
        {loading ? "Analisi in corso..." : "🚀 Avvia Analisi Professionale"}
      </button>
    </form>
  );
}
