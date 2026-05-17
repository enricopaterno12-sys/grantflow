import { NextRequest, NextResponse } from "next/server";
import { analisiConcisa } from "@/lib/api/analyzer";
import { CalcolatoreFinanziario, calcolaBusinessPlan, calcolaIndipendenzaFinanziaria } from "@/lib/api/calculator";
import { calcolaEsitoDeterministico, calcoloSenzaVincoli } from "@/lib/api/eligibility-rules";
import type { DeepScanResult, BusinessPlanResult, ChecklistPraticaItem } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dati_azienda, parametri_finanziari, scheda_bando, deep_scan, custom_prompt } = body;

    if (!dati_azienda) {
      return NextResponse.json({ detail: "dati_azienda è obbligatorio" }, { status: 400 });
    }

    const d = dati_azienda;
    const calcolatore = new CalcolatoreFinanziario(parametri_finanziari || {});
    const calcolo = calcolatore.calcola(d.investimento || 0);

    let anniBil = 0;
    if (d.data_costituzione) {
      const dc = new Date(d.data_costituzione);
      if (!isNaN(dc.getTime())) {
        anniBil = new Date().getFullYear() - dc.getFullYear();
      }
    }

    const valBil = calcolatore.valida_bilanci(d.data_costituzione || "", Math.max(0, anniBil));
    const valFat = calcolatore.valida_fatturato(d.fatturato || 0);

    // ═══════════════════════════════════════════
    // FASE 1: Calcolo Esito Deterministico
    // ═══════════════════════════════════════════
    const hasVincoli = deep_scan?.vincoli_soggettivi || deep_scan?.vincoli_finanziari;
    const esitoCalcolato = hasVincoli
      ? calcolaEsitoDeterministico(d, deep_scan || {}, parametri_finanziari || {}, calcolo)
      : calcoloSenzaVincoli(d, parametri_finanziari || {}, calcolo);

    const { rating, probabilita, dettagli, scudo_anti_errore, contributo_massimo_concedibile, intensita_aiuto, regime_aiuti } = esitoCalcolato;

    // ═══════════════════════════════════════════
    // FASE 2: Analisi Custom (solo se richiesta)
    // ═══════════════════════════════════════════
    let analisiConcisaResult: Record<string, unknown> | undefined;
    let analisiCustomText: string | undefined;
    if (custom_prompt) {
      try {
        const datiStr = [
          `Azienda: ${d.ragione_sociale || ""}`,
          `ATECO: ${d.ateco || ""}`,
          `Dimensione: ${d.dimensione || ""}`,
          `Regione: ${d.regione || ""}`,
          `Fatturato: €${(d.fatturato || 0).toLocaleString("it-IT")}`,
          `Dipendenti: ${d.dipendenti || 0}`,
          `Data Costituzione: ${d.data_costituzione || ""}`,
          `Investimento: €${(d.investimento || 0).toLocaleString("it-IT")}`,
          `De Minimis Importo: €${(d.de_minimis_importo || 0).toLocaleString("it-IT")}`,
          `Descrizione Progetto: ${d.descrizione_progetto || ""}`,
          `Categoria Spesa: ${d.categoria_spesa || ""}`,
        ].join("\n");
        const result = await analisiConcisa(scheda_bando || "", datiStr, custom_prompt);
        analisiConcisaResult = result.result;
        analisiCustomText = result.analisiCustom;
      } catch {
        // Silently fail — custom analysis is optional
      }
    }

    // ═══════════════════════════════════════════
    // FASE 3: Business Plan Data (deterministico)
    // ═══════════════════════════════════════════
    const investEff = calcolo.investimento_effettivo || d.investimento || 0;
    let bpData: BusinessPlanResult;
    if (investEff > 0) {
      bpData = calcolaBusinessPlan(investEff, calcolo.contributo || 0, calcolo.finanziamento || 0, d.utile_netto || 0);
    } else {
      const defaultCf = [1, 2, 3, 4, 5].map((anno) => ({ anno, ricavi: 0, costi: 0, netto: 0 }));
      bpData = {
        dscr: 0, payback_anni: 6, van: 0, irr: 0, cashflow: defaultCf,
        contributo: 0, finanziamento: 0, investimento_totale: 0,
      };
    }

    const indipendenzaFinanziaria = calcolaIndipendenzaFinanziaria(
      d.patrimonio_netto || 0,
      d.debiti_finanziari || 0,
    );

    // ═══════════════════════════════════════════
    // FASE 4: Checklist
    // ═══════════════════════════════════════════
    const groqChecklist = (analisiConcisaResult?.checklist_pratica as Array<{ nome: string; obbligatorio: boolean }>) || [];
    const checklistPratica: ChecklistPraticaItem[] = groqChecklist.length > 0
      ? groqChecklist.map((c) => ({ nome: c.nome, obbligatorio: c.obbligatorio ?? true, completato: false }))
      : [
          { nome: "DURC (Documento Unico di Regolarità Contributiva)", obbligatorio: true, completato: false },
          { nome: "Certificazione Antimafia", obbligatorio: true, completato: false },
          { nome: "Preventivi di spesa (almeno 3 per ogni voce)", obbligatorio: true, completato: false },
          { nome: "Visura camerale aggiornata", obbligatorio: true, completato: false },
          { nome: "Atto costitutivo e statuto", obbligatorio: true, completato: false },
        ];

    return NextResponse.json({
      // Legacy fields
      calcolo_finanziario: calcolo,
      valutazione_bilanci: valBil,
      valutazione_fatturato: valFat,
      indipendenza_finanziaria: indipendenzaFinanziaria,
      business_plan_data: bpData,
      eligibility: `CLASSIFICAZIONE FINALE: [${rating}]\nPROBABILITÀ APPROVAZIONE: ${probabilita}%`,
      eligibility_checks: { overall: rating === "GRIGIO" ? "N/D" : rating, probabilita, checks: dettagli.map((f) => ({ nome: f.fattore, status: f.esito === "OK" ? "PASS" : f.esito === "KO" ? "FAIL" : "WARN" as const, dettaglio: f.dettaglio })), motivazioni: scudo_anti_errore },
      eligibility_parsed: { classificazione: rating, probabilita },
      business_plan: "",
      checklist: checklistPratica,
      // Nuova struttura
      analisi_concisa: analisiConcisaResult || { esito: { rating, probabilita, contributo_massimo_concedibile, intensita_aiuto, regime_aiuti, scudo_anti_errore }, analisi_tecnica: [], analisi_custom: analisiCustomText || "", checklist_pratica: checklistPratica },
      custom_prompt: custom_prompt || null,
      // Dettaglio esito calcolato
      esito_calcolato: esitoCalcolato,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
