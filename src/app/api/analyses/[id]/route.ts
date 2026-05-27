import { NextRequest, NextResponse } from "next/server";
import { selectById, updateRow, deleteRow } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const data = await selectById("analyses", params.id);
    return NextResponse.json(normalizeRow(data as Record<string, unknown>));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore recupero analisi";
    if (message.includes("404") || message.includes("not found") || message.includes("non trovata")) {
      return NextResponse.json({ detail: "Analisi non trovata" }, { status: 404 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") updates.name = body.name;
    if (typeof body.is_pinned === "boolean") updates.is_pinned = body.is_pinned;
    if (body.data && typeof body.data === "object") {
      updates.data = sanitizeSnapshot(body.data);
      const v = (body.data as Record<string, unknown>)?.verifyResult as Record<string, unknown> | undefined;
      const a = (body.data as Record<string, unknown>)?.analyzeResult as Record<string, unknown> | undefined;
      if (v?.esito_calcolato) updates.esito_calcolato = v.esito_calcolato;
      if (v?.analisi_concisa) updates.analisi_concisa = v.analisi_concisa;
      if (v?.calcolo_finanziario) updates.calcolo_finanziario = v.calcolo_finanziario;
      if (v?.business_plan_data) updates.business_plan_data = v.business_plan_data;
      if (v?.custom_prompt) updates.custom_prompt = v.custom_prompt;
      if ((body.data as Record<string, unknown>)?.companyData) updates.company_data = (body.data as Record<string, unknown>).companyData;
      if ((body.data as Record<string, unknown>)?.bandoInfo) updates.bando_info = (body.data as Record<string, unknown>).bandoInfo;
      if (a?.deep_scan) updates.vincoli_bando = a.deep_scan;
      const cl = (v?.analisi_concisa as Record<string, unknown>)?.checklist_pratica || v?.checklist;
      if (cl) updates.checklist_pratica = cl;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ detail: "Nessun campo da aggiornare" }, { status: 400 });
    }

    const data = await updateRow("analyses", params.id, updates);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore aggiornamento analisi";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await deleteRow("analyses", params.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore eliminazione analisi";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const rawData = (row.data && typeof row.data === "object"
    ? row.data
    : {}) as Record<string, unknown>;
  const rawVR = (rawData.verifyResult && typeof rawData.verifyResult === "object"
    ? rawData.verifyResult
    : {}) as Record<string, unknown>;
  const rawAR = (rawData.analyzeResult && typeof rawData.analyzeResult === "object"
    ? rawData.analyzeResult
    : {}) as Record<string, unknown>;

  const verifyResult = {
    ...rawVR,
    calcolo_finanziario: row.calcolo_finanziario || rawVR.calcolo_finanziario || null,
    analisi_concisa: row.analisi_concisa || rawVR.analisi_concisa || null,
    esito_calcolato: row.esito_calcolato || rawVR.esito_calcolato || null,
    business_plan_data: row.business_plan_data || rawVR.business_plan_data || null,
    custom_prompt: row.custom_prompt || rawVR.custom_prompt || null,
    checklist: row.checklist_pratica || rawVR.checklist || null,
  };

  return {
    id: row.id,
    name: row.name,
    user_id: row.user_id,
    is_pinned: row.is_pinned,
    created_at: row.created_at,
    updated_at: row.updated_at,
    esito_calcolato: verifyResult.esito_calcolato,
    analisi_concisa: verifyResult.analisi_concisa,
    company_data: row.company_data || rawData.companyData || null,
    bando_info: row.bando_info || rawData.bandoInfo || null,
    vincoli_bando: row.vincoli_bando || rawAR.deep_scan || null,
    calcolo_finanziario: verifyResult.calcolo_finanziario,
    business_plan_data: verifyResult.business_plan_data,
    custom_prompt: verifyResult.custom_prompt,
    checklist_pratica: verifyResult.checklist,
    data: {
      ...rawData,
      verifyResult,
      companyData: row.company_data || rawData.companyData || null,
      bandoInfo: row.bando_info || rawData.bandoInfo || null,
      analyzeResult: rawAR.deep_scan || row.vincoli_bando
        ? { ...rawAR, deep_scan: row.vincoli_bando || rawAR.deep_scan || null }
        : rawAR,
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
