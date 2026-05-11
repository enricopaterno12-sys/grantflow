export interface ParametriFinanziari {
  aliquota_contributo: number;
  aliquota_finanziamento: number;
  limite_min_investimento: number;
  limite_max_investimento: number;
  fatturato_minimo: number;
  bilanci_richiesti: number;
}

export interface CalcoloResult {
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

export interface ValutazioneResult {
  conforme: boolean;
  stato: "VERDE" | "GIALLO" | "ROSSO" | "N/D";
  dettaglio: string;
}

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

  calcola(investimento: number): CalcoloResult {
    if (this.limite_min > 0 && investimento < this.limite_min) {
      return {
        successo: false,
        errore: `Investimento (${investimento.toLocaleString("it-IT")}€) inferiore al minimo (${this.limite_min.toLocaleString("it-IT")}€)`,
        contributo: 0,
        finanziamento: 0,
        totale_agevolabile: 0,
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

  valida_bilanci(data_costituzione: string, bilanci_depositati: number): ValutazioneResult {
    if (this.bilanci_richiesti <= 0) {
      return { conforme: true, stato: "N/D", dettaglio: "Nessun vincolo bilanci" };
    }
    if (bilanci_depositati < this.bilanci_richiesti) {
      return {
        conforme: false,
        stato: "ROSSO",
        dettaglio: `Servono ${this.bilanci_richiesti} bilanci, disponibili ${bilanci_depositati}`,
      };
    }
    return {
      conforme: true,
      stato: "VERDE",
      dettaglio: `${bilanci_depositati}/${this.bilanci_richiesti} bilanci OK`,
    };
  }

  valida_fatturato(fatturato: number): ValutazioneResult {
    if (this.fatturato_minimo <= 0) {
      return { conforme: true, stato: "N/D", dettaglio: "Nessun vincolo fatturato" };
    }
    if (fatturato < this.fatturato_minimo) {
      return {
        conforme: false,
        stato: "ROSSO",
        dettaglio: `Fatturato ${fatturato.toLocaleString("it-IT")}€ < minimo ${this.fatturato_minimo.toLocaleString("it-IT")}€`,
      };
    }
    if (fatturato < this.fatturato_minimo * 1.2) {
      return {
        conforme: true,
        stato: "GIALLO",
        dettaglio: `Margine sicurezza insufficiente: ${fatturato.toLocaleString("it-IT")}€ vs ${this.fatturato_minimo.toLocaleString("it-IT")}€`,
      };
    }
    return { conforme: true, stato: "VERDE", dettaglio: "Fatturato conforme" };
  }
}
