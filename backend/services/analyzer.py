import os
import json
import re
from groq import Groq

from .templates import (
    ANALISI_INIZIALE_TEMPLATE,
    PARAMETRI_FINANZIARI_TEMPLATE,
    SCHEDA_TECNICA_TEMPLATE,
    ELIGIBILITY_TEMPLATE,
    BUSINESS_PLAN_TEMPLATE,
    CHECKLIST_TEMPLATE,
    CRITERI_AMMISSIBILITA_TEMPLATE,
    SPESE_AMMISSIBILI_TEMPLATE,
    SCADENZE_TEMPLATE,
)

MODEL_NAME = "llama-3.3-70b-versatile"


def _get_client() -> Groq:
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        raise ValueError("GROQ_API_KEY environment variable is not set")
    return Groq(api_key=key)


def _ask(system: str, template: str, params: dict, temperature: float = 0) -> str:
    client = _get_client()
    user_content = template
    for k, v in params.items():
        user_content = user_content.replace(f"{{{k}}}", str(v))
    response = client.chat.completions.create(
        model=MODEL_NAME,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
    )
    return response.choices[0].message.content or ""


def _parse_json_strict(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)


def analisi_iniziale(testo_bando: str) -> dict:
    resp = _ask(
        "Analizza il bando e restituisci nome e ente in formato JSON.",
        ANALISI_INIZIALE_TEMPLATE,
        {"testo_bando": testo_bando},
    )
    try:
        return _parse_json_strict(resp)
    except json.JSONDecodeError:
        return {"nome_bando": "Bando sconosciuto", "ente_erogatore": "Ente non identificato"}


def estrai_parametri_finanziari(testo_bando: str) -> dict:
    resp = _ask(
        "Estrai parametri finanziari come JSON.",
        PARAMETRI_FINANZIARI_TEMPLATE,
        {"testo_bando": testo_bando},
    )
    try:
        params = _parse_json_strict(resp)
        keys = ["aliquota_contributo", "aliquota_finanziamento", "limite_min_investimento",
                "limite_max_investimento", "fatturato_minimo", "bilanci_richiesti"]
        for k in keys:
            if k not in params:
                params[k] = 0
        return params
    except json.JSONDecodeError:
        return {}


def scheda_tecnica(testo_bando: str) -> str:
    return _ask(
        "Estrai parametri tecnici del bando in formato Markdown.",
        SCHEDA_TECNICA_TEMPLATE,
        {"testo_bando": testo_bando},
    )


def eligibility_report(dati: str, scheda: str) -> str:
    return _ask(
        "Valuta eligibility azienda vs bando. Genera tabella con Sì/No/Dubbio.",
        ELIGIBILITY_TEMPLATE,
        {"dati": dati, "scheda": scheda},
    )


def business_plan(dati: str, scheda: str, calcolo: str) -> str:
    return _ask(
        "Genera business plan professionale per bando agevolato.",
        BUSINESS_PLAN_TEMPLATE,
        {"dati": dati, "scheda": scheda, "calcolo": calcolo},
    )


def checklist_documentale(testo_bando: str) -> list:
    resp = _ask(
        "Genera checklist documenti necessari per il bando in formato JSON.",
        CHECKLIST_TEMPLATE,
        {"testo_bando": testo_bando},
    )
    try:
        return _parse_json_strict(resp)
    except (json.JSONDecodeError, TypeError):
        return [
            {"nome": "DURC", "obbligatorio": True, "note": ""},
            {"nome": "Certificazione Antimafia", "obbligatorio": True, "note": ""},
            {"nome": "Visura Camerale", "obbligatorio": True, "note": ""},
            {"nome": "Bilanci depositati", "obbligatorio": True, "note": "Ultimi 2 esercizi"},
            {"nome": "Preventivi di spesa", "obbligatorio": True, "note": "Almeno 3 preventivi"},
        ]


def criteri_ammissibilita(testo_bando: str) -> str:
    return _ask(
        "Estrai criteri di ammissibilità dal bando.",
        CRITERI_AMMISSIBILITA_TEMPLATE,
        {"testo_bando": testo_bando},
    )


def spese_ammissibili(testo_bando: str) -> str:
    return _ask(
        "Estrai spese ammissibili dal bando.",
        SPESE_AMMISSIBILI_TEMPLATE,
        {"testo_bando": testo_bando},
    )


def scadenze(testo_bando: str) -> str:
    return _ask(
        "Estrai scadenze dal bando.",
        SCADENZE_TEMPLATE,
        {"testo_bando": testo_bando},
    )
