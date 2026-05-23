import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("analyses")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    const safe = (data || []).map((row) => ({
      ...row,
      data: sanitizeSnapshot(row.data),
    }));

    return NextResponse.json(safe);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore recupero analisi";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, data, user_id } = body;

    if (!name || !data) {
      return NextResponse.json({ detail: "name e data sono obbligatori" }, { status: 400 });
    }

    const record = {
      user_id: user_id || "anonymous",
      name,
      data: sanitizeSnapshot(data),
      is_pinned: false,
    };

    const sb = getSupabaseAdmin();
    const { data: inserted, error } = await sb
      .from("analyses")
      .insert(record)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(inserted, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore salvataggio analisi";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

function sanitizeSnapshot(d: unknown): Record<string, unknown> {
  if (!d || typeof d !== "object") return {};
  const raw = d as Record<string, unknown>;

  return {
    ...raw,
    verifyResult: raw.verifyResult && typeof raw.verifyResult === "object"
      ? sanitizeVerifyResult(raw.verifyResult as Record<string, unknown>)
      : null,
    analyzeResult: raw.analyzeResult && typeof raw.analyzeResult === "object"
      ? raw.analyzeResult
      : null,
    companyData: raw.companyData && typeof raw.companyData === "object"
      ? raw.companyData
      : null,
    bandoInfo: raw.bandoInfo && typeof raw.bandoInfo === "object"
      ? raw.bandoInfo
      : null,
  };
}

function sanitizeVerifyResult(v: Record<string, unknown>): Record<string, unknown> {
  return {
    calcolo_finanziario: v.calcolo_finanziario && typeof v.calcolo_finanziario === "object"
      ? v.calcolo_finanziario : {},
    valutazione_bilanci: v.valutazione_bilanci && typeof v.valutazione_bilanci === "object"
      ? v.valutazione_bilanci : { conforme: false, stato: "N/D", dettaglio: "" },
    valutazione_fatturato: v.valutazione_fatturato && typeof v.valutazione_fatturato === "object"
      ? v.valutazione_fatturato : { conforme: false, stato: "N/D", dettaglio: "" },
    indipendenza_finanziaria: v.indipendenza_finanziaria && typeof v.indipendenza_finanziaria === "object"
      ? v.indipendenza_finanziaria : { indice: 0, stato: "N/D", dettaglio: "" },
    business_plan_data: v.business_plan_data && typeof v.business_plan_data === "object"
      ? v.business_plan_data : { dscr: 0, payback_anni: 0, van: 0, irr: 0, cashflow: [], contributo: 0, finanziamento: 0, investimento_totale: 0 },
    eligibility_checks: v.eligibility_checks && typeof v.eligibility_checks === "object"
      ? v.eligibility_checks : { overall: "N/D", probabilita: 0, checks: [], motivazioni: "" },
    analisi_concisa: v.analisi_concisa && typeof v.analisi_concisa === "object"
      ? v.analisi_concisa : {},
    esito_calcolato: v.esito_calcolato && typeof v.esito_calcolato === "object"
      ? v.esito_calcolato : {},
    custom_prompt: typeof v.custom_prompt === "string" ? v.custom_prompt : null,
    eligibility: typeof v.eligibility === "string" ? v.eligibility : "",
    eligibility_parsed: v.eligibility_parsed && typeof v.eligibility_parsed === "object"
      ? v.eligibility_parsed : { classificazione: null, probabilita: null },
    business_plan: typeof v.business_plan === "string" ? v.business_plan : "",
    checklist: Array.isArray(v.checklist) ? v.checklist : [],
  };
}
