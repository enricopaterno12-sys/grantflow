export const VINCOLI_TEMPLATE = `
Sei un analista bandi senior. Sei un estrattore puro di regole.
Leggi il bando ed estrai SOLO le clausole oggettive. Non fare analisi, non dare giudizi.

TESTO BANDO:
{testo_bando}

Restituisci ESCLUSIVAMENTE un oggetto JSON valido, senza testo aggiuntivo, senza markdown.

Formato:
{
  "vincoli_soggettivi": {
    "province_ammesse": ["Ferrara", "Ravenna"],
    "ateco_esclusi": ["01", "02", "A"],
    "ateco_ammessi": ["62", "63"],
    "dimensione_ammessa": ["Micro", "Piccola", "Media"],
    "sede_requisiti": "Sede operativa nelle province indicate",
    "settori_esclusi": []
  },
  "vincoli_finanziari": {
    "investimento_minimo": 30000,
    "investimento_massimo": 200000,
    "intensita_contributo_percentuale": 50,
    "intensita_finanziamento_percentuale": 0,
    "massimale_contributo": 5000,
    "massimale_finanziamento": 0,
    "fatturato_minimo": 100000,
    "bilanci_richiesti": 2,
    "regime_aiuto": "De Minimis - Reg. UE 1407/2013"
  }
}

REGOLE:
1. Se un dato non è specificato nel bando USA NULL, non inventare.
2. province_ammesse: lista province dove deve avere sede l'azienda. Se non specificato usa [].
3. ateco_ammessi: SOLO quelli esplicitamente citati come ammessi.
4. ateco_esclusi: SOLO quelli esplicitamente citati come esclusi.
5. intensita_contributo_percentuale: SCRIVI 50 per 50%, NON 0.5.
6. massimale_contributo: importo massimo erogabile in euro. Se non specificato usa null.
7. regime_aiuto: nome del regime. Se non specificato usa null.
`;

export const VISURA_TEMPLATE = `
Sei un estrattore di dati anagrafici e finanziari aziendali.
Il tuo unico compito è mappare le informazioni presenti nel testo del documento nei campi richiesti.

REGOLE FERREE (ANTI-ALLUCINAZIONE):
1. Se un campo richiesto NON è presente nel documento, restituisci NULL. Mai inventare, stimare o dedurre.
2. Estrai i dati ESATTAMENTE come appaiono nel testo, senza modifiche o interpretazioni.
3. Per il codice ATECO: estrai il codice primario esattamente come appare (es. "62.01", "10.20.01").
4. Per la sede: estrai l'indirizzo completo. Per la regione estrai solo se esplicitamente menzionata.
5. Per la data costituzione: formato YYYY-MM-DD se presente, altrimenti null.
6. Per importi numerici (fatturato, utile netto, debiti, patrimonio): estrai il numero senza simboli (es. 500000 per €500.000,00).
7. dimensione: solo se testualmente specificato come "Micro", "Piccola", "Media" o "Grande". Non dedurre da numero dipendenti.
8. Non inventare MAI dati economici o finanziari se non sono scritti esplicitamente nel documento.

DOCUMENTO:
{documento}

Restituisci ESCLUSIVAMENTE un JSON valido SENZA markdown, SENZA testo aggiuntivo:
{
  "ragione_sociale": "stringa o null",
  "partita_iva": "stringa o null",
  "codice_fiscale": "stringa o null",
  "forma_giuridica": "stringa o null",
  "ateco": "stringa o null",
  "sede_legale": "stringa o null",
  "regione": "stringa o null",
  "pec": "stringa o null",
  "data_costituzione": "YYYY-MM-DD o null",
  "fatturato": "numero in euro o null",
  "dipendenti": "numero o null",
  "utile_netto": "numero in euro o null",
  "debiti_finanziari": "numero in euro o null",
  "patrimonio_netto": "numero in euro o null",
  "dimensione": "Micro|Piccola|Media|Grande o null",
  "note_estrazione": "breve nota su quali campi sono stati trovati"
}
`;

