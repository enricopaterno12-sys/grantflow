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
}

export interface VerifyRequest {
  dati_azienda: CompanyData;
  parametri_finanziari: ParametriFinanziari;
  scheda_bando: string;
}

export interface ParametriFinanziari {
  aliquota_contributo: number;
  aliquota_finanziamento: number;
  limite_min_investimento: number;
  limite_max_investimento: number;
  fatturato_minimo: number;
  bilanci_richiesti: number;
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

export interface AnalyzeResponse {
  testo_estratto: string;
  scheda: string;
  parametri_finanziari: ParametriFinanziari;
  visura_data?: {
    ragione_sociale: string;
    ateco: string;
  };
}

export interface VerifyResponse {
  calcolo_finanziario: CalcoloFinanziario;
  valutazione_bilanci: Valutazione;
  valutazione_fatturato: Valutazione;
  eligibility: string;
  business_plan: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  created_at: string;
  nome_azienda: string;
  esito_analisi: string;
  probabilita: number;
  link_al_report?: string;
  ateco?: string;
  investimento?: number;
  scheda_bando?: string;
  eligibility?: string;
  business_plan?: string;
  parametri_finanziari?: ParametriFinanziari;
  calcolo_finanziario?: CalcoloFinanziario;
}

export type AppStep = "upload" | "form" | "results";
