from io import BytesIO
from pypdf import PdfReader


def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    pages: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n".join(pages)


def parse_visura(testo: str) -> dict:
    import re
    ragione_sociale = ""
    ateco = ""

    rs_match = re.search(
        r"(?:RAGIONE\s*SOCIALE|DENOMINAZIONE|IMPRESA)\s*:?\s*(.+?)(?:\n|$)",
        testo, re.IGNORECASE
    )
    if rs_match:
        ragione_sociale = rs_match.group(1).strip()

    ateco_match = re.search(
        r"(?:CODICE\s*)?ATECO\s*:?\s*(\d{2}\.\d{2})",
        testo, re.IGNORECASE
    )
    if ateco_match:
        ateco = ateco_match.group(1).strip()

    return {"ragione_sociale": ragione_sociale, "ateco": ateco}
