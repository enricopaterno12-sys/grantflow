import type { CompanyData, DeepScanResult, EligibilityResult, EligibilityCheck } from "@/types";

export function verificaEligibilityAutomatica(
  azienda: CompanyData,
  deepScan: DeepScanResult,
  parametri: { fatturato_minimo: number; bilanci_richiesti: number; limite_min_investimento: number; limite_max_investimento: number },
  anniAttivita: number,
): EligibilityResult {
  const checks: EligibilityCheck[] = [];

  // 1. ATECO check
  const ateco = azienda.ateco?.trim() || "";
  const atecoMatch = deepScan.ateco_ammessi.some(
    (a) => ateco.startsWith(a.slice(0, 4)) || a.startsWith(ateco.slice(0, 4)),
  );
  const atecoExcluded = deepScan.ateco_esclusi.some(
    (a) => ateco.startsWith(a.slice(0, 4)) || a.startsWith(ateco.slice(0, 4)),
  );

  if (atecoExcluded) {
    checks.push({
      nome: "Codice ATECO",
      status: "FAIL",
      dettaglio: `ATECO ${ateco} è esplicitamente escluso dal bando`,
      riferimento: deepScan.riferimenti[0]?.articolo,
    });
  } else if (atecoMatch) {
    checks.push({
      nome: "Codice ATECO",
      status: "PASS",
      dettaglio: `ATECO ${ateco} ammesso — coerente con i target del bando`,
      riferimento: deepScan.riferimenti[0]?.articolo,
    });
  } else {
    checks.push({
      nome: "Codice ATECO",
      status: "FAIL",
      dettaglio: `ATECO ${ateco} non presente nell'elenco ammessi — probabilmente non compatibile`,
    });
  }

  // 2. Anzianità / bilanci
  const bilanciRichiesti = parametri.bilanci_richiesti || 0;
  if (bilanciRichiesti > 0) {
    if (anniAttivita >= bilanciRichiesti) {
      checks.push({
        nome: "Anzianità e Bilanci",
        status: "PASS",
        dettaglio: `${anniAttivita} anni di attività — ${bilanciRichiesti} bilanci richiesti soddisfatti`,
      });
    } else {
      checks.push({
        nome: "Anzianità e Bilanci",
        status: "FAIL",
        dettaglio: `${anniAttivita} anni di attività — insufficiente per i ${bilanciRichiesti} bilanci richiesti`,
      });
    }
  }

  // 3. Fatturato
  const fattMin = parametri.fatturato_minimo || 0;
  const fattAzienda = azienda.fatturato || 0;
  if (fattMin > 0) {
    if (fattAzienda >= fattMin) {
      const margine = ((fattAzienda - fattMin) / fattMin) * 100;
      if (margine < 20) {
        checks.push({
          nome: "Fatturato Minimo",
          status: "WARN",
          dettaglio: `Fatturato €${fattAzienda.toLocaleString("it-IT")} ≥ minimo €${fattMin.toLocaleString("it-IT")} ma margine solo ${Math.round(margine)}% — rischio istruttorio`,
        });
      } else {
        checks.push({
          nome: "Fatturato Minimo",
          status: "PASS",
          dettaglio: `Fatturato €${fattAzienda.toLocaleString("it-IT")} ≥ minimo €${fattMin.toLocaleString("it-IT")} — margine ${Math.round(margine)}%`,
        });
      }
    } else {
      checks.push({
        nome: "Fatturato Minimo",
        status: "FAIL",
        dettaglio: `Fatturato €${fattAzienda.toLocaleString("it-IT")} < minimo €${fattMin.toLocaleString("it-IT")}`,
      });
    }
  }

  // 4. Dimensione Impresa
  const dim = azienda.dimensione || "";
  if (deepScan.soggetti_ammissibili.length > 0 && dim) {
    const dimMatch = deepScan.soggetti_ammissibili.some(
      (s) => dim.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(dim.toLowerCase()),
    );
    if (!dimMatch) {
      checks.push({
        nome: "Dimensione Impresa",
        status: "WARN",
        dettaglio: `"${dim}" non tra i soggetti ammessi: ${deepScan.soggetti_ammissibili.join(", ")}`,
      });
    } else {
      checks.push({
        nome: "Dimensione Impresa",
        status: "PASS",
        dettaglio: `"${dim}" inclusa tra i soggetti ammessi dal bando`,
      });
    }
  }

  // 5. Range Investimento
  const investimento = azienda.investimento || 0;
  const limiteMin = parametri.limite_min_investimento || 0;
  const limiteMax = parametri.limite_max_investimento || 0;
  if (investimento > 0 && (limiteMin > 0 || limiteMax > 0)) {
    if (limiteMin > 0 && investimento < limiteMin) {
      checks.push({
        nome: "Range Investimento",
        status: "FAIL",
        dettaglio: `Investimento €${investimento.toLocaleString("it-IT")} < minimo €${limiteMin.toLocaleString("it-IT")}`,
      });
    } else if (limiteMax > 0 && investimento > limiteMax) {
      checks.push({
        nome: "Range Investimento",
        status: "WARN",
        dettaglio: `Investimento €${investimento.toLocaleString("it-IT")} > massimo €${limiteMax.toLocaleString("it-IT")} — verrà troncato al massimale`,
      });
    } else {
      checks.push({
        nome: "Range Investimento",
        status: "PASS",
        dettaglio: `Investimento €${investimento.toLocaleString("it-IT")} nel range €${limiteMin.toLocaleString("it-IT")} – €${limiteMax.toLocaleString("it-IT")}`,
      });
    }
  }

  // 6. Sede Operativa
  const regione = azienda.regione || "";
  if (regione && deepScan.requisiti_accesso.length > 0) {
    const reqRegione = deepScan.requisiti_accesso.find((r) =>
      r.toLowerCase().includes("region") || r.toLowerCase().includes("sede"),
    );
    if (reqRegione) {
      checks.push({
        nome: "Sede Operativa",
        status: "PASS",
        dettaglio: `Sede in ${regione} — requisito: ${reqRegione}`,
      });
    } else {
      checks.push({
        nome: "Sede Operativa",
        status: "WARN",
        dettaglio: `Sede in ${regione} — nessun vincolo territoriale specifico rilevato dal bando`,
      });
    }
  }

  // 7. Stato Registrazione (data costituzione valida)
  if (azienda.data_costituzione) {
    const dc = new Date(azienda.data_costituzione);
    if (!isNaN(dc.getTime())) {
      if (dc > new Date()) {
        checks.push({
          nome: "Stato Registrazione",
          status: "FAIL",
          dettaglio: `Data costituzione (${azienda.data_costituzione}) è nel futuro — verificare`,
        });
      } else {
        checks.push({
          nome: "Stato Registrazione",
          status: "PASS",
          dettaglio: `Costituita il ${azienda.data_costituzione} — regolare`,
        });
      }
    } else {
      checks.push({
        nome: "Stato Registrazione",
        status: "WARN",
        dettaglio: "Data costituzione non valida",
      });
    }
  }

  // 8. De Minimis
  const deMinimisImporto = azienda.de_minimis_importo || 0;
  if (deMinimisImporto > 0) {
    if (deMinimisImporto > 300000) {
      checks.push({
        nome: "De Minimis",
        status: "FAIL",
        dettaglio: `Importo de minimis €${deMinimisImporto.toLocaleString("it-IT")} > massimale €300.000 — cumulo non consentito`,
      });
    } else if (deMinimisImporto > 200000) {
      checks.push({
        nome: "De Minimis",
        status: "WARN",
        dettaglio: `Importo de minimis €${deMinimisImporto.toLocaleString("it-IT")} — vicino al massimale €300.000`,
      });
    } else {
      checks.push({
        nome: "De Minimis",
        status: "PASS",
        dettaglio: `Importo de minimis €${deMinimisImporto.toLocaleString("it-IT")} — sotto massimale €300.000`,
      });
    }
  }

  // 9. Procedure Concorsuali
  const hasProcedure = azienda.procedure_concorsuali;
  if (hasProcedure) {
    checks.push({
      nome: "Procedure Concorsuali",
      status: "FAIL",
      dettaglio: "Procedura concorsuale in corso — non ammissibile alla generalità dei bandi",
    });
  } else {
    checks.push({
      nome: "Procedure Concorsuali",
      status: "PASS",
      dettaglio: "Nessuna procedura concorsuale in corso",
    });
  }

  // Overall
  const failCount = checks.filter((c) => c.status === "FAIL").length;
  const warnCount = checks.filter((c) => c.status === "WARN").length;

  let overall: "VERDE" | "GIALLO" | "ROSSO";
  let probabilita: number;

  if (failCount > 0) {
    overall = "ROSSO";
    probabilita = Math.max(10, 50 - failCount * 20);
  } else if (warnCount > 0) {
    overall = "GIALLO";
    probabilita = Math.max(30, 70 - warnCount * 15);
  } else {
    overall = "VERDE";
    probabilita = Math.min(95, 75 + checks.filter((c) => c.status === "PASS").length * 5);
  }

  const motivazioni = checks
    .filter((c) => c.status !== "PASS")
    .map((c) => `${c.status === "FAIL" ? "❌" : "⚠️"} ${c.nome}: ${c.dettaglio}`)
    .join("\n");

  return { overall, probabilita, checks, motivazioni };
}
