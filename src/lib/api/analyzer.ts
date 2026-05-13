import Groq from "groq-sdk";
import {
  DEEP_SCAN_TEMPLATE,
  PARAMETRI_FINANZIARI_TEMPLATE,
  ANALYSIS_TEMPLATE,
  ELIGIBILITY_TEMPLATE,
  BUSINESS_PLAN_TEMPLATE,
} from "./templates";
import { splitIntoChunks, delay } from "./chunker";

const MODEL_NAME = "llama-3.3-70b-versatile";
const CHUNK_SIZE = 8000;
const CHUNK_DELAY_MS = 20000;

function getClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY environment variable is not set");
  return new Groq({ apiKey: key });
}

async function ask(
  system: string,
  userTemplate: string,
  params: Record<string, string>,
  temperature = 0,
): Promise<string> {
  const groq = getClient();
  const userContent = Object.entries(params).reduce(
    (acc, [key, val]) => acc.replace(`{${key}}`, val),
    userTemplate,
  );
  const response = await groq.chat.completions.create({
    model: MODEL_NAME,
    temperature,
    max_tokens: 4096,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
  });
  return response.choices[0]?.message?.content || "";
}

async function askRaw(
  system: string,
  userContent: string,
  maxTokens = 1024,
  temperature = 0,
): Promise<string> {
  const groq = getClient();
  const response = await groq.chat.completions.create({
    model: MODEL_NAME,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
  });
  return response.choices[0]?.message?.content || "";
}

function parseJsonStrict(raw: string): Record<string, unknown> {
  const pulita = raw.replace(/^```(?:json)?\s*|\s*```$/gm, "").trim();
  return JSON.parse(pulita);
}

export async function deepScanBando(testoBando: string): Promise<Record<string, unknown>> {
  const risposta = await ask(
    "Esegui un deep scan del bando. Estrai ogni dato strutturato con articoli di riferimento.",
    DEEP_SCAN_TEMPLATE,
    { testo_bando: testoBando },
    0.1,
  );
  return parseJsonStrict(risposta);
}

export async function estraiParametriFinanziari(
  testoBando: string,
): Promise<Record<string, number>> {
  const risposta = await ask(
    "Sei un analista bandi. Estrai parametri finanziari come JSON puro.",
    PARAMETRI_FINANZIARI_TEMPLATE,
    { testo_bando: testoBando },
  );
  const parametri = parseJsonStrict(risposta);
  const keys = [
    "aliquota_contributo",
    "aliquota_finanziamento",
    "limite_min_investimento",
    "limite_max_investimento",
    "fatturato_minimo",
    "bilanci_richiesti",
  ];
  for (const key of keys) {
    if (!(key in parametri)) parametri[key] = 0;
  }
  return parametri as Record<string, number>;
}

export async function analizzaBando(testoBando: string): Promise<string> {
  return ask(
    "Sei un analista bandi Invitalia e PNRR. Estrai parametri precisi, cita sempre l'articolo del bando.",
    ANALYSIS_TEMPLATE,
    { testo_bando: testoBando },
  );
}

async function deepScanChunk(
  chunkText: string,
  idx: number,
  total: number,
): Promise<Record<string, unknown>> {
  const prompt = `Sei un analista bandi. Esamina il frammento ${idx + 1}/${total} del bando e restituisci SOLO i dati presenti in questo frammento, in JSON valido senza testo aggiuntivo.

{
  "ateco_ammessi": [],
  "ateco_esclusi": [],
  "massimali_spesa": [],
  "scadenze": [],
  "regimi_aiuto": [],
  "criteri_valutazione": [],
  "spese_ammissibili": [],
  "riferimenti": [],
  "soggetti_ammissibili": [],
  "requisiti_accesso": [],
  "cumulo_dnsh": ""
}

FRAMMENTO:
${chunkText}`;

  const raw = await askRaw(
    "Estrai dati strutturati dal frammento di bando. Sezioni non presenti → array/stringa vuota.",
    prompt,
    1024,
    0,
  );

  try {
    return parseJsonStrict(raw);
  } catch {
    return {};
  }
}

