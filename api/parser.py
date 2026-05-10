import io
import re
from pypdf import PdfReader


class BandoParser:
    def __init__(self):
        self.testo_estratto = ""

    def estrai_testo(self, percorso_pdf):
        try:
            if isinstance(percorso_pdf, bytes):
                reader = PdfReader(io.BytesIO(percorso_pdf))
            elif isinstance(percorso_pdf, io.BytesIO):
                reader = PdfReader(percorso_pdf)
            elif hasattr(percorso_pdf, 'read'):
                reader = PdfReader(percorso_pdf.read())
            else:
                reader = PdfReader(percorso_pdf)
            testo = ""
            for pagina in reader.pages:
                testo += (pagina.extract_text() or "")
            self.testo_estratto = testo
            return testo
        except Exception as e:
            raise Exception(f"Errore durante la lettura del PDF: {e}")

    @staticmethod
    def parse_visura(testo_visura):
        ragione_sociale = ""
        ateco = ""

        rs_match = re.search(
            r'(?:RAGIONE\s*SOCIALE|DENOMINAZIONE|IMPRESA)\s*:?\s*(.+?)(?:\n|$)',
            testo_visura, re.IGNORECASE
        )
        if rs_match:
            ragione_sociale = rs_match.group(1).strip()
            ragione_sociale = re.sub(r'\s+', ' ', ragione_sociale)

        ateco_match = re.search(
            r'(?:CODICE\s*)?ATECO\s*:?\s*(\d{2}\.\d{2})',
            testo_visura, re.IGNORECASE
        )
        if ateco_match:
            ateco = ateco_match.group(1).strip()

        return ragione_sociale, ateco
