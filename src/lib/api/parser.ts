import { Readable } from "stream";

export function parseVisura(testo: string): { ragione_sociale: string; ateco: string } {
  let ragione_sociale = "";
  let ateco = "";

  const rsMatch = testo.match(
    /(?:RAGIONE\s*SOCIALE|DENOMINAZIONE|IMPRESA)\s*:?\s*(.+?)(?:\n|$)/i
  );
  if (rsMatch) {
    ragione_sociale = rsMatch[1].trim().replace(/\s+/g, " ");
  }

  const atecoMatch = testo.match(
    /(?:CODICE\s*)?ATECO\s*:?\s*(\d{2}\.\d{2})/i
  );
  if (atecoMatch) {
    ateco = atecoMatch[1].trim();
  }

  return { ragione_sociale, ateco };
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(" ");
    pages.push(pageText);
  }
  await doc.destroy();
  return pages.join("\n");
}

export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseUploadedPdf(file: File): Promise<string> {
  const buffer = await fileToBuffer(file);
  return extractPdfText(buffer);
}
