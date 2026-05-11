from fastapi import APIRouter, UploadFile, File, HTTPException
from services.parser import extract_pdf_text
from services.analyzer import analisi_iniziale

router = APIRouter()


@router.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Il file deve essere un PDF")

    content = await file.read()
    testo = extract_pdf_text(content)

    info = analisi_iniziale(testo)

    return {
        "nome_bando": info.get("nome_bando", "Bando sconosciuto"),
        "ente_erogatore": info.get("ente_erogatore", "Ente non identificato"),
        "testo_estratto": testo[:3000],
    }
