from pydantic import BaseModel
from typing import Optional, List


# ── Request Models ──

class CompanyData(BaseModel):
    ragione_sociale: str
    ateco: str
    dimensione: Optional[str] = None
    regione: Optional[str] = None
    fatturato: Optional[float] = 0
    dipendenti: Optional[int] = 0
    data_costituzione: Optional[str] = None
    investimento: Optional[float] = 0
    finanziamento_richiesto: Optional[float] = 0


class ProcessRequest(BaseModel):
    testo_bando: str
    dati_azienda: CompanyData
    testo_visura: Optional[str] = None


class ExportRequest(BaseModel):
    tipo: str  # pdf | docx | pptx | xlsx
    dati_azienda: CompanyData
    testo_bando: str
    analisi_tecnica: str
    eligibility_report: str
    business_plan: str
    parametri: dict
    calcolo: dict


# ── Response Models ──

class BandoInfo(BaseModel):
    nome: str
    ente_erogatore: str
    testo_estratto: str


class VisuraInfo(BaseModel):
    ragione_sociale: Optional[str] = None
    ateco: Optional[str] = None
    dimensione: Optional[str] = None
    data_costituzione: Optional[str] = None


class AnalisiResponse(BaseModel):
    testo_bando: str
    nome_bando: str
    ente_erogatore: str
    scheda_tecnica: str
    parametri_finanziari: dict
    criteri_ammissibilita: str
    spese_ammissibili: str
    scadenze: str
    checklist_documentale: List[dict]


class EligibilityCheck(BaseModel):
    criterio: str
    esito: str  # Sì / No / Dubbio
    dettaglio: str


class ProcessResponse(BaseModel):
    eligibility_report: List[EligibilityCheck]
    analisi_tecnica: str
    checklist_documentale: List[dict]
    calcolo_finanziario: dict
    valutazione_bilanci: dict
    valutazione_fatturato: dict
    business_plan: str
    riepilogo: dict
