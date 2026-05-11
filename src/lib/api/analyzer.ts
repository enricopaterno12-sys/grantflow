import Groq from "groq-sdk";
import {
  DEEP_SCAN_TEMPLATE,
  PARAMETRI_FINANZIARI_TEMPLATE,
  ANALYSIS_TEMPLATE,
  ELIGIBILITY_TEMPLATE,
  BUSINESS_PLAN_TEMPLATE,
} from "./templates";

const MODEL_NAME = "llama-3.3-70b-versatile";

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