function mergeDeepScan(results: Record<string, unknown>[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  const keys: string[] = [
    "ateco_ammessi", "ateco_esclusi", "massimali_spesa", "scadenze",
    "regimi_aiuto", "criteri_valutazione", "spese_ammissibili",
    "riferimenti", "soggetti_ammissibili", "requisiti_accesso",
  ];

  for (const key of keys) {
    const all = results.flatMap((r) => (r[key] as any[]) || []);
    if (key === "ateco_ammessi" || key === "ateco_esclusi") {
      merged[key] = [...new Set(all.map(String))];
    } else if (key === "riferimenti") {
      const seen = new Set<string>();
      merged[key] = all.filter((item: any) => {
        const id = item.articolo || JSON.stringify(item);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    } else {
      merged[key] = all;
    }
  }

  const dnsh = results.map((r) => r.cumulo_dnsh as string).filter(Boolean);
  merged.cumulo_dnsh = dnsh.sort((a, b) => b.length - a.length)[0] || "";

  return merged;
}

function mergeParametri(results: Record<string, number>[]): Record<string, number> {
  const keys = [
    "aliquota_contributo", "aliquota_finanziamento",
    "limite_min_investimento", "limite_max_investimento",
    "fatturato_minimo", "bilanci_richiesti",
  ];
  const merged: Record<string, number> = {};
  for (const key of keys) {
    const vals = results.map((r) => Number(r[key] || 0)).filter((v) => v > 0);
    merged[key] = vals.length > 0 ? Math.max(...vals) : 0;
  }
  return merged;
}

function generaRiepilogo(
  deepScan: Record<string, unknown>,
  parametri: Record<string, number>,
): string {
  const lines: string[] = ["### RIEPILOGO BANDO\n"];

  const soggetti = (deepScan.soggetti_ammissibili as string[]) || [];
  if (soggetti.length > 0) {
    lines.push("**Soggetti Ammissibili:** " + soggetti.join(", "));
  }

  const atecoAm = (deepScan.ateco_ammessi as string[]) || [];
  if (atecoAm.length > 0) {
    lines.push("**ATECO Ammessi:** " + atecoAm.join(", "));
  }

  const atecoEs = (deepScan.ateco_esclusi as string[]) || [];
  if (atecoEs.length > 0) {
    lines.push("**ATECO Esclusi:** " + atecoEs.join(", "));
  }

  lines.push("\n---\n### Parametri Economici\n");
  if (parametri.aliquota_contributo) lines.push(`- Contributo: ${parametri.aliquota_contributo}%`);
  if (parametri.aliquota_finanziamento) lines.push(`- Finanziamento: ${parametri.aliquota_finanziamento}%`);
  if (parametri.limite_min_investimento) lines.push(`- Investimento minimo: €${Number(parametri.limite_min_investimento).toLocaleString("it-IT")}`);
  if (parametri.limite_max_investimento) lines.push(`- Investimento massimo: €${Number(parametri.limite_max_investimento).toLocaleString("it-IT")}`);
  if (parametri.fatturato_minimo) lines.push(`- Fatturato minimo: €${Number(parametri.fatturato_minimo).toLocaleString("it-IT")}`);
  if (parametri.bilanci_richiesti) lines.push(`- Bilanci richiesti: ${parametri.bilanci_richiesti}`);

  const massimali = (deepScan.massimali_spesa as any[]) || [];
  if (massimali.length > 0) {
    lines.push("\n---\n### Massimali di Spesa\n");
    for (const m of massimali) {
      lines.push(`- ${m.regime || "N/D"}: €${Number(m.importo || 0).toLocaleString("it-IT")} (${m.periodo || ""}) ${m.articolo ? "— " + m.articolo : ""}`);
    }
  }

  const spese = (deepScan.spese_ammissibili as any[]) || [];
  if (spese.length > 0) {
    lines.push("\n---\n### Spese Ammissibili\n");
    for (const s of spese) {
      lines.push(`- ${s.categoria || "N/D"}: ${s.aliquota || 0}%${s.articolo ? " — " + s.articolo : ""}`);
    }
  }

  const scadenze = (deepScan.scadenze as any[]) || [];
  if (scadenze.length > 0) {
    lines.push("\n---\n### Scadenze\n");
    for (const s of scadenze) {
      lines.push(`- Apertura: ${s.apertura || "N/D"} — Chiusura: ${s.chiusura || "N/D"} (${s.perentoria ? "Perentoria" : "Indicativa"})${s.articolo ? " — " + s.articolo : ""}`);
    }
  }

  const requisiti = (deepScan.requisiti_accesso as string[]) || [];
  if (requisiti.length > 0) {
    lines.push("\n---\n### Requisiti di Accesso\n");
    for (const r of requisiti) {
      lines.push(`- ${r}`);
    }
  }

  const criteri = (deepScan.criteri_valutazione as any[]) || [];
  if (criteri.length > 0) {
    lines.push("\n---\n### Criteri di Valutazione\n");
    for (const c of criteri) {
      lines.push(`- ${c.criterio || "N/D"}: ${c.punteggio_massimo || 0} pt (${c.peso || 0}%)${c.articolo ? " — " + c.articolo : ""}`);
    }
  }

  if (deepScan.cumulo_dnsh) {
    lines.push("\n---\n### Cumulo e DNSH\n");
    lines.push(String(deepScan.cumulo_dnsh));
  }

  return lines.join("\n");
}

export async function processFullBando(
  testo: string,
): Promise<{
  riepilogo: string;
  deep_scan: Record<string, unknown>;
  parametri_finanziari: Record<string, number>;
}> {
  const testoFast = testo.slice(0, 12000);
  const chunks = splitIntoChunks(testo, CHUNK_SIZE);

  if (chunks.length <= 1) {
    const deepScan = await deepScanBando(testoFast).catch(() => ({}));
    const parametri = await estraiParametriFinanziari(testoFast).catch(() => ({}));
    return {
      riepilogo: generaRiepilogo(deepScan, parametri as Record<string, number>),
      deep_scan: deepScan,
      parametri_finanziari: parametri as Record<string, number>,
    };
  }

  const deepScanResults: Record<string, unknown>[] = [];
  const parametriResults: Record<string, number>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const ds = await deepScanChunk(chunks[i], i, chunks.length);
    deepScanResults.push(ds);

    if (i === 0) {
      const pm = await estraiParametriFinanziari(chunks[i]).catch(() => ({}));
      parametriResults.push(pm as Record<string, number>);
    }

    if (i < chunks.length - 1) {
      await delay(CHUNK_DELAY_MS);
    }
  }

  const parametriExtra = await estraiParametriFinanziari(testo.slice(0, 20000)).catch(() => ({}));
  parametriResults.push(parametriExtra as Record<string, number>);

  const mergedDeep = mergeDeepScan(deepScanResults);
  const mergedParam = mergeParametri(parametriResults);

  return {
    riepilogo: generaRiepilogo(mergedDeep, mergedParam),
    deep_scan: mergedDeep,
    parametri_finanziari: mergedParam,
  };
}

export async function verificaEligibility(
  scheda: string,
  dati: string,
): Promise<string> {
  return ask(
    "Sei un Senior Consultant in Finanza Agevolata. Verifica, calcola, contesta. Precisione chirurgica. Cita articoli.",
    ELIGIBILITY_TEMPLATE,
    { scheda, dati },
  );
}

export async function generaBusinessPlan(
  scheda: string,
  dati: string,
  calcolo?: string,
): Promise<string> {
  return ask(
    "Sei un progettista senior specializzato in business plan per bandi.",
    BUSINESS_PLAN_TEMPLATE,
    { scheda, dati, calcolo: calcolo || "" },
  );
}
