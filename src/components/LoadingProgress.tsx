"use client";

import { useState, useEffect } from "react";

const STATUS_ITEMS = [
  { text: "Estrazione testo PDF in corso...", weight: 10 },
  { text: "Analisi criteri ammissibilità...", weight: 15 },
  { text: "Verifica massimali GBER e De Minimis...", weight: 15 },
  { text: "Scansione codici ATECO e requisiti...", weight: 15 },
  { text: "Calcolo indicatori finanziari...", weight: 15 },
  { text: "Verifica eligibility e conformità...", weight: 10 },
  { text: "Generazione Business Plan...", weight: 10 },
  { text: "Preparazione documenti finali...", weight: 10 },
];

export default function LoadingProgress() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalWeight = STATUS_ITEMS.reduce((a, i) => a + i.weight, 0);

  useEffect(() => {
    if (currentIndex >= STATUS_ITEMS.length) return;
    const timer = setTimeout(() => setCurrentIndex((i) => i + 1), 4000);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const progress = STATUS_ITEMS.slice(0, currentIndex).reduce((a, i) => a + i.weight, 0);
  const percent = Math.min(Math.round((progress / totalWeight) * 100), 95);
  const currentStatus = STATUS_ITEMS[Math.min(currentIndex, STATUS_ITEMS.length - 1)];

  return (
    <div className="max-w-lg mx-auto text-center space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-emerald-400 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white">Analisi in corso</h3>
        <p className="text-sm text-gray-500">GrantFlow AI sta elaborando il bando</p>
      </div>

      <div className="space-y-2">
        <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 tabular-nums">{percent}%</p>
      </div>

      <div className="space-y-3 min-h-[120px]">
        {STATUS_ITEMS.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 text-sm transition-all duration-500 ${
              i === currentIndex
                ? "opacity-100 translate-x-0 text-white"
                : i < currentIndex
                  ? "opacity-40 translate-x-0 text-emerald-500"
                  : "opacity-0 translate-x-4 text-gray-500"
            }`}
          >
            {i < currentIndex ? (
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : i === currentIndex ? (
              <svg className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <div className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
