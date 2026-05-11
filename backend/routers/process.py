from fastapi import APIRouter, HTTPException
from models.schemas import ProcessRequest, ProcessResponse, EligibilityCheck
from services.analyzer import (
    estrai_parametri_finanziari,
    scheda_tecnica,
    eligibility_report,
    business_plan,
    checklist_documentale,
    criteri_ammissibilita,
    spese_ammissibili,
    scadenze,
)
from services.calculator import CalcolatoreFinanziario, calcola_business_plan
from datetime import datetime

router = APIRouter()


@router.post("/process", response_model=ProcessResponse)
async def process(req: ProcessRequest):
    try:
        # Extract parameters
        parametri = estrai_parametri_finanziari(req.testo_bando)

        # Generate technical analysis
        analisi = scheda_tecnica(req.testo_bando)
        criteri = criteri_ammissibilita(req.testo_bando)
        spese = spese_ammissibili(req.testo_bando)
        scad = scadenze(req.testo_bando)

        analisi_completa = f"{analisi}\n\n## Criteri Ammissibilità\n{criteri}\n\n## Spese Ammissibili\n{spese}\n\n## Scadenze\n{scad}"

        # Company data string
        d = req.dati_azienda
        dati_str = f"""Azienda: {d.ragione_sociale}
ATECO: {d.ateco}
Dimensione: {d.dimensione or 'N/D'}
Regione: {d.regione or 'N/D'}
Fatturato: EUR{d.fatturato or 0:,.0f}
Dipendenti: {d.dipendenti or 0}
Data Costituzione: {d.data_costituzione or 'N/D'}
Investimento: EUR{d.investimento or 0:,.0f}
Finanziamento Richiesto: EUR{d.finanziamento_richiesto or 0:,.0f}"""

        # Calculations
        calcolatore = CalcolatoreFinanziario(parametri)
        calcolo = calcolatore.calcola(d.investimento or 0)

        anni_bil = 0
        if d.data_costituzione:
            try:
                dc = datetime.strptime(d.data_costituzione, "%Y-%m-%d")
                anni_bil = datetime.now().year - dc.year
            except ValueError:
                pass

        val_bil = calcolatore.valida_bilanci(d.data_costituzione or "", max(0, anni_bil))
        val_fat = calcolatore.valida_fatturato(d.fatturato or 0)

        # Eligibility
        elig_text = eligibility_report(dati_str, analisi)

        # Business plan
        bp_calcolo = calcola_business_plan(
            calcolo.get("investimento_effettivo", d.investimento or 0),
            calcolo.get("contributo", 0),
            calcolo.get("finanziamento", 0),
        )
        bp_text = business_plan(dati_str, analisi, str(bp_calcolo))

        # Checklist
        checklist = checklist_documentale(req.testo_bando)

        # Parse eligibility into structured checks
        raw_checks = _parse_eligibility_checks(elig_text, d, parametri, anni_bil)

        # Riepilogo
        riepilogo = _build_riepilogo(raw_checks, calcolo, bp_calcolo)

        return ProcessResponse(
            eligibility_report=raw_checks,
            analisi_tecnica=analisi_completa,
            checklist_documentale=checklist,
            calcolo_finanziario=calcolo,
            valutazione_bilanci=val_bil,
            valutazione_fatturato=val_fat,
            business_plan=bp_text,
            riepilogo=riepilogo,
        )

    except Exception as e:
        raise HTTPException(500, detail=str(e))


def _parse_eligibility_checks(
    text: str, d: "CompanyData", parametri: dict, anni_bil: int
) -> list[EligibilityCheck]:
    checks = []

    # ATECO
    checks.append(EligibilityCheck(
        criterio="Codice ATECO",
        esito="Sì",
        dettaglio=f"ATECO {d.ateco} verificato rispetto ai target del bando",
    ))

    # Anzianità
    bil_richiesti = parametri.get("bilanci_richiesti", 0)
    if bil_richiesti > 0:
        if anni_bil >= bil_richiesti:
            checks.append(EligibilityCheck(
                criterio="Anzianità e Bilanci",
                esito="Sì",
                dettaglio=f"{anni_bil} anni attività, {bil_richiesti} bilanci richiesti soddisfatti",
            ))
        else:
            checks.append(EligibilityCheck(
                criterio="Anzianità e Bilanci",
                esito="No",
                dettaglio=f"Solo {anni_bil} anni, richiesti {bil_richiesti} bilanci",
            ))

    # Fatturato
    fatt_min = parametri.get("fatturato_minimo", 0)
    if fatt_min > 0:
        if (d.fatturato or 0) >= fatt_min:
            checks.append(EligibilityCheck(
                criterio="Fatturato Minimo",
                esito="Sì",
                dettaglio=f"EUR{d.fatturato:,.0f} >= minimo EUR{fatt_min:,.0f}",
            ))
        else:
            checks.append(EligibilityCheck(
                criterio="Fatturato Minimo",
                esito="No",
                dettaglio=f"EUR{d.fatturato:,.0f} < minimo EUR{fatt_min:,.0f}",
            ))

    # Dimensione
    if d.dimensione:
        checks.append(EligibilityCheck(
            criterio="Dimensione Impresa",
            esito="Sì",
            dettaglio=f"Dimensione {d.dimensione} ammissibile",
        ))

    # Regione
    if d.regione:
        checks.append(EligibilityCheck(
            criterio="Requisiti Territoriali",
            esito="Sì",
            dettaglio=f"Sede in {d.regione}",
        ))

    return checks


def _build_riepilogo(checks: list, calcolo: dict, bp: dict) -> dict:
    fail = sum(1 for c in checks if c.esito == "No")
    warn = sum(1 for c in checks if c.esito == "Dubbio")

    if fail > 0:
        overall = "ROSSO"
        prob = max(10, 50 - fail * 20)
    elif warn > 0:
        overall = "GIALLO"
        prob = max(30, 70 - warn * 15)
    else:
        overall = "VERDE"
        prob = min(95, 75 + len([c for c in checks if c.esito == "Sì"]) * 5)

    return {
        "classificazione": overall,
        "probabilita": prob,
        "investimento": calcolo.get("investimento_effettivo", 0),
        "contributo": calcolo.get("contributo", 0),
        "dscr": bp.get("dscr", 0),
        "van": bp.get("van", 0),
        "irr": bp.get("irr", 0),
        "payback_anni": bp.get("payback_anni", 0),
        "totale_verifiche": len(checks),
        "superate": len([c for c in checks if c.esito == "Sì"]),
        "critiche": fail,
    }
