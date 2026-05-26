import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    let sb;
    try { sb = getSupabaseAdmin(); } catch {
      return NextResponse.json({ detail: "Supabase non configurata — imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY" }, { status: 500 });
    }

    const { data, error } = await sb
      .from("analyses")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    const safe = (data || []).map((row) => normalizeRow(row));

    return NextResponse.json(safe);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore recupero analisi";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, data: snapshot, user_id } = body;

    if (!name || !snapshot) {
      return NextResponse.json({ detail: "name e data sono obbligatori" }, { status: 400 });
    }

    const v = (snapshot as Record<string, unknown>)?.verifyResult as Record<string, unknown> | undefined;
    const a = (snapshot as Record<string, unknown>)?.analyzeResult as Record<string, unknown> | undefined;

    const record = {
      user_id: user_id || "anonymous",
      name,
      data: sanitizeSnapshot(snapshot),
      is_pinned: false,
      // Colonne esplicite per ogni tab
      esito_calcolato: v?.esito_calcolato || null,
      analisi_concisa: v?.analisi_concisa || null,
      company_data: (snapshot as Record<string, unknown>)?.companyData || null,
      bando_info: (snapshot as Record<string, unknown>)?.bandoInfo || null,
      vincoli_bando: a?.deep_scan || null,
      calcolo_finanziario: v?.calcolo_finanziario || null,
      business_plan_data: v?.business_plan_data || null,
      custom_prompt: (v?.custom_prompt as string) || null,
      checklist_pratica: ((v?.analisi_concisa as Record<string, unknown>)?.checklist_pratica as unknown) || (v?.checklist as unknown) || null,
    };

    let sb;
    try { sb = getSupabaseAdmin(); } catch {
      return NextResponse.json({ detail: "Supabase non configurata — imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY" }, { status: 500 });
    }

    const { data: inserted, error } = await sb
      .from("analyses")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error("Supabase INSERT error:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(inserted, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore salvataggio analisi";
    console.error("POST /api/analyses error:", message);
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const rawData = (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>;

  return {
    ...row,
    data: {
      ...rawData,
      verifyResult: (row.esito_calcolato || rawData.verifyResult)
        ? { ...((rawData.verifyResult as Record<string, unknown>) || {}), esito_calcolato: row.esito_calcolato || (rawData.verifyResult as Record<string, unknown>)?.esito_calcolato }
        : null,
      companyData: row.company_data || rawData.companyData || null,
      bandoInfo: row.bando_info || rawData.bandoInfo || null,
      analyzeResult: (row.vincoli_bando || rawData.analyzeResult)
        ? { ...((rawData.analyzeResult as Record<string, unknown>) || {}), deep_scan: row.vincoli_bando || (rawData.analyzeResult as Record<string, unknown>)?.deep_scan }
        : null,
    },
  };
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