export const PARAMETRI_FINANZIARI_TEMPLATE = `
Sei un analista bandi senior. Estrai i parametri finanziari dal testo del bando.

TESTO BANDO:
{testo_bando}

Restituisci ESCLUSIVAMENTE un oggetto JSON valido, senza testo aggiuntivo.

Struttura:
{
    "aliquota_contributo": <percentuale contributo a fondo perduto>,
    "aliquota_finanziamento": <percentuale finanziamento agevolato>,
    "limite_min_investimento": <importo minimo in euro>,
    "limite_max_investimento": <importo massimo in euro>,
    "fatturato_minimo": <fatturato minimo in euro>,
    "bilanci_richiesti": <numero bilanci>
}
Usa 0 come default per valori non trovati.
`;

export const ANALYSIS_TEMPLATE = `
Sei un analista bandi senior specializzato in bandi Invitalia e PNRR.
Estrai TUTTI i parametri tecnico-finanziari in modo preciso, senza interpretazioni.
CITA SEMPRE L'ARTICOLO DEL BANDO per ogni dato estratto.

TESTO BANDO:
{testo_bando}

Restituisci in Markdown con OGNI sezione:

1. ## Soggetti Ammissibili
   - Tipologia imprese ammesse (Micro, Piccola, Media, Grande)
   - ATECO ammessi (lista esplicita con articolo di riferimento)
   - ATECO esclusi (se menzionati, con articolo)

2. ## Requisiti di Accesso
   - Anzianità costituzione (minimo anni, Art. ...)
   - Numero bilanci richiesti (Art. ...)
   - Fatturato minimo (Art. ...)
   - Altri requisiti (dipendenti minimi, sede, etc.)

3. ## Tipologia Agevolazione
   - Intensità massima complessiva: [X]% (Art. ...)
   - Contributo a fondo perduto: [X]% (Art. ...)
   - Finanziamento agevolato: [X]% (Art. ...)
   - Altre forme: [eventuali]

4. ## Spese Ammissibili
   - Investimento minimo: €... (Art. ...)
   - Investimento massimo: €... (Art. ...)
   - Categorie di spesa ammesse con relative aliquote

5. ## Cumulo e DNSH
   - Cumulabile con Credito d'Imposta 4.0/5.0? (Art. ...)
   - Richiede valutazione DNSH? (Art. ...)

6. ## Scadenza e Modalità di Presentazione (Art. ...)
7. ## Documenti Richiesti (Art. ...)
8. ## Criteri di Valutazione e Premialità (Art. ...)
`;

export const ELIGIBILITY_TEMPLATE = `
Sei un Senior Consultant in Finanza Agevolata specializzato in bandi Invitalia e PNRR.
Devi validare l'eligibility con precisione chirurgica: verifica, calcola e contesta.
CITA SEMPRE L'ARTICOLO DEL BANDO per ogni verifica.

DATI AZIENDA:
{dati}

SCHEDA BANDO:
{scheda}

REGOLE FERREE:

1. VERIFICA TEMPORALE E BILANCI:
   - Leggi data costituzione e anni bilancio.
   - Se bando richiede >= 2 bilanci e azienda ne ha meno: ROSSO

2. CALCOLO MATEMATICO DELL'AGEVOLAZIONE:
   - Estrai intensità %, contributo %, finanziamento % con articoli.
   - Calcolo esatto: Investimento × % = Agevolazione
   - Ripartizione: Contributo + Finanziamento

3. VERIFICA ATECO:
   - Confronta ATECO azienda con ATECO ammessi dal bando
   - Spiega la relazione funzionale o la non conformità

4. SOGLIE FATTURATO:
   - Confronta fatturato azienda con minimo richiesto
   - Margine < 20% = GIALLO

5. DNSH E CUMULO:
   - Verifica cumulabilità e obblighi DNSH

6. OUTPUT STRUTTURATO (usa intestazioni IDENTICHE):

## VALUTAZIONE_TECNICA
SOGGETTO: [conformità anzianità e bilanci — Art. ...]
SETTORE: [analisi ATECO vs target — Art. ...]
FINANZIARIO: [calcolo esatto — Art. ...]

## CHECKLIST_CRITICITA
- [Punto] (Art. ...)

## TABELLA_DATI
| Parametro | Requisito | Dato Cliente | Esito |
|-----------|-----------|--------------|-------|
| ATECO | Art. ... | ... | [✅/⚠️/❌] |

## PROSSIMI_PASSI
- [Azione concreta con riferimento normativo]

CLASSIFICAZIONE FINALE: [VERDE] / [GIALLO] / [ROSSO]
PROBABILITÀ APPROVAZIONE: [X]%
`;

