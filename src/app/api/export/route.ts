import { NextRequest, NextResponse } from "next/server";
import { generaDossierDocx, generaPitchPptx } from "@/lib/api/exporter";
import type { CompanyData, CalcoloFinanziario, DeepScanResult, BusinessPlanResult, EligibilityResult, ChecklistItem } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ detail: "type e data sono obbligatori" }, { status: 400 });
    }

    const azienda = data.azienda as CompanyData;
    const calcolo = data.calcolo as CalcoloFinanziario;
    const deepScan = data.deepScan as DeepScanResult;
    const businessPlan = data.businessPlan as BusinessPlanResult;
    const eligibility = data.eligibility as EligibilityResult;
    const checklist = (data.checklist as ChecklistItem[]) || [];

    if (type === "docx") {
      const buffer = await generaDossierDocx({ azienda, calcolo, deepScan, businessPlan, eligibility, checklist });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="dossier_tecnico_${azienda.ragione_sociale.replace(/\s+/g, "_")}.docx"`,
        },
      });
    }

    if (type === "pptx") {
      const buffer = await generaPitchPptx({ azienda, calcolo, deepScan, businessPlan, eligibility });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="pitch_${azienda.ragione_sociale.replace(/\s+/g, "_")}.pptx"`,
        },
      });
    }

    return NextResponse.json({ detail: `Tipo sconosciuto: ${type}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
