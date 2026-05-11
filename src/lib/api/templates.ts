export const PARAMETRI_FINANZIARI_TEMPLATE = `
Sei un analista bandi senior. Estrai i parametri finanziari dal testo del bando e restituisci ESCLUSIVAMENTE un oggetto JSON valido, senza testo aggiuntivo, senza markdown, senza spiegazioni.

TESTO BANDO:
{testo_bando}

Il JSON DEVE avere questa struttura esatta:
{{
    "aliquota_contributo": <numero percentuale contributo a fondo perduto, 0 se non trovato>,
    "aliquota_finanziamento": <numero percentuale finanziamento agevolato, 0 se non trovato>,
    "limite_min_investimento": <importo minimo investimento in euro, 0 se non trovato>,
    "limite_max_investimento": <importo massimo investimento in euro, 0 se non trovato>,
    "fatturato_minimo": <fatturato minimo richiesto in euro, 0 se non trovato>,
    "bilanci_richiesti": <numero di bilanci richiesti, 0 se non trovato>
}}

Restituisci SOLO il JSON, nient'altro.
`;

export const BUSINESS_PLAN_TEMPLATE = `
Sei un consulente senior specializzato in Business Plan per bandi di finanziamento e innovazione.

Genera un Business Plan DETTAGLIATO e PROFESSIONALE per l'azienda descritta di seguito,
basato sulla scheda del bando.

DATI AZIENDA:
{dati}

SCHEDA BANDO:
{scheda}

Il Business Plan DEVE includere OGNUNA di queste sezioni in Markdown:

1. ## Descrizione del Progetto
   - 3-5 paragrafi descrittivi del progetto

2. ## Obiettivi Specifici
   - 3-4 obiettivi misurabili con target e scadenze

3. ## Cronoprogramma
   - Organizzato per semestre/mese con milestone chiave

4. ## Budget Previsto
   - Tabella con voci di spesa e importi
   - Totale finale

5. ## Analisi SWOT
   - Tabella 2x2: Forze, Debolezze, Opportunità, Rischi

6. ## Rischi e Mitigazioni
   - Principali rischi e strategie di mitigazione

Non usare placeholder generici. Scrivi contenuti specifici e azionabili.
`;

export const ELIGIBILITY_TEMPLATE = `
Sei un Senior Consultant in Finanza Agevolata specializzato in bandi Invitalia e PNRR.
Devi validare l'eligibility con precisione chirurgica: verifica, calcola e contesta.

DATI AZIENDA:
{dati}

SCHEDA BANDO:
{scheda}

REGOLE FERREE — APPLICA OGNI PUNTO:

1. VERIFICA TEMPORALE E BILANCI:
   - Leggi la data di costituzione e gli anni di bilancio disponibili.
   - Se il bando richiede >= 2 bilanci e l'azienda ne ha 1 o N/D:
     STATO = ROSSO, con avviso: "Soggetto non ammissibile per carenza di anzianità contabile (minimo 2 bilanci)".

2. CALCOLO MATEMATICO DELL'AGEVOLAZIONE:
   - Estrai dal bando: intensità massima %, contributo a fondo perduto %, finanziamento agevolato %.
   - Esegui il calcolo esatto:
     Investimento: [valore cliente]
     % Intensità massima: [X]%
     Totale agevolabile: Investimento * X%
     Ripartizione: Contributo €Y + Finanziamento €Z
   - Se il totale non corrisponde alle attese del cliente, segnala ERRORE DI PIANIFICAZIONE.

3. VERIFICA ATECO E COERENZA SETTORIALE:
   - Analizza se l'ATECO del cliente (es. 62.01 Produzione Software) è FUNZIONALE ai settori target del bando (es. "Servizi diretti alle imprese manifatturiere").
   - Se l'azienda opera in un settore NON coerente con il target del bando (es. commercio vs manifatturiero), STATO = ROSSO.
   - Non dire solo "ATECO Ammesso": spiega la relazione funzionale o la mancata corrispondenza.

4. SOGLIE DI FATTURATO E MARGINE DI SICUREZZA:
   - Verifica fatturato minimo richiesto dal bando.
   - Se l'azienda è sopra la soglia ma entro il 20% del limite, segnala CRITICITÀ: "Margine di sicurezza insufficiente — in fase istruttoria il dato potrebbe essere contestato".

5. PRINCIPIO DNSH E CUMULO:
   - Verifica se il bando permette il cumulo con Credito d'Imposta 4.0/5.0.
   - Se DNSH non è menzionato nei dati azienda, segnala: "DOCUMENTO MANCANTE FONDAMENTALE: valutazione DNSH (Do No Significant Harm)".

6. FORMAGGIO OUTPUT STRUTTURATO:
   Usa OGNI sezione qui sotto, nell'ordine esatto. Le intestazioni DEVONO essere identiche.

## VALUTAZIONE_TECNICA
SOGGETTO: [Dettaglio conformità anzianità e bilanci]
SETTORE: [Analisi specifica ATECO vs Target Bando — includere motivazione]
FINANZIARIO: [Calcolo esatto: Investimento X -> Contributo Y + Finanziamento Z]

## CHECKLIST_CRITICITA
- [Punto 1: es. Fatturato vicino al limite]
- [Punto 2: es. Mancanza certificazione DNSH]
- [Punto 3: es. Carenza bilanci]

## TABELLA_DATI
| Parametro | Requisito | Dato Cliente | Esito |
|-----------|-----------|--------------|-------|
| [es. ATECO] | [...] | [...] | [✅/⚠️/❌] |
| [es. Fatturato min] | [...] | [...] | [✅/⚠️/❌] |
| ... altre righe ... |

## PROSSIMI_PASSI
- [Azione concreta 1]
- [Azione concreta 2]

CLASSIFICAZIONE FINALE: [VERDE] / [GIALLO] / [ROSSO]
PROBABILITÀ APPROVAZIONE: [X]%
`;

export const ANALYSIS_TEMPLATE = `
Sei un analista bandi senior specializzato in bandi Invitalia e PNRR.
Estrai TUTTI i parametri tecnico-finanziari in modo preciso, senza interpretazioni.

TESTO BANDO:
{testo_bando}

Restituisci in Markdown con OGNI sezione:

1. ## Soggetti Ammissibili
   - Tipologia imprese ammesse (Micro, Piccola, Media, Grande)
   - ATECO ammessi (lista esplicita)
   - ATECO esclusi (se menzionati)

2. ## Requisiti di Accesso
   - Anzianità costituzione (minimo anni)
   - Numero bilanci richiesti
   - Fatturato minimo
   - Altri requisiti (dipendenti minimi, sede, etc.)

3. ## Tipologia Agevolazione
   - Intensità massima complessiva: [X]%
   - Contributo a fondo perduto: [X]% (importo massimo €...)
   - Finanziamento agevolato: [X]% (importo massimo €...)
   - Altre forme: [eventuali]

4. ## Spese Ammissibili
   - Investimento minimo: €...
   - Investimento massimo: €...
   - Categorie di spesa ammesse (software, hardware, consulenze, etc.)

5. ## Cumulo e DNSH
   - Cumulabile con Credito d'Imposta 4.0/5.0? [SI/NO/Non specificato]
   - Richiede valutazione DNSH? [SI/NO/Non specificato]

6. ## Scadenza e Modalità di Presentazione
7. ## Documenti Richiesti
8. ## Criteri di Valutazione e Premialità
`;
