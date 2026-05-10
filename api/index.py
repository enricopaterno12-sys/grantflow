from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel
from typing import Optional
import json
from datetime import datetime

from parser import BandoParser
from analyzer import BandoAnalyzer, CalcolatoreFinanziario

app = FastAPI(title="GrantFlow AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

parser = BandoParser()
analyzer = BandoAnalyzer()

handler = Mangum(app)


class CompanyData(BaseModel):
    ragione_sociale: str
    ateco: str
    dimensione: Optional[str] = ""
    regione: Optional[str] = ""
    fatturato: float = 0
    dipendenti: int = 0
    data_costituzione: Optional[str] = ""
    investimento: float = 0
    finanziamento_richiesto: float = 0


class VerifyRequest(BaseModel):
    dati_azienda: CompanyData
    parametri_finanziari: dict
    scheda_bando: str = ""


def _format_dati_azienda(d: CompanyData) -> str:
    return (
        f"Azienda: {d.ragione_sociale}\nATECO: {d.ateco}\n"
        f"Dimensione: {d.dimensione}\nRegione: {d.regione}\n"
        f"Fatturato: €{d.fatturato:,.0f}\nDipendenti: {d.dipendenti}\n"
        f"Data Costituzione: {d.data_costituzione}\n"
        f"Investimento: €{d.investimento:,.0f}\n"
        f"Finanziamento Richiesto: €{d.finanziamento_richiesto:,.0f}"
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "GrantFlow AI API"}


@app.post("/api/analyze")
def analyze_bando(file: UploadFile = File(...), visura: UploadFile = None):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Il file deve essere un PDF")

    try:
        contents = file.file.read()
        testo = parser.estrai_testo(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        scheda = analyzer.analizza_bando(testo)
        parametri = analyzer.estrai_parametri_finanziari(testo)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Errore analisi LLM: {e}")

    result = {
        "testo_estratto": testo[:3000],
        "scheda": scheda,
        "parametri_finanziari": parametri,
    }

    if visura:
        try:
            visura_bytes = visura.file.read()
            testo_visura = parser.estrai_testo(visura_bytes)
            rs, ateco = BandoParser.parse_visura(testo_visura)
            if rs or ateco:
                result["visura_data"] = {
                    "ragione_sociale": rs,
                    "ateco": ateco,
                }
        except Exception:
            pass

    return result


@app.post("/api/verify")
def verify_eligibility(request: VerifyRequest):
    d = request.dati_azienda
    pf = request.parametri_finanziari
    scheda = request.scheda_bando

    dati_str = _format_dati_azienda(d)

    calcolatore = CalcolatoreFinanziario(pf)
    calcolo = calcolatore.calcola(d.investimento)

    anni_bil = 0
    if d.data_costituzione:
        try:
            dc = datetime.strptime(d.data_costituzione, "%Y-%m-%d")
            anni_bil = datetime.today().year - dc.year
        except ValueError:
            pass

    val_bil = calcolatore.valida_bilanci(d.data_costituzione, max(0, anni_bil))
    val_fat = calcolatore.valida_fatturato(d.fatturato)

    try:
        eligibility = analyzer.verifica_eligibility(scheda, dati_str)
        business_plan = analyzer.genera_bozza_progetto(scheda, dati_str)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Errore chiamata LLM: {e}")

    return {
        "calcolo_finanziario": calcolo,
        "valutazione_bilanci": val_bil,
        "valutazione_fatturato": val_fat,
        "eligibility": eligibility,
        "business_plan": business_plan,
    }
