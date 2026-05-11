from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from services.parser import extract_pdf_text, parse_visura
from pydantic import BaseModel

router = APIRouter()


class EnrichRequest(BaseModel):
    testo_bando: Optional[str] = None


@router.post("/enrich")
async def enrich(
    visura: Optional[UploadFile] = File(None),
    documenti: Optional[list[UploadFile]] = File(None),
):
    visura_data = {}

    if visura:
        if not visura.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "La visura deve essere un PDF")
        content = await visura.read()
        testo = extract_pdf_text(content)
        visura_data = parse_visura(testo)

    return {
        "visura_data": visura_data,
        "documenti_caricati": len(documenti) if documenti else 0,
    }
