import {
  DEEP_SCAN_TEMPLATE,
  PARAMETRI_FINANZIARI_TEMPLATE,
  ELIGIBILITY_TEMPLATE,
  ELIGIBILITY_TEMPLATE_R1,
  BUSINESS_PLAN_TEMPLATE,
} from "./templates";

const MODEL_NAME = "deepseek-reasoner";
const API_BASE = "https://api.deepseek.com";

async function callDeepSeek(
  system: string,
  userContent: string,
  maxTokens = 4096,
): Promise<{ content: string; reasoningContent?: string }> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY environment variable is not set");

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL_NAME,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message || {};
  return {
    content: message.content || "",
    reasoningContent: message.reasoning_content || undefined,
  };
}

async function ask(
  system: string,
  userTemplate: string,
  params: Record<string, string>,
): Promise<string> {
  const userContent = Object.entries(params).reduce(
    (acc, [key, val]) => acc.replace(`{${key}}`, val),
    userTemplate,
  );
  const result = await callDeepSeek(system, userContent, 4096);
  return result.content;
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
  const [deepScan, parametri] = await Promise.all([
    deepScanBando(testo).catch(() => ({})),
    estraiParametriFinanziari(testo).catch(() => ({})),
  ]);
  const p = parametri as Record<string, number>;
  return {
    riepilogo: generaRiepilogo(deepScan, p),
    deep_scan: deepScan,
    parametri_finanziari: p,
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

export async function verificaEligibilityRagionata(
  scheda: string,
  dati: string,
): Promise<{ result: Record<string, unknown>; technicalNotes: string }> {
  const userContent = ELIGIBILITY_TEMPLATE_R1
    .replace("{dati}", dati)
    .replace("{scheda}", scheda);

  const { content, reasoningContent } = await callDeepSeek(
    "Sei un analista bandi senior. Produci SOLO JSON valido, senza markdown né testo extra.",
    userContent,
    8192,
  );

  const parsed = parseJsonStrict(content);
  const technicalNotes = reasoningContent
    ? reasoningContent.substring(0, 3000)
    : "";

  return { result: parsed, technicalNotes };
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
