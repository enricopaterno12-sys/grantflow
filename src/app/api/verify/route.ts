import { NextRequest, NextResponse } from "next/server";
import { verificaEligibility, generaBusinessPlan } from "@/lib/api/analyzer";
import { CalcolatoreFinanziario, calcolaBusinessPlan, calcolaIndipendenzaFinanziaria } from "@/lib/api/calculator";
import { verificaEligibilityAutomatica } from "@/lib/api/eligibility";
import type { DeepScanResult, EligibilityResult, BusinessPlanResult, ChecklistItem } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dati_azienda, parametri_finanziari, scheda_bando, deep_scan } = body;

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
      `Sede Legale: ${d.sede_legale || ""}`,
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

    let eligibility = "";
    let businessPlan = "";

    const calcoloStr = [
      `Investimento: €${(calcolo.investimento_effettivo || 0).toLocaleString("it-IT")}`,
      `Contributo: €${(calcolo.contributo || 0).toLocaleString("it-IT")}`,
      `Finanziamento: €${(calcolo.finanziamento || 0).toLocaleString("it-IT")}`,
      `Aliquota contributo: ${calcolo.aliquota_contributo || 0}%`,
      `Aliquota finanziamento: ${calcolo.aliquota_finanziamento || 0}%`,
    ].join("\n");

    try {
      [eligibility, businessPlan] = await Promise.all([
        verificaEligibility(scheda_bando || "", datiStr),
        generaBusinessPlan(scheda_bando || "", datiStr, calcoloStr),
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore chiamata LLM";
      return NextResponse.json({ detail: message }, { status: 502 });
    }

    // Parse LLM eligibility output into structured fields
    const classMatch = eligibility.match(/CLASSIFICAZIONE FINALE:\s*\[?(\w+)\]?/i);
    const probMatch = eligibility.match(/PROBABILITÀ\s*APPROVAZIONE\s*[:\-]?\s*(\d+)/i);
    const eligibilityParsed = {
      classificazione: classMatch?.[1]?.toUpperCase() || null,
      probabilita: probMatch ? parseInt(probMatch[1], 10) : null,
    };

    // Structured eligibility checks
    const deepScanData = (deep_scan || {}) as unknown as DeepScanResult;
    let eligibilityResult: EligibilityResult;
    try {
      eligibilityResult = verificaEligibilityAutomatica(
        d,
        deepScanData,
        {
          fatturato_minimo: parametri_finanziari?.fatturato_minimo || 0,
          bilanci_richiesti: parametri_finanziari?.bilanci_richiesti || 0,
          limite_min_investimento: parametri_finanziari?.limite_min_investimento || 0,
          limite_max_investimento: parametri_finanziari?.limite_max_investimento || 0,
        },
        anniBil,
      );
    } catch {
      eligibilityResult = {
        overall: "N/D" as any,
        probabilita: 0,
        checks: [],
        motivazioni: "Verifica automatica non disponibile",
      };
    }

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

    // Document checklist
    const checklist: ChecklistItem[] = [
      { id: "durc", nome: "DURC (Documento Unico di Regolarità Contributiva)", obbligatorio: true, completato: false },
      { id: "antimafia", nome: "Certificazione Antimafia", obbligatorio: true, completato: false },
      { id: "preventivi", nome: "Preventivi di spesa (almeno 3 per ogni voce)", obbligatorio: true, completato: false },
      { id: "bilanci", nome: `Ultimi ${parametri_finanziari?.bilanci_richiesti || 2} bilanci depositati`, obbligatorio: true, completato: false },
      { id: "visura", nome: "Visura camerale aggiornata", obbligatorio: true, completato: false },
      { id: "dnsh", nome: "Relazione DNSH (Do No Significant Harm)", obbligatorio: deepScanData.cumulo_dnsh?.toLowerCase().includes("dnsh"), completato: false },
      { id: "atto_costituzione", nome: "Atto costitutivo e statuto", obbligatorio: true, completato: false },
      { id: "deleghe", nome: "Deleghe e procure per firma digitale", obbligatorio: true, completato: false },
      { id: "fatture_proforma", nome: "Fatture proforma per investimenti", obbligatorio: false, completato: false },
    ];

    return NextResponse.json({
      calcolo_finanziario: calcolo,
      valutazione_bilanci: valBil,
      valutazione_fatturato: valFat,
      indipendenza_finanziaria: indipendenzaFinanziaria,
      eligibility,
      eligibility_checks: eligibilityResult,
      eligibility_parsed: eligibilityParsed,
      business_plan: businessPlan,
      business_plan_data: bpData,
      checklist,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
