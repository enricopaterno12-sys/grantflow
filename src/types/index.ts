// ── Company ──────────────────────────────────
export interface CompanyData {
  ragione_sociale: string;
  ateco: string;
  dimensione?: string;
  regione?: string;
  fatturato?: number;
  dipendenti?: number;
  data_costituzione?: string;
  investimento?: number;
  finanziamento_richiesto?: number;
  // Dati Giuridici
  forma_giuridica?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  sede_legale?: string;
  pec?: string;
  // Economico-Finanziari
  utile_netto?: number;
  debiti_finanziari?: number;
  patrimonio_netto?: number;
  // De Minimis
  de_minimis_importo?: number;
  de_minimis_regime?: string;
  // Progetto
  descrizione_progetto?: string;
  categoria_spesa?: string;
  procedure_concorsuali?: boolean;
}

// ── Financial Parameters ─────────────────────
export interface ParametriFinanziari {
  aliquota_contributo: number;
  aliquota_finanziamento: number;
  limite_min_investimento: number;
  limite_max_investimento: number;
  fatturato_minimo: number;
  bilanci_richiesti: number;
}

// ── Deep Scan ─────────────────────────────────
export interface SpendingLimit {
  regime: "De Minimis" | "GBER" | "Altro";
  importo: number;
  periodo?: string;
  articolo?: string;
}

export interface Scadenza {
  apertura?: string;
  chiusura: string;
  perentoria: boolean;
  articolo?: string;
}

export interface RegimeAiuto {
  tipo: string;
  regolamento: string;
  intensita_massima: number;
  articolo?: string;
}

export interface CriterioValutazione {
  criterio: string;
  punteggio_massimo: number;
  peso?: number;
  articolo?: string;
}

export interface SpesaAmmissibile {
  categoria: string;
  dettaglio: string;
  aliquota: number;
  articolo?: string;
}

export interface Riferimento {
  articolo: string;
  contenuto: string;
}

export interface DeepScanResult {
  ateco_ammessi: string[];
  ateco_esclusi: string[];
  massimali_spesa: SpendingLimit[];
  scadenze: Scadenza[];
  regimi_aiuto: RegimeAiuto[];
  criteri_valutazione: CriterioValutazione[];
  spese_ammissibili: SpesaAmmissibile[];
  riferimenti: Riferimento[];
  soggetti_ammissibili: string[];
  requisiti_accesso: string[];
  cumulo_dnsh: string;
}

// ── Eligibility ───────────────────────────────
export interface EligibilityCheck {
  nome: string;
  status: "PASS" | "WARN" | "FAIL";
  dettaglio: string;
  riferimento?: string;
}

export interface EligibilityResult {
  overall: "VERDE" | "GIALLO" | "ROSSO";
  probabilita: number;
  checks: EligibilityCheck[];
  motivazioni: string;
}

// ── Structured Eligibility (Groq) ──────────────
export interface CostoMappato {
  categoria: string;
  importo: number;
  aliquota: number;
  articolo?: string;
}

export interface Premialita {
  descrizione: string;
  importo_aggiuntivo: number;
  articolo?: string;
}

export interface CalcoloPreciso {
  contributo_calcolato: number;
  finanziamento_calcolato: number;
  premialita?: Premialita;
  dettaglio: string;
}

export interface VerificaSingola {
  nome: string;
  rating: "VERDE" | "GIALLO" | "ROSSO" | "GRIGIO";
  dettaglio: string;
  riferimento?: string;
}

export interface DeMinimisCheck {
  regime_applicabile: string;
  importo_residuo: number;
  superato?: boolean;
}

export interface VerifyEligibilityRagionata {
  rating: "VERDE" | "GIALLO" | "ROSSO" | "GRIGIO";
  probabilita: number;
  costi_mappati: CostoMappato[];
  calcolo_preciso: CalcoloPreciso;
  verifiche: VerificaSingola[];
  de_minimis_check: DeMinimisCheck;
}

// ── Business Plan ─────────────────────────────
export interface CashflowProjection {
  anno: number;
  ricavi: number;
  costi: number;
  netto: number;
}

export interface BusinessPlanResult {
  dscr: number;
  payback_anni: number;
  van: number;
  irr: number;
  cashflow: CashflowProjection[];
  contributo: number;
  finanziamento: number;
  investimento_totale: number;
}

// ── Document Checklist ────────────────────────
export interface ChecklistItem {
  id: string;
  nome: string;
  obbligatorio: boolean;
  deadline?: string;
  note?: string;
  completato: boolean;
}

// ── Analysis (Database Schema) ────────────────
export interface Analysis {
  id: string;
  user_id: string;
  name: string;
  data: Record<string, unknown>;
  created_at: string;
  is_pinned: boolean;
}

// ── API Response types ────────────────────────
export interface AnalyzeResponse {
  testo_estratto: string;
  scheda: string;
  riepilogo?: string;
  parametri_finanziari: ParametriFinanziari;
  deep_scan: DeepScanResult;
  visura_data?: { ragione_sociale: string; ateco: string };
}

export interface IndipendenzaFinanziaria {
  indice: number;
  stato: "VERDE" | "GIALLO" | "ROSSO";
  dettaglio: string;
}

export interface EligibilityParsed {
  classificazione: string | null;
  probabilita: number | null;
}

export interface VerifyResponse {
  calcolo_finanziario: CalcoloFinanziario;
  valutazione_bilanci: Valutazione;
  valutazione_fatturato: Valutazione;
  indipendenza_finanziaria?: IndipendenzaFinanziaria;
  eligibility: string;
  eligibility_checks: EligibilityResult;
  eligibility_parsed?: EligibilityParsed;
  eligibility_strutturata?: VerifyEligibilityRagionata;
  technical_notes?: string;
  business_plan: string;
  business_plan_data: BusinessPlanResult;
  checklist: ChecklistItem[];
  riepilogo?: Record<string, unknown>;
}

// ── Legacy (kept for backward compat) ─────────
export interface VerifyRequest {
  dati_azienda: CompanyData;
  parametri_finanziari: ParametriFinanziari;
  scheda_bando: string;
}

export interface CalcoloFinanziario {
  successo: boolean;
  troncato?: boolean;
  investimento_effettivo?: number;
  contributo?: number;
  finanziamento?: number;
  totale_agevolabile?: number;
  aliquota_contributo?: number;
  aliquota_finanziamento?: number;
  errore?: string;
}

export interface Valutazione {
  conforme: boolean;
  stato: "VERDE" | "GIALLO" | "ROSSO" | "N/D";
  dettaglio: string;
}

export type AppStep = "upload" | "form" | "loading" | "results";
