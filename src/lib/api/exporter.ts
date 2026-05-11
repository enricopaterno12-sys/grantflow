import type { CompanyData, CalcoloFinanziario, DeepScanResult, BusinessPlanResult, EligibilityResult, ChecklistItem } from "@/types";

function safeLocale(val: number | undefined | null, fallback = "—"): string {
  if (val == null || isNaN(val)) return fallback;
  return `€${val.toLocaleString("it-IT")}`;
}

function safeNum(val: number | undefined | null, fallback = "—"): string {
  if (val == null || isNaN(val)) return fallback;
  return val.toLocaleString("it-IT");
}

function safeInt(val: number | undefined | null, fallback = 1): number {
  if (val == null || isNaN(val) || val <= 0) return fallback;
  return Math.round(val);
}

export async function generaDossierDocx(params: {
  azienda: CompanyData;
  calcolo: CalcoloFinanziario;
  deepScan: DeepScanResult;
  businessPlan: BusinessPlanResult;
  eligibility: EligibilityResult;
  checklist: ChecklistItem[];
}): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType } = await import("docx");

  const inv = params.calcolo.investimento_effettivo ?? 0;
  const contr = params.calcolo.contributo ?? 0;
  const fin = params.calcolo.finanziamento ?? 0;
  const van = params.businessPlan?.van ?? 0;
  const irrVal = params.businessPlan?.irr ?? 0;
  const dscrVal = params.businessPlan?.dscr ?? 0;
  const payback = params.businessPlan?.payback_anni ?? 0;

  const eligibilityTableRows = [new TableRow({ children: [
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Criterio", bold: true })] })] }),
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Esito", bold: true })] })] }),
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Dettaglio", bold: true })] })] }),
  ] }),
  ...(params.eligibility.checks || []).map((c) =>
    new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.nome })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.status === "PASS" ? "✅ OK" : c.status === "WARN" ? "⚠️ Verifica" : "❌ Insufficiente" })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.dettaglio })] })] }),
    ] })
  )];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // ── Title Page ──
          new Paragraph({ spacing: { before: 3000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "GrantFlow AI", size: 52, bold: true, color: "10B981" })] }),
          new Paragraph({ spacing: { after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Dossier Tecnico — Progetto Agevolato", size: 32, color: "6B7280" })] }),
          new Paragraph({ spacing: { after: 100 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: params.azienda.ragione_sociale, size: 28, bold: true })] }),
          new Paragraph({ spacing: { after: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `ATECO: ${params.azienda.ateco}  •  ${new Date().toLocaleDateString("it-IT")}`, size: 22, color: "9CA3AF" })] }),

          // ── Sintesi ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 800 }, children: [new TextRun({ text: "1. Sintesi del Progetto", bold: true, size: 32 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Il presente dossier tecnico illustra il progetto agevolato di ${params.azienda.ragione_sociale}, con un investimento complessivo di ${safeLocale(inv)} di cui ${safeLocale(contr)} a contributo e ${safeLocale(fin)} a finanziamento agevolato.`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Eligibility: ${params.eligibility.overall} (${params.eligibility.probabilita}%). DSCR: ${dscrVal}. Payback: ${payback} anni.`, size: 22 })] }),
          ...(van < 0 ? [new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `⚠️ AVVERTENZA: VAN negativo (€${van.toLocaleString("it-IT")}) — il progetto potrebbe non generare valore sufficiente a coprire l'investimento.`, size: 22, color: "DC2626" })] })] : []),

          // ── Coerenza Bando ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "2. Coerenza con il Bando", bold: true, size: 32 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `ATECO ammessi: ${params.deepScan.ateco_ammessi?.join(", ") || "—"}`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Regimi di aiuto: ${params.deepScan.regimi_aiuto?.map((r) => `${r.tipo} (${r.regolamento}, ${r.intensita_massima}%)`).join("; ") || "—"}`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Criteri di valutazione: ${params.deepScan.criteri_valutazione?.map((c) => `${c.criterio} (${c.punteggio_massimo} pt)`).join("; ") || "—"}`, size: 22 })] }),

          // ── Eligibility Table ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "3. Verifica Eligibility", bold: true, size: 32 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Classificazione: ${params.eligibility.overall} — Probabilità: ${params.eligibility.probabilita}%`, size: 22 })] }),
          new Table({ rows: eligibilityTableRows }),

          // ── Piano Investimenti ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "4. Piano Investimenti", bold: true, size: 32 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Investimento: ${safeLocale(inv)}`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Contributo a fondo perduto: ${safeLocale(contr)} (${params.calcolo.aliquota_contributo || 0}%)`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Finanziamento agevolato: ${safeLocale(fin)} (${params.calcolo.aliquota_finanziamento || 0}%)`, size: 22 })] }),

          // ── Cronoprogramma ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "5. Cronoprogramma (Gantt)", bold: true, size: 32 })] }),
          new Table({
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fase", bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Durata", bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Periodo", bold: true })] })] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Avvio progetto" })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "2 mesi" })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mese 1-2" })] })] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Sviluppo / Acquisti" })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "6 mesi" })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mese 3-8" })] })] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Collaudo e rendicontazione" })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "4 mesi" })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mese 9-12" })] })] })] }),
            ],
          }),

          // ── Proiezioni Finanziarie ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "6. Proiezioni Finanziarie", bold: true, size: 32 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `DSCR: ${dscrVal}  |  VAN: ${safeLocale(van)}  |  IRR: ${irrVal}%  |  Payback: ${payback} anni`, size: 22 })] }),

          new Table({
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Anno", bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ricavi", bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Costi", bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Netto", bold: true })] })] })] }),
              ...(params.businessPlan?.cashflow || []).map((c) =>
                new TableRow({ children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(c.anno) })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `€${(c.ricavi || 0).toLocaleString("it-IT")}` })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `€${(c.costi || 0).toLocaleString("it-IT")}` })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `€${(c.netto || 0).toLocaleString("it-IT")}` })] })] }),
                ] })
              ),
            ],
          }),

          // ── Impatto Occupazionale ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "7. Impatto Occupazionale e Green", bold: true, size: 32 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Nuove assunzioni previste: ${safeInt(inv / 100000)} unità`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Riduzione impatto ambientale stimata: ${safeInt(contr / 5000)}% efficientamento energetico`, size: 22 })] }),

          // ── Documenti Necessari ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "8. Documenti Necessari", bold: true, size: 32 })] }),
          ...(params.checklist || []).map((item) =>
            new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `${item.completato ? "✅" : "⬜"} ${item.nome}${item.obbligatorio ? " (Obbligatorio)" : ""}`, size: 22 })] })
          ),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generaPitchPptx(params: {
  azienda: CompanyData;
  calcolo: CalcoloFinanziario;
  deepScan: DeepScanResult;
  businessPlan: BusinessPlanResult;
  eligibility: EligibilityResult;
}): Promise<Buffer> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "CUSTOM", width: 13.333, height: 7.5 });
  pptx.layout = "CUSTOM";

  const inv = params.calcolo.investimento_effettivo ?? 0;
  const contr = params.calcolo.contributo ?? 0;
  const fin = params.calcolo.finanziamento ?? 0;
  const van = params.businessPlan?.van ?? 0;
  const irrVal = params.businessPlan?.irr ?? 0;
  const dscrVal = params.businessPlan?.dscr ?? 0;
  const payback = params.businessPlan?.payback_anni ?? 0;

  // Slide 1: Title
  const s1 = pptx.addSlide();
  s1.background = { color: "0A0A0A" };
  s1.addText("GrantFlow AI", { x: 1, y: 1, w: 11.3, h: 1, fontSize: 40, color: "10B981", bold: true, align: "center" });
  s1.addText("Pitch di Presentazione", { x: 1, y: 2.2, w: 11.3, h: 0.8, fontSize: 24, color: "FFFFFF", align: "center" });
  s1.addText(params.azienda.ragione_sociale, { x: 1, y: 3.2, w: 11.3, h: 0.6, fontSize: 20, color: "9CA3AF", align: "center" });
  s1.addText(`ATECO: ${params.azienda.ateco}`, { x: 1, y: 4, w: 11.3, h: 0.5, fontSize: 14, color: "6B7280", align: "center" });
  s1.addText(new Date().toLocaleDateString("it-IT"), { x: 1, y: 5.5, w: 11.3, h: 0.5, fontSize: 12, color: "4B5563", align: "center" });

  // Slide 2: Overview
  const s2 = pptx.addSlide();
  s2.background = { color: "0A0A0A" };
  s2.addText("Overview Progetto", { x: 0.5, y: 0.3, w: 12, h: 0.8, fontSize: 28, color: "10B981", bold: true });
  s2.addText([
    { text: `Investimento: ${safeLocale(inv)}\n`, options: { fontSize: 18, color: "FFFFFF" } },
    { text: `Contributo: ${safeLocale(contr)} (${params.calcolo.aliquota_contributo || 0}%)\n`, options: { fontSize: 18, color: "34D399" } },
    { text: `Finanziamento: ${safeLocale(fin)} (${params.calcolo.aliquota_finanziamento || 0}%)\n`, options: { fontSize: 18, color: "FFFFFF" } },
    { text: `Eligibility: ${params.eligibility.overall} — ${params.eligibility.probabilita}%`, options: { fontSize: 18, color: "FCD34D" } },
  ], { x: 0.5, y: 1.5, w: 12, h: 3, lineSpacing: 28 });

  // Slide 3: Key Financials
  const s3 = pptx.addSlide();
  s3.background = { color: "0A0A0A" };
  s3.addText("Key Financials", { x: 0.5, y: 0.3, w: 12, h: 0.8, fontSize: 28, color: "10B981", bold: true });
  s3.addText([
    { text: `DSCR: ${dscrVal}\n`, options: { fontSize: 18, color: dscrVal >= 1 ? "34D399" : "EF4444" } },
    { text: `VAN: ${safeLocale(van)}\n`, options: { fontSize: 18, color: van >= 0 ? "FFFFFF" : "EF4444" } },
    { text: `IRR: ${irrVal}%\n`, options: { fontSize: 18, color: "FFFFFF" } },
    { text: `Payback: ${payback} anni\n`, options: { fontSize: 18, color: "FFFFFF" } },
    { text: `Contributo: ${safeLocale(contr)}`, options: { fontSize: 18, color: "34D399" } },
  ], { x: 0.5, y: 1.5, w: 12, h: 3.5, lineSpacing: 28 });
  if (van < 0) {
    s3.addText("⚠️ VAN negativo — verificare sostenibilità economica del progetto", { x: 0.5, y: 5.5, w: 12, h: 0.6, fontSize: 14, color: "EF4444" });
  }

  // Slide 4: ATECO + Requirements
  const s4 = pptx.addSlide();
  s4.background = { color: "0A0A0A" };
  s4.addText("Requisiti Bando", { x: 0.5, y: 0.3, w: 12, h: 0.8, fontSize: 28, color: "10B981", bold: true });
  s4.addText([
    { text: `ATECO ammessi: ${params.deepScan.ateco_ammessi?.join(", ") || "—"}\n`, options: { fontSize: 16, color: "FFFFFF" } },
    { text: `Regimi: ${params.deepScan.regimi_aiuto?.map((r) => `${r.tipo} (${r.intensita_massima}%)`).join(", ") || "—"}\n`, options: { fontSize: 16, color: "FFFFFF" } },
    { text: `Criteri: ${params.deepScan.criteri_valutazione?.map((c) => `${c.criterio} (${c.punteggio_massimo}pt)`).join(", ") || "—"}`, options: { fontSize: 16, color: "9CA3AF" } },
  ], { x: 0.5, y: 1.5, w: 12, h: 3, lineSpacing: 24 });

  // Slide 5: Eligibility Checks
  const s5 = pptx.addSlide();
  s5.background = { color: "0A0A0A" };
  s5.addText("Eligibility Checks", { x: 0.5, y: 0.3, w: 12, h: 0.8, fontSize: 28, color: "10B981", bold: true });
  const checkLines = (params.eligibility.checks || []).map((c) => ({
    text: `${c.status === "PASS" ? "✅" : c.status === "WARN" ? "⚠️" : "❌"} ${c.nome}: ${c.dettaglio}\n`,
    options: { fontSize: 14, color: c.status === "PASS" ? "34D399" : c.status === "WARN" ? "FCD34D" : "EF4444" },
  }));
  s5.addText(checkLines, { x: 0.5, y: 1.5, w: 12, h: 4.5, lineSpacing: 20 });
  s5.addText(`Classificazione: ${params.eligibility.overall} | Probabilità: ${params.eligibility.probabilita}%`, { x: 0.5, y: 6.2, w: 12, h: 0.5, fontSize: 16, color: "FCD34D", bold: true });

  // Slide 6: Cashflow Projections
  const s6 = pptx.addSlide();
  s6.background = { color: "0A0A0A" };
  s6.addText("Proiezioni Cashflow", { x: 0.5, y: 0.3, w: 12, h: 0.8, fontSize: 28, color: "10B981", bold: true });
  const cfText = (params.businessPlan?.cashflow || []).map((c) =>
    `Anno ${c.anno}:  Ricavi €${(c.ricavi || 0).toLocaleString("it-IT")}  |  Costi €${(c.costi || 0).toLocaleString("it-IT")}  |  Netto €${(c.netto || 0).toLocaleString("it-IT")}`
  ).join("\n");
  s6.addText(cfText, { x: 0.5, y: 1.5, w: 12, h: 4, fontSize: 14, color: "FFFFFF", lineSpacing: 22 });

  // Slide 7: Next Steps
  const s7 = pptx.addSlide();
  s7.background = { color: "0A0A0A" };
  s7.addText("Prossimi Passi", { x: 0.5, y: 0.3, w: 12, h: 0.8, fontSize: 28, color: "10B981", bold: true });
  s7.addText([
    { text: "1. Predisporre la documentazione necessaria\n", options: { fontSize: 16, color: "FFFFFF" } },
    { text: "2. Completare la domanda di agevolazione\n", options: { fontSize: 16, color: "FFFFFF" } },
    { text: "3. Verificare la capienza dei massimali De Minimis\n", options: { fontSize: 16, color: "FFFFFF" } },
    { text: "4. Acquisire preventivi (minimo 3 per voce di spesa)\n", options: { fontSize: 16, color: "FFFFFF" } },
    { text: "5. Inviare la domanda entro la scadenza del bando", options: { fontSize: 16, color: "FFFFFF" } },
  ], { x: 0.5, y: 1.5, w: 12, h: 4, lineSpacing: 26 });

  const result: any = await pptx.write({ outputType: "nodebuffer" });
  if (Buffer.isBuffer(result)) return result;
  if (result instanceof Uint8Array) return Buffer.from(result);
  return Buffer.from(result);
}
