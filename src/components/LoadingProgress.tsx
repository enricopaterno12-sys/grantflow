"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  isLoading: boolean;
}

const STEPS = [
  { label: "Estrazione PDF", pct: 25 },
  { label: "Analisi bando", pct: 60 },
  { label: "Verifica eligibility", pct: 85 },
  { label: "Generazione dossier", pct: 100 },
];

export default function LoadingProgress({ isLoading }: Props) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();
    setProgress(0);
    setCurrentStep(0);

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;

      if (!isLoading) {
        setProgress(100);
        setCurrentStep(4);
        clearInterval(interval);
        return;
      }

      let pct: number;
      if (elapsed < 2) {
        pct = Math.min(25, (elapsed / 2) * 25);
        setCurrentStep(0);
      } else if (elapsed < 6) {
        pct = 25 + ((elapsed - 2) / 4) * 35;
        setCurrentStep(1);
      } else {
        pct = Math.min(85, 60 + ((elapsed - 6) / 8) * 25);
        setCurrentStep(2);
      }
      setProgress(Math.min(pct, 99));
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading]);

  const prevPct = STEPS[currentStep - 1]?.pct || 0;
  const stepPct = STEPS[currentStep]?.pct || 100;
  const subProgress = currentStep < 4 ? ((progress - prevPct) / (stepPct - prevPct)) * 100 : 100;

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
          {!isLoading ? (
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-emerald-400 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <h3 className="text-base font-semibold text-white">{!isLoading ? "Analisi completata" : "Analisi in corso"}</h3>
        <p className="text-sm text-gray-500">{!isLoading ? "Report pronto nella sezione risultati" : "GrantFlow AI sta elaborando il bando"}</p>
      </div>

      <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-2.5">
        {STEPS.map((s, i) => {
          const active = i === currentStep && isLoading;
          const done = i < currentStep || (!isLoading && i <= currentStep);
          return (
            <div
              key={s.label}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 ${
                active ? "bg-white/[0.04] border-emerald-500/20" : done ? "bg-white/[0.02] border-white/[0.04]" : "bg-white/[0.01] border-transparent opacity-40"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                done ? "bg-emerald-500/10 text-emerald-400" : active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-gray-600"
              }`}>{done ? "✓" : i + 1}</div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${active ? "text-white" : done ? "text-gray-300" : "text-gray-600"}`}>
                  {s.label}
                </p>
                <div className="w-full h-1.5 bg-white/[0.04] rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      done ? "bg-emerald-500 w-full" : active ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "w-0"
                    }`}
                    style={active ? { width: `${Math.max(0, Math.min(100, subProgress))}%` } : {}}
                  />
                </div>
              </div>

              <span className={`text-xs tabular-nums flex-shrink-0 ${
                done ? "text-emerald-400" : active ? "text-gray-300" : "text-gray-600"
              }`}>{done ? `${s.pct}%` : active ? `${Math.round(progress)}%` : "0%"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
