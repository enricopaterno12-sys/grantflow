import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "@/lib/api/parser";
import { estraiDatiAziendali } from "@/lib/api/analyzer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileField = formData.get("file");
    const visuraField = formData.get("visura");
    const file = fileField || visuraField;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ detail: "File richiesto (PDF o TXT)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.name.toLowerCase().endsWith(".pdf")) {
      text = await extractPdfText(buffer);
    } else {
      text = buffer.toString("utf-8");
    }

    if (!text.trim()) {
      return NextResponse.json({ detail: "Impossibile estrarre testo dal documento" }, { status: 400 });
    }

    const extracted = await estraiDatiAziendali(text);
    return NextResponse.json(extracted);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore estrazione dati aziendali";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
