import type { CompanyData, DeepScanResult, EligibilityResult, EligibilityCheck } from "@/types";

export function verificaEligibilityAutomatica(
  azienda: CompanyData,
  deepScan: DeepScanResult,
  parametri: { fatturato_minimo: number; bilanci_richiesti: number },
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
      status: "WARN",
      dettaglio: `ATECO ${ateco} non presente nell'elenco ammessi — verificare compatibilità`,
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

  // 4. Soggetti ammissibili
  const dim = azienda.dimensione || "";
  const dimMatch = deepScan.soggetti_ammissibili.some(
    (s) => dim.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(dim.toLowerCase()),
  );
  if (deepScan.soggetti_ammissibili.length > 0 && !dimMatch && dim) {
    checks.push({
      nome: "Dimensione Impresa",
      status: "WARN",
      dettaglio: `"${dim}" non tra i soggetti ammessi: ${deepScan.soggetti_ammissibili.join(", ")}`,
    });
  }

  // 5. Regione (se specificata nel bando)
  const regione = azienda.regione || "";
  if (regione) {
    const reqRegione = deepScan.requisiti_accesso.find((r) =>
      r.toLowerCase().includes("region") || r.toLowerCase().includes("sede"),
    );
    if (reqRegione) {
      checks.push({
        nome: "Requisiti Territoriali",
        status: "PASS",
        dettaglio: `Sede in ${regione} — ${reqRegione}`,
      });
    }
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
