from modules.parser import BandoParser
from modules.analyzer import BandoAnalyzer
import os

def main():
    print("--- GRANTFLOW AI: ANALISI BANDO REALE ---")
    
    # 1. Inizializza i componenti
    parser = BandoParser()
    analyzer = BandoAnalyzer()
    
    # 2. Definisci il percorso del bando
    percorso_pdf = "sample_bandi/Bando di concorso_Programma Itaca a.s. 2025_2026 (1).pdf"
    
    if not os.path.exists(percorso_pdf):
        print(f"Errore: Non trovo il file in {percorso_pdf}")
        return

    # 3. Estrai il testo dal PDF vero
    print("Lettura del PDF in corso...")
    testo_estratto = parser.estrai_testo(percorso_pdf)
    
    # 4. Analizza con l'IA
    print("Analisi intelligente in corso (Groq)...")
    risultato = analyzer.analizza_bando(testo_estratto)
    
    # 5. Risultato finale
    print("\n" + "="*40)
    print("RISULTATO ANALISI BANDO ITACA")
    print("="*40)
    print(risultato)
    print("="*40)

if __name__ == "__main__":
    main()