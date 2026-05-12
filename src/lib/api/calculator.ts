import type { ParametriFinanziari, Valutazione, CashflowProjection, BusinessPlanResult, IndipendenzaFinanziaria } from "@/types";

export class CalcolatoreFinanziario {
  private aliquota_contributo: number;
  private aliquota_finanziamento: number;
  private limite_min: number;
  private limite_max: number;
  private fatturato_minimo: number;
  private bilanci_richiesti: number;

  constructor(parametri: ParametriFinanziari) {
    this.aliquota_contributo = parametri.aliquota_contributo || 0;
    this.aliquota_finanziamento = parametri.aliquota_finanziamento || 0;
    this.limite_min = parametri.limite_min_investimento || 0;
    this.limite_max = parametri.limite_max_investimento || 0;
    this.fatturato_minimo = parametri.fatturato_minimo || 0;
    this.bilanci_richiesti = parametri.bilanci_richiesti || 0;
  }

  calcola(investimento: number) {
    if (this.limite_min > 0 && investimento < this.limite_min) {
      return {
        successo: false,
        errore: `Investimento (€${investimento.toLocaleString("it-IT")}) < minimo (€${this.limite_min.toLocaleString("it-IT")})`,
        contributo: 0, finanziamento: 0, totale_agevolabile: 0,
      };
    }
    let troncato = false;
    if (this.limite_max > 0 && investimento > this.limite_max) {
      investimento = this.limite_max;
      troncato = true;
    }
    const contributo = investimento * (this.aliquota_contributo / 100);
    const finanziamento = investimento * (this.aliquota_finanziamento / 100);
    return {
      successo: true,
      troncato,
      investimento_effettivo: investimento,
      contributo,
      finanziamento,
      totale_agevolabile: contributo + finanziamento,
      aliquota_contributo: this.aliquota_contributo,
      aliquota_finanziamento: this.aliquota_finanziamento,
    };
  }

  valida_bilanci(data_costituzione: string, bilanci_depositati: number): Valutazione {
    if (this.bilanci_richiesti <= 0)
      return { conforme: true, stato: "N/D", dettaglio: "Nessun vincolo bilanci" };
    if (bilanci_depositati < this.bilanci_richiesti)
      return { conforme: false, stato: "ROSSO", dettaglio: `Servono ${this.bilanci_richiesti} bilanci, disponibili ${bilanci_depositati}` };
    return { conforme: true, stato: "VERDE", dettaglio: `${bilanci_depositati}/${this.bilanci_richiesti} bilanci OK` };
  }

  valida_fatturato(fatturato: number): Valutazione {
    if (this.fatturato_minimo <= 0)
      return { conforme: true, stato: "N/D", dettaglio: "Nessun vincolo fatturato" };
    if (fatturato < this.fatturato_minimo)
      return { conforme: false, stato: "ROSSO", dettaglio: `Fatturato €${fatturato.toLocaleString("it-IT")} < minimo €${this.fatturato_minimo.toLocaleString("it-IT")}` };
    if (fatturato < this.fatturato_minimo * 1.2)
      return { conforme: true, stato: "GIALLO", dettaglio: `Margine sicurezza insufficiente: €${fatturato.toLocaleString("it-IT")} vs €${this.fatturato_minimo.toLocaleString("it-IT")}` };
    return { conforme: true, stato: "VERDE", dettaglio: "Fatturato conforme" };
  }
}

