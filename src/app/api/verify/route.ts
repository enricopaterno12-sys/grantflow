import { NextRequest, NextResponse } from "next/server";
import { analisiConcisa } from "@/lib/api/analyzer";
import { CalcolatoreFinanziario, calcolaBusinessPlan, calcolaIndipendenzaFinanziaria } from "@/lib/api/calculator";
import type { DeepScanResult, BusinessPlanResult, ChecklistItem, ChecklistPraticaItem } from "@/types";

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
    const datiStr = [
      `Azienda: ${d.ragione_sociale || ""}`,
      `ATECO: ${d.ateco || ""}`,
      `Dimensione: ${d.dimensione || ""}`,
      `Regione: ${d.regione || ""}`,
      `Fatturato: €${(d.fatturato || 0).toLocaleString("it-IT")}`,
      `Dipendenti: ${d.dipendenti || 0}`,
      `Data Costituzione: ${d.data_costituzione || ""}`,
      `Investimento: €${(d.investimento || 0).toLocaleString("it-IT")}`,
      `Finanziamento Richiesto: €${(d.finanziamento_richiesto || 0).toLocaleString("it-IT")}`,
      `Forma Giuridica: ${d.forma_giuridica || ""}`,
      `Partita IVA: ${d.partita_iva || ""}`,
      `Codice Fiscale: ${d.codice_fiscale || ""}`,
      `Sede Legale: ${d.sede_legale || ""}`,
      `PEC: ${d.pec || ""}`,
      `Utile Netto: €${(d.utile_netto || 0).toLocaleString("it-IT")}`,
      `Debiti Finanziari: €${(d.debiti_finanziari || 0).toLocaleString("it-IT")}`,
      `Patrimonio Netto: €${(d.patrimonio_netto || 0).toLocaleString("it-IT")}`,
      `De Minimis Importo: €${(d.de_minimis_importo || 0).toLocaleString("it-IT")}`,
      `De Minimis Regime: ${d.de_minimis_regime || ""}`,
      `Descrizione Progetto: ${d.descrizione_progetto || ""}`,
      `Categoria Spesa: ${d.categoria_spesa || ""}`,
      `Procedure Concorsuali: ${d.procedure_concorsuali ? "Sì" : "No"}`,
    ].join("\n");

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

    // Nuova analisi concisa via Groq
    let analisiConcisaResult: Record<string, unknown> = {};
    let analisiCustomText: string | undefined;
    try {
      const result = await analisiConcisa(scheda_bando || "", datiStr, custom_prompt);
      analisiConcisaResult = result.result;
      analisiCustomText = result.analisiCustom;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore chiamata Groq";
      return NextResponse.json({ detail: message }, { status: 502 });
    }

    // Backward-compatible eligibility summary
    const esito = analisiConcisaResult.esito as Record<string, unknown> || {};
    const rating = (esito.rating as string) || "N/D";
    const prob = (esito.probabilita as number) || 0;

    // Business plan data with fallback defaults
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

    // Financial independence
    const indipendenzaFinanziaria = calcolaIndipendenzaFinanziaria(
      d.patrimonio_netto || 0,
      d.debiti_finanziari || 0,
    );

    // Build checklist pratica from Groq output + fallback items
    const groqChecklist = (analisiConcisaResult.checklist_pratica as Array<{ nome: string; obbligatorio: boolean }>) || [];
    const checklistPratica: ChecklistPraticaItem[] = groqChecklist.length > 0
      ? groqChecklist.map((c: { nome: string; obbligatorio: boolean }) => ({ nome: c.nome, obbligatorio: c.obbligatorio ?? true, completato: false }))
      : [
          { nome: "DURC (Documento Unico di Regolarità Contributiva)", obbligatorio: true, completato: false },
          { nome: "Certificazione Antimafia", obbligatorio: true, completato: false },
          { nome: "Preventivi di spesa (almeno 3 per ogni voce)", obbligatorio: true, completato: false },
          { nome: "Visura camerale aggiornata", obbligatorio: true, completato: false },
          { nome: "Atto costitutivo e statuto", obbligatorio: true, completato: false },
        ];

    // Build Dati Chiave Concessione table data
    const contributoMassimo = (esito.contributo_massimo_concedibile as number) || calcolo.contributo || 0;
    const intensitaAiuto = (esito.intensita_aiuto as number) || calcolo.aliquota_contributo || 0;
    const regimeAiuti = (esito.regime_aiuti as string) || "N/D";
    const scudo = (esito.scudo_anti_errore as string) || "";

    return NextResponse.json({
      // Legacy fields for backward compat
      calcolo_finanziario: calcolo,
      valutazione_bilanci: valBil,
      valutazione_fatturato: valFat,
      indipendenza_finanziaria: indipendenzaFinanziaria,
      business_plan_data: bpData,
      eligibility: `CLASSIFICAZIONE FINALE: [${rating}]\nPROBABILITÀ APPROVAZIONE: ${prob}%`,
      eligibility_checks: {
        overall: rating === "GRIGIO" ? "N/D" : rating,
        probabilita: prob,
        checks: [],
        motivazioni: scudo,
      },
      eligibility_parsed: { classificazione: rating, probabilita: prob },
      business_plan: "",
      checklist: checklistPratica,
      // Nuova struttura concisa
      analisi_concisa: analisiConcisaResult,
      custom_prompt: custom_prompt || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
