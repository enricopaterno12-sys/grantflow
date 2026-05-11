export interface ParsedSection {
  type: "h4" | "p" | "ul" | "ol" | "table" | "box";
  label?: string;
  content: string | string[] | { rows: string[][] };
  boxColor?: "verde" | "giallo" | "rosso";
}

const SECTIONS = [
  { label: "SOGGETTO:", key: "SOGGETTO", as: "h4" as const },
  { label: "FINANZIARIO:", key: "FINANZIARIO", as: "h4" as const },
  { label: "CHECKLIST_CRITICITA", key: "CHECKLIST_CRITICITA", as: "ul" as const },
  { label: "TABELLA_DATI", key: "TABELLA_DATI", as: "table" as const },
  { label: "PROSSIMI_PASSI", key: "PROSSIMI_PASSI", as: "ol" as const },
  { label: "CLASSIFICAZIONE FINALE:", key: "CLASSIFICAZIONE_FINALE", as: "box" as const },
];

function detectColor(text: string): "verde" | "giallo" | "rosso" {
  const t = text.toUpperCase();
  if (t.includes("VERDE") || t.includes("POSITIVO") || t.includes("AMMISSIBILE")) return "verde";
  if (t.includes("ROSSO") || t.includes("NEGATIVO") || t.includes("NON AMMISSIBILE")) return "rosso";
  return "giallo";
}

function parseTable(text: string): string[][] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.split("|").map((c) => c.trim()).filter(Boolean));
}

export function parseValutazioneTecnica(raw: string): ParsedSection[] {
  if (!raw || raw.trim().length === 0) return [];
  const lines = raw.split("\n");
  const positions: { idx: number; def: typeof SECTIONS[0] }[] = [];
  lines.forEach((line, idx) => {
    const t = line.trim().toUpperCase();
    for (const def of SECTIONS) {
      if (t.startsWith(def.label.toUpperCase())) { positions.push({ idx, def }); break; }
    }
  });
  if (positions.length === 0) return [{ type: "p", content: raw }];

  const result: ParsedSection[] = [];
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const next = positions[i + 1];
    const contentLines = lines.slice(pos.idx + 1, next ? next.idx : lines.length).map((l) => l.trim()).filter(Boolean);
    const text = contentLines.join("\n");
    if (!text) continue;
    switch (pos.def.as) {
      case "h4":
        result.push({ type: "h4", label: pos.def.label.replace(":", ""), content: text });
        break;
      case "ul":
        result.push({ type: "ul", label: "Criticità Rilevate", content: contentLines.map((l) => l.replace(/^[-*•]\s*/, "")) });
        break;
      case "ol":
        result.push({ type: "ol", label: "Prossimi Passi", content: contentLines.map((l) => l.replace(/^\d+[.)]\s*/, "")) });
        break;
      case "table": {
        const rows = parseTable(text);
        if (rows.length) result.push({ type: "table", label: "Dati Tabellari", content: { rows } });
        break;
      }
      case "box":
        result.push({ type: "box", label: "Classificazione Finale", content: text, boxColor: detectColor(text) });
        break;
    }
  }
  return result;
}