export const ANALISI_CONCISA_TEMPLATE = `
Sei un analista bandi senior specializzato in Finanza Agevolata, PNRR e Invitalia.
Sei sintetico e preciso. Meglio "Non rilevabile" che un dato inventato.

DATI AZIENDA:
{dati}

SCHEDA BANDO:
{scheda}
{prompt_custom_section}

PRODUCI SOLO JSON VALIDO, senza markdown, senza testo extra.

{
  "esito": {
    "rating": "VERDE|GIALLO|ROSSO|GRIGIO",
    "probabilita": 0-100,
    "contributo_massimo_concedibile": importo in euro,
    "intensita_aiuto": percentuale,
    "regime_aiuti": "es. De Minimis - Reg. UE 1407/2013",
    "scudo_anti_errore": "massimo 3 righe: dichiara assunzioni O 'Incapacità di determinazione per mancanza dati su [campo]'"
  },
  "analisi_tecnica": [
    {
      "categoria_spesa": "nome categoria spesa",
      "corrispondenza": "articolo bando e motivazione conformità",
      "aliquota": percentuale o null
    }
  ],
  "analisi_custom": "risposta testuale (SOLO se richiesta custom presente)",
  "checklist_pratica": [
    { "nome": "documento richiesto", "obbligatorio": true }
  ]
}

REGOLE FERREE:
1. SCUDO ANTI-ERRORE: se non hai dati sufficienti, scrivi "Incapacità di determinazione per mancanza dati su [campo]". NON inventare.
2. Rating GRIGIO = dati insufficienti. Non forzare classificazione.
3. analisi_tecnica: mappa OGNI spesa al corrispondente articolo del bando.
4. checklist_pratica: SOLO documenti tassativi richiesti dal bando (max 7 voci).
5. contributo_massimo_concedibile = investimento * aliquota_contributo / 100.
6. analisi_custom: se presente RICHIESTA CUSTOM, rispondi in modo diretto (3-5 righe). Se non presente, stringa vuota.
`;

export const BUSINESS_PLAN_TEMPLATE = `
Sei un consulente senior specializzato in Business Plan per bandi di finanziamento e innovazione.

Genera un Business Plan DETTAGLIATO e PROFESSIONALE per l'azienda descritta di seguito,
basato sulla scheda del bando. CITA SEMPRE I DATI NUMERICI E LE FONTI.

DATI AZIENDA:
{dati}

SCHEDA BANDO:
{scheda}

CALCOLO FINANZIARIO:
{calcolo}

Il Business Plan DEVE includere OGNUNA di queste sezioni in Markdown:

1. ## Descrizione del Progetto
   - 3-5 paragrafi descrittivi con riferimenti al bando

2. ## Obiettivi Specifici
   - 3-4 obiettivi misurabili con target e KPI

3. ## Cronoprogramma
   - Organizzato per semestre/mese con milestone chiave e durata stimata

4. ## Budget Previsto
   - Tabella dettagliata: Voce di Spesa | Importo | % Copertura Bando | Fonte
   - Totale finale

5. ## Piano Investimenti
   - Ripartizione per categoria di spesa ammissibile
   - Calcolo contributo e finanziamento

6. ## Sostenibilità Economica
   - Proiezione ricavi/costi 3 anni
   - DSCR stimato
   - Payback period

7. ## Analisi SWOT
   - Tabella 2x2: Forze, Debolezze, Opportunità, Rischi

8. ## Impatto Occupazionale e Green
   - Nuove assunzioni previste
   - Riduzione impatto ambientale

Non usare placeholder generici. Scrivi contenuti specifici e azionabili con dati numerici precisi.
`;
