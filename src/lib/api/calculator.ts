import type { ParametriFinanziari, Valutazione, CashflowProjection, BusinessPlanResult } from "@/types";

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
): BusinessPlanResult {
  const anni = 5;
  const tassoSconto = 0.08;

  const cashflow: CashflowProjection[] = [];
  let cumulato = -investimento + contributo;
  let paybackAnni = -1;

  for (let anno = 1; anno <= anni; anno++) {
    const crescita = 0.15 + (anno - 1) * 0.05;
    const ricavi = investimento * crescita;
    const costiOp = investimento * 0.08;
    const quotaFin = finanziamento / anni;
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

  const dscr = investimento > 0 ? (contributo + finanziamento) / investimento : 0;

  const flussi = cashflow.map((c) => c.netto);
  const van = -investimento + flussi.reduce((acc, val, i) => acc + val / Math.pow(1 + tassoSconto, i + 1), 0);
  const irr = calcolaIrr([-investimento, ...flussi]);

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

function calcolaIrr(flussi: number[], guess = 0.1): number {
  const precision = 1e-6;
  let x1 = guess;
  let iter = 0;
  do {
    const f1 = flussi.reduce((acc, val, i) => acc + val / Math.pow(1 + x1, i), 0);
    const f2 = flussi.reduce((acc, val, i) => acc - (i * val) / Math.pow(1 + x1, i + 1), 0);
    if (Math.abs(f2) < precision) break;
    const x2 = x1 - f1 / f2;
    if (Math.abs(x2 - x1) < precision) return x2;
    x1 = x2;
    iter++;
  } while (iter < 1000);
  return x1;
}
