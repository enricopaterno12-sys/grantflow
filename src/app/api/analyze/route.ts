import { NextRequest, NextResponse } from "next/server";
import { extractPdfText, parseVisura } from "@/lib/api/parser";
import { analizzaBando, estraiParametriFinanziari } from "@/lib/api/analyzer";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileField = formData.get("file");
    const visuraField = formData.get("visura");

    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json(
        { detail: "Il file bando è obbligatorio" },
        { status: 400 }
      );
    }

    if (!fileField.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { detail: "Il file deve essere un PDF" },
        { status: 400 }
      );
    }

    const bandoBuffer = Buffer.from(await fileField.arrayBuffer());
    const testo = await extractPdfText(bandoBuffer);

    const [scheda, parametri] = await Promise.all([
      analizzaBando(testo),
      estraiParametriFinanziari(testo).catch(() => ({})),
    ]);

    const result: Record<string, unknown> = {
      testo_estratto: testo.slice(0, 3000),
      scheda,
      parametri_finanziari: parametri,
    };

    if (visuraField && visuraField instanceof File) {
      try {
        const visuraBuffer = Buffer.from(await visuraField.arrayBuffer());
        const testoVisura = await extractPdfText(visuraBuffer);
        const visuraData = parseVisura(testoVisura);
        if (visuraData.ragione_sociale || visuraData.ateco) {
          result.visura_data = visuraData;
        }
      } catch {
        // visura extraction failed silently
      }
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
