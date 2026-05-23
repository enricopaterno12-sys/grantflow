import {
  VINCOLI_TEMPLATE,
  VISURA_TEMPLATE,
  PARAMETRI_FINANZIARI_TEMPLATE,
  ELIGIBILITY_TEMPLATE,
  ANALISI_CONCISA_TEMPLATE,
  BUSINESS_PLAN_TEMPLATE,
} from "./templates";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function callGroq(
  system: string,
  userContent: string,
  maxTokens = 4096,
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY environment variable is not set");

  const response = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
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
  return callGroq(system, userContent, 4096);
}

function parseJsonStrict(raw: string): Record<string, unknown> {
  const pulita = raw.replace(/^```(?:json)?\s*|\s*```$/gm, "").trim();
  return JSON.parse(pulita);
}

export async function deepScanBando(testoBando: string): Promise<Record<string, unknown>> {
  const risposta = await ask(
    "Estrattore puro di regole. Estrai solo clausole oggettive, nessuna analisi.",
    VINCOLI_TEMPLATE,
    { testo_bando: testoBando },
  );
  return parseJsonStrict(risposta);
}

export async function estraiDatiAziendali(testoDocumento: string): Promise<Record<string, unknown>> {
  const risposta = await ask(
    "Sei un estrattore di dati anagrafici e finanziari aziendali. Non inventare nulla.",
    VISURA_TEMPLATE,
    { documento: testoDocumento },
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
  const vs = (deepScan.vincoli_soggettivi as Record<string, unknown>) || {};
  const vf = (deepScan.vincoli_finanziari as Record<string, unknown>) || {};

  const atecoAm = (vs.ateco_ammessi as string[]) || [];
  if (atecoAm.length > 0) {
    lines.push("**ATECO Ammessi:** " + atecoAm.join(", "));
  }

  const atecoEs = (vs.ateco_esclusi as string[]) || [];
  if (atecoEs.length > 0) {
    lines.push("**ATECO Esclusi:** " + atecoEs.join(", "));
  }

  const dim = (vs.dimensione_ammessa as string[]) || [];
  if (dim.length > 0) {
    lines.push("**Soggetti Ammissibili:** " + dim.join(", "));
  }

  const prov = (vs.province_ammesse as string[]) || [];
  if (prov.length > 0) {
    lines.push("**Province Ammesse:** " + prov.join(", "));
  }

  lines.push("\n---\n### Parametri Economici\n");
  if (parametri.aliquota_contributo) lines.push(`- Contributo: ${parametri.aliquota_contributo}%`);
  if (parametri.aliquota_finanziamento) lines.push(`- Finanziamento: ${parametri.aliquota_finanziamento}%`);
  if (parametri.limite_min_investimento) lines.push(`- Investimento minimo: €${Number(parametri.limite_min_investimento).toLocaleString("it-IT")}`);
  if (parametri.limite_max_investimento) lines.push(`- Investimento massimo: €${Number(parametri.limite_max_investimento).toLocaleString("it-IT")}`);
  if (parametri.fatturato_minimo) lines.push(`- Fatturato minimo: €${Number(parametri.fatturato_minimo).toLocaleString("it-IT")}`);
  if (parametri.bilanci_richiesti) lines.push(`- Bilanci richiesti: ${parametri.bilanci_richiesti}`);

  const invMin = vf.investimento_minimo as number;
  const invMax = vf.investimento_massimo as number;
  if (invMin || invMax) {
    lines.push(`\n### Range Investimento\n`);
    if (invMin) lines.push(`- Minimo: €${invMin.toLocaleString("it-IT")}`);
    if (invMax) lines.push(`- Massimo: €${invMax.toLocaleString("it-IT")}`);
  }

  const intensita = vf.intensita_contributo_percentuale as number;
  if (intensita) {
    lines.push(`- Intensità contributo: ${intensita}%`);
  }

  const massimale = vf.massimale_contributo as number;
  if (massimale) {
    lines.push(`- Massimale contributo: €${massimale.toLocaleString("it-IT")}`);
  }

  const regime = vf.regime_aiuto as string;
  if (regime) {
    lines.push(`- Regime aiuto: ${regime}`);
  }

  const fattMin = vf.fatturato_minimo as number;
  const bilReq = vf.bilanci_richiesti as number;
  if (fattMin || bilReq) {
    lines.push("\n---\n### Requisiti di Accesso\n");
    if (fattMin) lines.push(`- Fatturato minimo: €${fattMin.toLocaleString("it-IT")}`);
    if (bilReq) lines.push(`- Bilanci richiesti: ${bilReq}`);
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

export async function analisiConcisa(
  scheda: string,
  dati: string,
  customPrompt?: string,
): Promise<{ result: Record<string, unknown>; analisiCustom?: string }> {
  const promptCustomSection = customPrompt
    ? `\nRICHIESTA CUSTOM DEL CLIENTE:\n${customPrompt}\n\nRispondi nel campo analisi_custom.`
    : "";

  const userContent = ANALISI_CONCISA_TEMPLATE
    .replace("{dati}", dati)
    .replace("{scheda}", scheda)
    .replace("{prompt_custom_section}", promptCustomSection);

  const content = await callGroq(
    "Sei un analista bandi senior. Produci SOLO JSON valido, senza markdown.",
    userContent,
    8192,
  );

  const parsed = parseJsonStrict(content);
  return {
    result: parsed,
    analisiCustom: (parsed as Record<string, unknown>).analisi_custom as string | undefined,
  };
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
