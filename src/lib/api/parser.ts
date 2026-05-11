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
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  await parser.destroy();
  return textResult.text || "";
}

export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseUploadedPdf(file: File): Promise<string> {
  const buffer = await fileToBuffer(file);
  return extractPdfText(buffer);
}
