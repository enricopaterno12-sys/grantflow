ANALISI_INIZIALE_TEMPLATE = """
Sei un analista bandi senior. Analizza il bando e restituisci ESCLUSIVAMENTE un oggetto JSON valido,
senza testo aggiuntivo, senza markdown.

TESTO BANDO:
{testo_bando}

Il JSON DEVE avere questa struttura:
{{
    "nome_bando": "nome completo del bando",
    "ente_erogatore": "nome dell'ente che emette il bando"
}}

Restituisci SOLO il JSON, nient'altro.
"""

PARAMETRI_FINANZIARI_TEMPLATE = """
Sei un analista bandi senior. Estrai i parametri finanziari dal testo del bando.

TESTO BANDO:
{testo_bando}

Restituisci ESCLUSIVAMENTE un oggetto JSON valido.

Struttura:
{{
    "aliquota_contributo": <percentuale>,
    "aliquota_finanziamento": <percentuale>,
    "limite_min_investimento": <importo in euro>,
    "limite_max_investimento": <importo in euro>,
    "fatturato_minimo": <importo in euro>,
    "bilanci_richiesti": <numero>
}}
Usa 0 come default per valori non trovati.
"""

SCHEDA_TECNICA_TEMPLATE = """
Sei un analista bandi senior specializzato in bandi Invitalia e PNRR.
Estrai TUTTI i parametri tecnico-finanziari in modo preciso.

TESTO BANDO:
{testo_bando}

Restituisci in Markdown con OGNI sezione:

1. ## Soggetti Ammissibili
   - Tipologia imprese ammesse
   - ATECO ammessi
   - ATECO esclusi

2. ## Requisiti di Accesso
   - Anzianità costituzione
   - Numero bilanci richiesti
   - Fatturato minimo
   - Altri requisiti

3. ## Tipologia Agevolazione
   - Intensità massima complessiva
   - Contributo a fondo perduto
   - Finanziamento agevolato

4. ## Spese Ammissibili
   - Investimento minimo e massimo
   - Categorie di spesa

5. ## Cumulo e DNSH
6. ## Scadenza e Modalità di Presentazione
7. ## Documenti Richiesti
8. ## Criteri di Valutazione e Premialità
"""

ELIGIBILITY_TEMPLATE = """
Sei un Senior Consultant in Finanza Agevolata.
Confronta i dati aziendali con i requisiti del bando e genera una tabella di eligibility.

DATI AZIENDA:
{dati}

ANALISI TECNICA BANDO:
{scheda}

Genera un report strutturato in MARKDOWN con:

## Report Eligibility

### Tabella Criteri
| Criterio | Esito | Dettaglio |
|----------|-------|-----------|
| ATECO | Sì/No/Dubbio | motivazione |
| Anzianità | Sì/No/Dubbio | motivazione |
| Fatturato | Sì/No/Dubbio | motivazione |
| ... altri criteri ... |

### Riepilogo
CLASSIFICAZIONE FINALE: [VERDE] / [GIALLO] / [ROSSO]
PROBABILITÀ APPROVAZIONE: [X]%
PUNTEGGIO TECNICO: [X]/100
"""

BUSINESS_PLAN_TEMPLATE = """
Sei un consulente senior specializzato in Business Plan per bandi.

Genera un Business Plan DETTAGLIATO basato sui dati azienda e sulla scheda bando.

DATI AZIENDA:
{dati}

SCHEDA BANDO:
{scheda}

CALCOLO FINANZIARIO:
{calcolo}

Includi OGNI sezione in Markdown:
1. Descrizione del Progetto
2. Obiettivi Specifici con KPI
3. Cronoprogramma
4. Budget Previsto (tabella)
5. Piano Investimenti
6. Sostenibilità Economica (proiezioni 3 anni)
7. DSCR e Payback Period
8. Analisi SWOT
9. Impatto Occupazionale e Green
"""

CHECKLIST_TEMPLATE = """
Sei un esperto di bandi. Analizza il bando e genera una checklist dei documenti necessari.

TESTO BANDO:
{testo_bando}

Restituisci ESCLUSIVAMENTE un array JSON, senza testo aggiuntivo.

Formato:
[
    {{
        "nome": "nome documento",
        "obbligatorio": true,
        "note": "eventuali note"
    }}
]

Includi sempre DURC, Antimafia, Visura Camerale, Bilanci, Documenti progettuali.
"""

CRITERI_AMMISSIBILITA_TEMPLATE = """
Sei un analista bandi. Estrai i criteri di ammissibilità dal bando in formato JSON.

TESTO BANDO:
{testo_bando}

Restituisci SOLO un array JSON:
[
    {{
        "criterio": "nome criterio",
        "descrizione": "dettaglio",
        "punteggio": 0
    }}
]
"""

SPESE_AMMISSIBILI_TEMPLATE = """
Sei un analista bandi. Estrai le spese ammissibili.

TESTO BANDO:
{testo_bando}

Restituisci in Markdown:
1. Investimento minimo: €...
2. Investimento massimo: €...
3. Categorie di spesa ammesse con aliquote
"""

SCADENZE_TEMPLATE = """
Sei un analista bandi. Estrai le scadenze.

TESTO BANDO:
{testo_bando}

Restituisci in Markdown:
- Apertura: ...
- Chiusura: ...
- Perentoria: Sì/No
- Modalità presentazione: ...
"""