export function calcolaBusinessPlan(
  investimento: number,
  contributo: number,
  finanziamento: number,
  utileNetto?: number,
): BusinessPlanResult {
  const anni = 5;
  const tassoSconto = 0.08;
  const rataFinanziamento = anni > 0 ? finanziamento / anni : 0;

  const cashflow: CashflowProjection[] = [];
  let cumulato = -investimento + contributo;
  let paybackAnni = -1;

  for (let anno = 1; anno <= anni; anno++) {
    const crescita = 0.15 + (anno - 1) * 0.05;
    const ricavi = investimento * crescita;
    const costiOp = investimento * 0.08;
    const quotaFin = rataFinanziamento;
    const ammortamento = investimento / anni;
    const costi = costiOp + quotaFin + ammortamento;
    const netto = ricavi - costi;
    cumulato += netto;
    if (paybackAnni < 0 && cumulato >= 0) paybackAnni = anno;
    cashflow.push({
      anno,
      ricavi: Math.round(ricavi),
      costi: Math.round(costi),
      netto: Math.round(netto),
    });
  }

  if (paybackAnni < 0) paybackAnni = anni + 1;

  // DSCR: utile_netto / rata_finanziamento (fallback a EBITDA medio se utile_netto non disponibile)
  const ebitdaMedio = cashflow.reduce((acc, c) => acc + (c.ricavi - Math.round(investimento * 0.08)), 0) / anni;
  const dscrBase = (utileNetto != null && utileNetto > 0) ? utileNetto : ebitdaMedio;
  const dscr = rataFinanziamento > 0 ? dscrBase / rataFinanziamento : 0;

  const flussi = cashflow.map((c) => c.netto);
  const van = -investimento + flussi.reduce((acc, val, i) => acc + val / Math.pow(1 + tassoSconto, i + 1), 0);
  const irr = calcolaIrrSicuro([-investimento, ...flussi]);

  return {
    dscr: Math.round(dscr * 100) / 100,
    payback_anni: paybackAnni,
    van: Math.round(van),
    irr: Math.round(irr * 100) / 100,
    cashflow,
    contributo: Math.round(contributo),
    finanziamento: Math.round(finanziamento),
    investimento_totale: Math.round(investimento),
  };
}

export function calcolaPayback(
  investimento: number,
  contributo: number,
  rataFinanziamento: number,
  proiezioni: { netto: number }[],
): { anni: number; raggiunto: boolean; messaggio: string } {
  let cumulato = -investimento + contributo;
  const anni = proiezioni.length;
  for (let i = 0; i < anni; i++) {
    cumulato += proiezioni[i].netto;
    if (cumulato >= 0) {
      return { anni: i + 1, raggiunto: true, messaggio: `Payback a ${i + 1} anni` };
    }
  }
  return { anni: anni + 1, raggiunto: false, messaggio: `Payback > ${anni} anni — non raggiunto nel periodo` };
}

function npv(rate: number, flussi: number[]): number {
  return flussi.reduce((acc, val, i) => acc + val / Math.pow(1 + rate, i), 0);
}

function calcolaIrrSicuro(flussi: number[]): number {
  const precision = 1e-6;
  const maxIter = 200;

  // Newton
  let x = 0.1;
  for (let iter = 0; iter < maxIter; iter++) {
    const f1 = npv(x, flussi);
    const f2 = flussi.reduce((acc, val, i) => acc - (i * val) / Math.pow(1 + x, i + 1), 0);
    if (Math.abs(f2) < 1e-12) break;
    const xNew = x - f1 / f2;
    if (Math.abs(xNew - x) < precision) {
      if (xNew > -0.999 && xNew < 10) return xNew;
      break;
    }
    x = xNew;
  }

  // Fallback bisezione
  let lo = -0.99, hi = 10.0;
  let fLo = npv(lo, flussi);
  let fHi = npv(hi, flussi);
  if (fLo * fHi > 0) return 0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flussi);
    if (Math.abs(fMid) < precision) return mid;
    if (fLo * fMid <= 0) { hi = mid; fHi = fMid; }
    else { lo = mid; fLo = fMid; }
  }
  return 0;
}

export function calcolaIndipendenzaFinanziaria(
  patrimonioNetto: number,
  debitiFinanziari: number,
): IndipendenzaFinanziaria {
  if (!debitiFinanziari || debitiFinanziari <= 0) {
    return { indice: 1.0, stato: "VERDE", dettaglio: "Nessun debito finanziario" };
  }
  const indice = patrimonioNetto / debitiFinanziari;
  if (indice >= 1.0) {
    return { indice: Math.round(indice * 100) / 100, stato: "VERDE", dettaglio: `Patrimonio netto copre i debiti finanziari (x${indice.toFixed(2)})` };
  }
  if (indice >= 0.5) {
    return { indice: Math.round(indice * 100) / 100, stato: "GIALLO", dettaglio: `Patrimonio netto copre il ${Math.round(indice * 100)}% dei debiti` };
  }
  return { indice: Math.round(indice * 100) / 100, stato: "ROSSO", dettaglio: `Patrimonio netto insufficiente — copre solo il ${Math.round(indice * 100)}% dei debiti` };
}
