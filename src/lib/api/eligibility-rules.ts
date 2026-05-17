import type { CompanyData, VincoliBando, EsitoCalcolato, FattoreEsito, ParametriFinanziari, CalcoloFinanziario } from "@/types";

export function calcolaEsitoDeterministico(
  company: CompanyData,
  vincoliRaw: Record<string, unknown>,
  parametri: ParametriFinanziari,
  calcolo: CalcoloFinanziario,
): EsitoCalcolato {
  const vs = (vincoliRaw.vincoli_soggettivi || {}) as Record<string, unknown>;
  const vf = (vincoliRaw.vincoli_finanziari || {}) as Record<string, unknown>;
  const dettagli: FattoreEsito[] = [];

  // Helper per match ATECO
  function matchAteco(ateco: string, pattern: string): boolean {
    return ateco.startsWith(pattern) || ateco.split(".")[0] === pattern;
  }

  // ═══════════════════════════════════════════
  // FASE 1 — FATTORI NON VARIABILI (bloccanti)
  // ═══════════════════════════════════════════
  let blocco = false;

  // 1a. ATECO
  const ateco = company.ateco || "";
  const atecoAmmessi = (vs.ateco_ammessi as string[]) || [];
  const atecoEsclusi = (vs.ateco_esclusi as string[]) || [];

  const isEscluso = atecoEsclusi.some((e) => matchAteco(ateco, e));
  const hasAmmessi = atecoAmmessi.length > 0;
  const isAmmesso = hasAmmessi ? atecoAmmessi.some((a) => matchAteco(ateco, a)) : true;

  if (isEscluso || (hasAmmessi && !isAmmesso)) {
    blocco = true;
    dettagli.push({
      fattore: "ATECO",
      tipo: "non_variabile",
      esito: "KO",
      dettaglio: `ATECO ${ateco} non ammesso dal bando. ${isEscluso ? "Esplicitamente escluso." : ""} ${hasAmmessi ? `Ammessi: ${atecoAmmessi.join(", ")}` : ""}`,
    });
  } else {
    dettagli.push({
      fattore: "ATECO",
      tipo: "non_variabile",
      esito: "OK",
      dettaglio: `ATECO ${ateco} compatibile con i requisiti del bando`,
    });
  }

  // 1b. Sede / Provincia
  const provinceAmmesse = (vs.province_ammesse as string[]) || [];
  if (provinceAmmesse.length > 0) {
    const sede = (company.sede_legale || company.regione || "").toLowerCase();
    const compatibile = provinceAmmesse.some((p) => sede.includes(p.toLowerCase()));
    if (!compatibile) {
      blocco = true;
      dettagli.push({
        fattore: "Sede legale/operativa",
        tipo: "non_variabile",
        esito: "KO",
        dettaglio: `Sede non ricadente nelle province ammesse: ${provinceAmmesse.join(", ")}`,
      });
    } else {
      dettagli.push({
        fattore: "Sede legale/operativa",
        tipo: "non_variabile",
        esito: "OK",
        dettaglio: `Sede compatibile con le province ammesse`,
      });
    }
  }

  // 1c. Dimensione aziendale
  const dimensioniAmmesse = (vs.dimensione_ammessa as string[]) || [];
  if (dimensioniAmmesse.length > 0 && company.dimensione) {
    const compatibile = dimensioniAmmesse.some(
      (d) => company.dimensione!.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(company.dimensione!.toLowerCase()),
    );
    if (!compatibile) {
      blocco = true;
      dettagli.push({
        fattore: "Dimensione aziendale",
        tipo: "non_variabile",
        esito: "KO",
        dettaglio: `Dimensione "${company.dimensione}" non ammessa. Richieste: ${dimensioniAmmesse.join(", ")}`,
      });
    } else {
      dettagli.push({
        fattore: "Dimensione aziendale",
        tipo: "non_variabile",
        esito: "OK",
        dettaglio: `Dimensione "${company.dimensione}" compatibile`,
      });
    }
  }

  // Se un blocco non variabile, esito ROSSO immediato
  if (blocco) {
    return {
      rating: "ROSSO",
      probabilita: 0,
      dettagli,
      scudo_anti_errore: `Richiesta non ammissibile: ${dettagli.filter((d) => d.esito === "KO").map((d) => d.fattore).join(", ")}. Non supera i requisiti bloccanti del bando.`,
      contributo_massimo_concedibile: 0,
      intensita_aiuto: 0,
      regime_aiuti: (vf.regime_aiuto as string) || "N/D",
    };
  }

  // ═══════════════════════════════════════════
  // FASE 2 — FATTORI VARIABILI
  // ═══════════════════════════════════════════
  let criticità = 0;
  let totaleVariabili = 0;
  const messaggiRisoluzione: string[] = [];

  // 2a. Investimento
  const invMin = (vf.investimento_minimo as number) || parametri.limite_min_investimento || 0;
  const invMax = (vf.investimento_massimo as number) || parametri.limite_max_investimento || 0;
  const investimento = company.investimento || 0;

  if (invMin || invMax) {
    totaleVariabili++;
    if (invMin > 0 && investimento < invMin) {
      criticità++;
      dettagli.push({
        fattore: "Investimento minimo",
        tipo: "variabile",
        esito: "DUBBIO",
        dettaglio: `Investimento €${investimento.toLocaleString()} sotto la soglia minima di €${invMin.toLocaleString()}. Può essere aumentato.`,
      });
      messaggiRisoluzione.push(`Investimento €${investimento.toLocaleString()} < minimo €${invMin.toLocaleString()}. Aumentare a €${invMin.toLocaleString()}.`);
    } else if (invMax > 0 && investimento > invMax) {
      criticità++;
      dettagli.push({
        fattore: "Investimento massimo",
        tipo: "variabile",
        esito: "DUBBIO",
        dettaglio: `Investimento €${investimento.toLocaleString()} supera il massimale di €${invMax.toLocaleString()}. Ridurre a €${invMax.toLocaleString()}.`,
      });
      messaggiRisoluzione.push(`Investimento €${investimento.toLocaleString()} > massimale €${invMax.toLocaleString()}. Ridurre a €${invMax.toLocaleString()}.`);
    } else {
      dettagli.push({
        fattore: "Investimento",
        tipo: "variabile",
        esito: "OK",
        dettaglio: `Investimento €${investimento.toLocaleString()} nel range ammesso`,
      });
    }
  }

  // 2b. De Minimis
  const deMinimisImporto = company.de_minimis_importo || 0;
  const contributoCalcolato = calcolo.contributo || 0;
  if (deMinimisImporto > 0) {
    totaleVariabili++;
    const totaleAiuti = deMinimisImporto + contributoCalcolato;
    if (totaleAiuti > 300000) {
      criticità++;
      dettagli.push({
        fattore: "De Minimis",
        tipo: "variabile",
        esito: "DUBBIO",
        dettaglio: `Aiuti totali €${totaleAiuti.toLocaleString()} (già ricevuti €${deMinimisImporto.toLocaleString()} + nuovo contributo €${contributoCalcolato.toLocaleString()}) superano massimale €300.000. Verificare plafond residuo.`,
      });
      messaggiRisoluzione.push(`De Minimis: totale €${totaleAiuti.toLocaleString()} > €300.000. Verificare plafond o ridurre contributo.`);
    } else {
      dettagli.push({
        fattore: "De Minimis",
        tipo: "variabile",
        esito: "OK",
        dettaglio: `Aiuti totali €${totaleAiuti.toLocaleString()} entro il massimale €300.000`,
      });
    }
  }

  // 2c. Fatturato minimo
  const fattMin = (vf.fatturato_minimo as number) || parametri.fatturato_minimo || 0;
  if (fattMin > 0) {
    totaleVariabili++;
    if ((company.fatturato || 0) < fattMin) {
      criticità++;
      dettagli.push({
        fattore: "Fatturato minimo",
        tipo: "variabile",
        esito: "DUBBIO",
        dettaglio: `Fatturato €${(company.fatturato || 0).toLocaleString()} inferiore al minimo richiesto €${fattMin.toLocaleString()}`,
      });
      messaggiRisoluzione.push(`Fatturato €${(company.fatturato || 0).toLocaleString()} < minimo €${fattMin.toLocaleString()}. Attendibile solo su dichiarazione.`);
    } else {
      dettagli.push({
        fattore: "Fatturato minimo",
        tipo: "variabile",
        esito: "OK",
        dettaglio: `Fatturato €${(company.fatturato || 0).toLocaleString()} >= minimo €${fattMin.toLocaleString()}`,
      });
    }
  }

  // 2d. Bilanci richiesti
  const bilReq = (vf.bilanci_richiesti as number) || parametri.bilanci_richiesti || 0;
  if (bilReq > 0 && company.data_costituzione) {
    totaleVariabili++;
    const anni = new Date().getFullYear() - new Date(company.data_costituzione).getFullYear();
    if (anni < bilReq) {
      criticità++;
      dettagli.push({
        fattore: "Bilanci richiesti",
        tipo: "variabile",
        esito: "DUBBIO",
        dettaglio: `Azienda costituita da ${anni} anni, bando richiede ${bilReq} bilanci`,
      });
      messaggiRisoluzione.push(`Anzianità ${anni} anni, richiesti ${bilReq} bilanci. Verificare se bilanci ridotti accettati.`);
    } else {
      dettagli.push({
        fattore: "Bilanci richiesti",
        tipo: "variabile",
        esito: "OK",
        dettaglio: `Azienda costituita da ${anni} anni, bilanci sufficienti`,
      });
    }
  }

  // ═══════════════════════════════════════════
  // FASE 3 — ASSEGNAZIONE ESITO
  // ═══════════════════════════════════════════

  // Calcolo contributo massimo concedibile
  const intensita = (vf.intensita_contributo_percentuale as number) || parametri.aliquota_contributo || 0;
  const maxInv = invMax > 0 ? Math.min(investimento, invMax) : investimento;
  let contributoMassimo = intensita > 0 ? Math.round(maxInv * intensita / 100) : calcolo.contributo || 0;
  const massimaleContributo = vf.massimale_contributo as number;
  if (massimaleContributo && massimaleContributo > 0) {
    contributoMassimo = Math.min(contributoMassimo, massimaleContributo);
  }

  // Regime aiuti
  const regime = (vf.regime_aiuto as string) || "N/D";

  if (criticità === 0) {
    // Tutto ok
    return {
      rating: "VERDE",
      probabilita: 100,
      dettagli,
      scudo_anti_errore: "Tutti i requisiti (variabili e non variabili) sono verificati. Nessun dubbio documentale o di conformità.",
      contributo_massimo_concedibile: contributoMassimo,
      intensita_aiuto: intensita,
      regime_aiuti: regime,
    };
  }

  // Calcolo percentuale GIALLO: penalità per ogni criticità
  const penalitaPerCriticita = Math.min(50, Math.round((criticità / Math.max(totaleVariabili, 1)) * 50));
  const probabilita = Math.max(30, 100 - penalitaPerCriticita);
  const suggerimenti = messaggiRisoluzione.length > 0 ? " Suggerimenti: " + messaggiRisoluzione.join(" ") : "";

  return {
    rating: "GIALLO",
    probabilita,
    dettagli,
    scudo_anti_errore: `Ammissibile con riserva: ${criticità} criticità su fattori variabili (investimento, documentale, de minimis).${suggerimenti}`,
    contributo_massimo_concedibile: contributoMassimo,
    intensita_aiuto: intensita,
    regime_aiuti: regime,
  };
}

export function calcoloSenzaVincoli(
  company: CompanyData,
  parametri: ParametriFinanziari,
  calcolo: CalcoloFinanziario,
): EsitoCalcolato {
  const dettagli: FattoreEsito[] = [
    {
      fattore: "Vincoli bando",
      tipo: "non_variabile",
      esito: "DUBBIO",
      dettaglio: "Bando non analizzabile: dati vincoli non disponibili. Verifica manuale richiesta.",
    },
  ];

  return {
    rating: "GRIGIO",
    probabilita: 0,
    dettagli,
    scudo_anti_errore: "Incapacità di determinazione per mancanza dati sui vincoli del bando. Verifica manuale richiesta.",
    contributo_massimo_concedibile: calcolo.contributo || 0,
    intensita_aiuto: parametri.aliquota_contributo || 0,
    regime_aiuti: "N/D",
  };
}
