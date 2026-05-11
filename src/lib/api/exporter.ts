import type { CompanyData, CalcoloFinanziario, DeepScanResult, BusinessPlanResult, EligibilityResult, ChecklistItem } from "@/types";

export async function generaDossierDocx(params: {
  azienda: CompanyData;
  calcolo: CalcoloFinanziario;
  deepScan: DeepScanResult;
  businessPlan: BusinessPlanResult;
  eligibility: EligibilityResult;
  checklist: ChecklistItem[];
}): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle } = await import("docx");

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
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Il presente dossier tecnico illustra il progetto agevolato di ${params.azienda.ragione_sociale}, con un investimento complessivo di €${params.calcolo.investimento_effettivo?.toLocaleString("it-IT") || "—"} di cui €${params.calcolo.contributo?.toLocaleString("it-IT") || "—"} a contributo e €${params.calcolo.finanziamento?.toLocaleString("it-IT") || "—"} a finanziamento agevolato.`, size: 22 })] }),

          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Eligibility: ${params.eligibility.overall} (${params.eligibility.probabilita}%). DSCR: ${params.businessPlan.dscr}. Payback: ${params.businessPlan.payback_anni} anni.`, size: 22 })] }),

          // ── Coerenza Bando ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "2. Coerenza con il Bando", bold: true, size: 32 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `ATECO ammessi: ${params.deepScan.ateco_ammessi.join(", ") || "—"}`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Regimi di aiuto: ${params.deepScan.regimi_aiuto.map((r) => `${r.tipo} (${r.regolamento}, ${r.intensita_massima}%)`).join("; ") || "—"}`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Criteri di valutazione: ${params.deepScan.criteri_valutazione.map((c) => `${c.criterio} (${c.punteggio_massimo} pt)`).join("; ") || "—"}`, size: 22 })] }),

          // ── Eligibility ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "3. Verifica Eligibility", bold: true, size: 32 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Classificazione: ${params.eligibility.overall} — Probabilità: ${params.eligibility.probabilita}%`, size: 22 })] }),
          ...params.eligibility.checks.map((c) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `${c.status === "PASS" ? "✅" : c.status === "WARN" ? "⚠️" : "❌"} ${c.nome}: ${c.dettaglio}`, size: 22 })] })),

          // ── Piano Investimenti ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "4. Piano Investimenti", bold: true, size: 32 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Investimento: €${params.calcolo.investimento_effettivo?.toLocaleString("it-IT") || "—"}`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Contributo a fondo perduto: €${params.calcolo.contributo?.toLocaleString("it-IT") || "—"} (${params.calcolo.aliquota_contributo || 0}%)`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Finanziamento agevolato: €${params.calcolo.finanziamento?.toLocaleString("it-IT") || "—"} (${params.calcolo.aliquota_finanziamento || 0}%)`, size: 22 })] }),

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
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `DSCR: ${params.businessPlan.dscr}  |  VAN: €${params.businessPlan.van.toLocaleString("it-IT")}  |  IRR: ${params.businessPlan.irr}%  |  Payback: ${params.businessPlan.payback_anni} anni`, size: 22 })] }),

          new Table({
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Anno", bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ricavi", bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Costi", bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Netto", bold: true })] })] })] }),
              ...params.businessPlan.cashflow.map((c) =>
                new TableRow({ children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(c.anno) })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `€${c.ricavi.toLocaleString("it-IT")}` })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `€${c.costi.toLocaleString("it-IT")}` })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `€${c.netto.toLocaleString("it-IT")}` })] })] }),
                ] })
              ),
            ],
          }),

          // ── Impatto Occupazionale ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "7. Impatto Occupazionale e Green", bold: true, size: 32 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Nuove assunzioni previste: ${Math.max(1, Math.round(params.calcolo.investimento_effettivo! / 100000))} unità`, size: 22 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Riduzione impatto ambientale stimata: ${Math.round(params.calcolo.contributo! / 5000)}% efficientamento energetico`, size: 22 })] }),

          // ── Documenti Necessari ──
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 600 }, children: [new TextRun({ text: "8. Documenti Necessari", bold: true, size: 32 })] }),
          ...params.checklist.map((item) =>
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

  // Slide 1: Title
  const s1 = pptx.addSlide();
  s1.background = { color: "0A0A0A" };
  s1.addText("GrantFlow AI", { x: 1, y: 1.5, w: 8, h: 1, fontSize: 36, color: "10B981", bold: true, align: "center" });
  s1.addText("Pitch di Presentazione", { x: 1, y: 2.5, w: 8, h: 0.8, fontSize: 24, color: "FFFFFF", align: "center" });
  s1.addText(params.azienda.ragione_sociale, { x: 1, y: 3.5, w: 8, h: 0.6, fontSize: 18, color: "9CA3AF", align: "center" });

  // Slide 2: Overview
  const s2 = pptx.addSlide();
  s2.background = { color: "0A0A0A" };
  s2.addText("Overview Progetto", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, color: "10B981", bold: true });
  s2.addText([
    { text: `Investimento: €${params.calcolo.investimento_effettivo?.toLocaleString("it-IT") || "—"}\n`, options: { fontSize: 16, color: "FFFFFF" } },
    { text: `Contributo: €${params.calcolo.contributo?.toLocaleString("it-IT") || "—"} (${params.calcolo.aliquota_contributo || 0}%)\n`, options: { fontSize: 16, color: "34D399" } },
    { text: `Finanziamento: €${params.calcolo.finanziamento?.toLocaleString("it-IT") || "—"} (${params.calcolo.aliquota_finanziamento || 0}%)\n`, options: { fontSize: 16, color: "FFFFFF" } },
    { text: `Eligibility: ${params.eligibility.overall} — ${params.eligibility.probabilita}%`, options: { fontSize: 16, color: "FCD34D" } },
  ], { x: 0.5, y: 1.3, w: 9, h: 3, lineSpacing: 24 });

  // Slide 3: Financials
  const s3 = pptx.addSlide();
  s3.background = { color: "0A0A0A" };
  s3.addText("Key Financials", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, color: "10B981", bold: true });
  s3.addText([
    { text: `DSCR: ${params.businessPlan.dscr}\n`, options: { fontSize: 16, color: "FFFFFF" } },
    { text: `VAN: €${params.businessPlan.van.toLocaleString("it-IT")}\n`, options: { fontSize: 16, color: "FFFFFF" } },
    { text: `IRR: ${params.businessPlan.irr}%\n`, options: { fontSize: 16, color: "FFFFFF" } },
    { text: `Payback: ${params.businessPlan.payback_anni} anni\n`, options: { fontSize: 16, color: "FFFFFF" } },
    { text: `Contributo: €${params.businessPlan.contributo.toLocaleString("it-IT")}`, options: { fontSize: 16, color: "34D399" } },
  ], { x: 0.5, y: 1.3, w: 9, h: 3, lineSpacing: 24 });

  // Slide 4: ATECO + Requirements
  const s4 = pptx.addSlide();
  s4.background = { color: "0A0A0A" };
  s4.addText("Requisiti Bando", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, color: "10B981", bold: true });
  s4.addText([
    { text: `ATECO ammessi: ${params.deepScan.ateco_ammessi.join(", ")}\n`, options: { fontSize: 14, color: "FFFFFF" } },
    { text: `Regimi: ${params.deepScan.regimi_aiuto.map((r) => `${r.tipo} (${r.intensita_massima}%)`).join(", ")}\n`, options: { fontSize: 14, color: "FFFFFF" } },
    { text: `Criteri: ${params.deepScan.criteri_valutazione.map((c) => `${c.criterio} (${c.punteggio_massimo}pt)`).join(", ")}`, options: { fontSize: 14, color: "9CA3AF" } },
  ], { x: 0.5, y: 1.3, w: 9, h: 3, lineSpacing: 20 });

  // Slide 5: Checks
  const s5 = pptx.addSlide();
  s5.background = { color: "0A0A0A" };
  s5.addText("Eligibility Checks", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, color: "10B981", bold: true });
  const checkLines = params.eligibility.checks.map((c) => ({
    text: `${c.status === "PASS" ? "✅" : c.status === "WARN" ? "⚠️" : "❌"} ${c.nome}: ${c.dettaglio}\n`,
    options: { fontSize: 13, color: c.status === "PASS" ? "34D399" : c.status === "WARN" ? "FCD34D" : "EF4444" },
  }));
  s5.addText(checkLines, { x: 0.5, y: 1.3, w: 9, h: 4, lineSpacing: 18 });

  const result: any = await pptx.write({ outputType: "nodebuffer" });
  if (Buffer.isBuffer(result)) return result;
  if (result instanceof Uint8Array) return Buffer.from(result);
  return Buffer.from(result);
}
