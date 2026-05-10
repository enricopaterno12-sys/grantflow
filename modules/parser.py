import fitz
import io
import os
import re


class BandoParser:
    def __init__(self):
        self.testo_estratto = ""

    def estrai_testo(self, percorso_pdf):
        try:
            if isinstance(percorso_pdf, bytes):
                documento = fitz.open(stream=percorso_pdf, filetype="pdf")
            elif isinstance(percorso_pdf, io.BytesIO):
                documento = fitz.open(stream=percorso_pdf.getvalue(), filetype="pdf")
            elif hasattr(percorso_pdf, 'read'):
                documento = fitz.open(stream=percorso_pdf.read(), filetype="pdf")
            else:
                documento = fitz.open(percorso_pdf)
            testo = ""
            for pagina in documento:
                testo += pagina.get_text()
            documento.close()
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


if __name__ == "__main__":
    parser = BandoParser()
    nome_file = "Bando di concorso_Programma Itaca a.s. 2025_2026 (1).pdf"
    percorso = os.path.join("sample_bandi", nome_file)
    if os.path.exists(percorso):
        testo = parser.estrai_testo(percorso)
        print("\n✅ FILE TROVATO! Ecco l'inizio del testo:")
        print("-" * 30)
        print(testo[:500])
        print("-" * 30)
    else:
        print(f"\n❌ ERRORE: Non trovo il file in {os.path.abspath(percorso)}")
