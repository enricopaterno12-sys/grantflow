import { NextRequest, NextResponse } from "next/server";
import { analizzaBando, estraiParametriFinanziari } from "@/lib/api/analyzer";
import { verificaEligibility, generaBusinessPlan } from "@/lib/api/analyzer";
import { CalcolatoreFinanziario } from "@/lib/api/calculator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dati_azienda, parametri_finanziari, scheda_bando } = body;

    if (!dati_azienda) {
      return NextResponse.json(
        { detail: "dati_azienda è obbligatorio" },
        { status: 400 }
      );
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
    ].join("\n");

    const calcolatore = new CalcolatoreFinanziario(
      parametri_finanziari || {}
    );
    const calcolo = calcolatore.calcola(d.investimento || 0);

    let anniBil = 0;
    if (d.data_costituzione) {
      const dc = new Date(d.data_costituzione);
      if (!isNaN(dc.getTime())) {
        anniBil = new Date().getFullYear() - dc.getFullYear();
      }
    }

    const valBil = calcolatore.valida_bilanci(
      d.data_costituzione || "",
      Math.max(0, anniBil)
    );
    const valFat = calcolatore.valida_fatturato(d.fatturato || 0);

    let eligibility = "";
    let businessPlan = "";

    try {
      [eligibility, businessPlan] = await Promise.all([
        verificaEligibility(scheda_bando || "", datiStr),
        generaBusinessPlan(scheda_bando || "", datiStr),
      ]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Errore chiamata LLM";
      return NextResponse.json({ detail: message }, { status: 502 });
    }

    return NextResponse.json({
      calcolo_finanziario: calcolo,
      valutazione_bilanci: valBil,
      valutazione_fatturato: valFat,
      eligibility,
      business_plan: businessPlan,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
