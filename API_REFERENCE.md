# GrantFlow AI — API Reference per FlutterFlow

## Endpoint

```
Base URL: http://<host>:8000
```

Tutti gli endpoint accettano e restituiscono JSON (tranne `/analyze` che accetta `multipart/form-data`).

---

## 1. POST /analyze — Analisi Bando PDF

### Request

**Tipo:** `multipart/form-data`

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `file` | File (PDF) | **Sì** | Documento bando (PDF) |
| `visura` | File (PDF) | No | Visura camerale (PDF) — per estrazione automatica dati azienda |

### Response (200 OK)

```json
{
  "testo_estratto": "string (primi 3000 caratteri del PDF)",
  "scheda": "string (Markdown — analisi completa del bando in 8 sezioni)",
  "parametri_finanziari": {
    "aliquota_contributo": 50.0,
    "aliquota_finanziamento": 30.0,
    "limite_min_investimento": 50000.0,
    "limite_max_investimento": 300000.0,
    "fatturato_minimo": 100000.0,
    "bilanci_richiesti": 2
  },
  "visura_data": {                             // presente SOLO se visura allegata
    "ragione_sociale": "Mia Impresa Srl",
    "ateco": "62.01"
  }
}
```

**Campi della `scheda` (Markdown):** il bando viene analizzato con 8 sezioni:
1. `## Soggetti Ammissibili` — ATECO ammessi/esclusi
2. `## Requisiti di Accesso` — anzianità, bilanci, fatturato minimo
3. `## Tipologia Agevolazione` — intensità massima, contributo, finanziamento
4. `## Spese Ammissibili` — minimo/massimo investimento, categorie
5. `## Cumulo e DNSH` — cumulabilità con credito d'imposta
6. `## Scadenza e Modalità di Presentazione`
7. `## Documenti Richiesti`
8. `## Criteri di Valutazione e Premialità`

### Errori

| Status | Quando |
|---|---|
| 400 | File non PDF, o PDF illeggibile |
| 502 | Errore chiamata LLM (Groq) |

---

## 2. POST /verify — Verifica Eligibility + Calcolo

### Request

**Content-Type:** `application/json`

```json
{
  "dati_azienda": {
    "ragione_sociale": "Mia Impresa Srl",
    "ateco": "62.01",
    "dimensione": "Piccola (10-49)",
    "regione": "Puglia",
    "fatturato": 250000.0,
    "dipendenti": 15,
    "data_costituzione": "2020-01-01",
    "investimento": 150000.0,
    "finanziamento_richiesto": 100000.0
  },
  "parametri_finanziari": {
    "aliquota_contributo": 50.0,
    "aliquota_finanziamento": 30.0,
    "limite_min_investimento": 50000.0,
    "limite_max_investimento": 300000.0,
    "fatturato_minimo": 100000.0,
    "bilanci_richiesti": 2
  },
  "scheda_bando": "string (Markdown ottenuto da /analyze)"
}
```

### CompanyData — specifica campi

| Campo | Tipo | Obbligatorio | Default |
|---|---|---|---|
| `ragione_sociale` | string | **Sì** | — |
| `ateco` | string | **Sì** | — |
| `dimensione` | string | No | `""` |
| `regione` | string | No | `""` |
| `fatturato` | number | No | `0` |
| `dipendenti` | integer | No | `0` |
| `data_costituzione` | string (YYYY-MM-DD) | No | `""` |
| `investimento` | number | No | `0` |
| `finanziamento_richiesto` | number | No | `0` |

### Parametri finanziari — campi attesi

| Campo | Tipo | Default |
|---|---|---|
| `aliquota_contributo` | number | `0` |
| `aliquota_finanziamento` | number | `0` |
| `limite_min_investimento` | number | `0` |
| `limite_max_investimento` | number | `0` |
| `fatturato_minimo` | number | `0` |
| `bilanci_richiesti` | integer | `0` |

### Response (200 OK)

```json
{
  "calcolo_finanziario": {
    "successo": true,
    "troncato": false,
    "investimento_effettivo": 150000.0,
    "contributo": 75000.0,
    "finanziamento": 45000.0,
    "totale_agevolabile": 120000.0,
    "aliquota_contributo": 50.0,
    "aliquota_finanziamento": 30.0
  },
  "valutazione_bilanci": {
    "conforme": true,
    "stato": "VERDE",
    "dettaglio": "3/2 bilanci OK"
  },
  "valutazione_fatturato": {
    "conforme": true,
    "stato": "GIALLO",
    "dettaglio": "Margine sicurezza insufficiente: 250.000€ vs 100.000€"
  },
  "eligibility": "string (Markdown strutturato, vedi sotto)",
  "business_plan": "string (Markdown — business plan in 6 sezioni)"
}
```

### calcolo_finanziario — campi

| Campo | Tipo | Descrizione |
|---|---|---|
| `successo` | boolean | `true` se investimento nei limiti |
| `troncato` | boolean | `true` se investimento > massimale (troncato) |
| `investimento_effettivo` | number | Investimento (eventualmente troncato) |
| `contributo` | number | Contributo a fondo perduto calcolato |
| `finanziamento` | number | Finanziamento agevolato calcolato |
| `totale_agevolabile` | number | Contributo + Finanziamento |
| `aliquota_contributo` | number | Percentuale contributo applicata |
| `aliquota_finanziamento` | number | Percentuale finanziamento applicata |

Se `successo` è `false`:

| Campo | Tipo | Descrizione |
|---|---|---|
| `successo` | false | — |
| `errore` | string | "Investimento (...) inferiore al minimo (...)" |
| `contributo` | 0 | — |
| `finanziamento` | 0 | — |
| `totale_agevolabile` | 0 | — |

### valutazione_bilanci — campi

| Campo | Tipo | Valori |
|---|---|---|
| `conforme` | boolean | `true` / `false` |
| `stato` | string | `"VERDE"` / `"GIALLO"` / `"ROSSO"` / `"N/D"` |
| `dettaglio` | string | Spiegazione |

### valutazione_fatturato — campi

| Campo | Tipo | Valori |
|---|---|---|
| `conforme` | boolean | `true` / `false` |
| `stato` | string | `"VERDE"` / `"GIALLO"` / `"ROSSO"` / `"N/D"` |
| `dettaglio` | string | Spiegazione |

### eligibility (Markdown) — sezioni restituite

```
## VALUTAZIONE_TECNICA
SOGGETTO: ...
SETTORE: ...
FINANZIARIO: ...

## CHECKLIST_CRITICITA
- ...

## TABELLA_DATI
| Parametro | Requisito | Dato Cliente | Esito |

## PROSSIMI_PASSI
- ...

CLASSIFICAZIONE FINALE: [VERDE] / [GIALLO] / [ROSSO]
PROBABILITÀ APPROVAZIONE: [X]%
```

### business_plan (Markdown) — sezioni restituite

1. `## Descrizione del Progetto`
2. `## Obiettivi Specifici`
3. `## Cronoprogramma`
4. `## Budget Previsto`
5. `## Analisi SWOT`
6. `## Rischi e Mitigazioni`

---

## 3. GET /history

### Response (200 OK)

```json
[
  {
    "id": "uuid-string",
    "data": "10/05/2026 14:30",
    "bando": "string",
    "azienda": "string",
    "ateco": "62.01",
    "fatturato": 250000,
    "investimento": 150000,
    "finanziamento": 100000,
    "dimensione": "Piccola (10-49)",
    "regione": "Puglia",
    "dipendenti": 15,
    "data_costituzione": "2020-01-01",
    "scheda": "string (Markdown)",
    "esito": "string (Markdown eligibility)",
    "progetto": "string (Markdown business plan)",
    "parametri_finanziari": "string (JSON)",
    "calcolo_finanziario": "string (JSON)"
  }
]
```

---

## 4. DELETE /history/{analysis_id}

### Response (200 OK)

```json
{
  "status": "deleted",
  "id": "analysis_id"
}
```

---

## 5. GET / — Health Check

```json
{
  "status": "ok",
  "service": "GrantFlow AI API"
}
```

---

## Esempio flusso completo (FlutterFlow)

```
Step 1: POST /analyze  (multipart: file=bando.pdf)
  → Ottieni: parametri_finanziari, scheda_bando

Step 2: Mostra form all'utente con campi CompanyData
        (precompila ragione_sociale / ateco da visura_data se presente)

Step 3: POST /verify  (JSON)
  Body: {
    "dati_azienda": { ... da form utente ... },
    "parametri_finanziari": { ... da step 1 ... },
    "scheda_bando": " ... da step 1 ... "
  }
  → Ottieni: calcolo_finanziario, valutazione_bilanci,
             valutazione_fatturato, eligibility, business_plan

Step 4: Mostra risultati all'utente
```

Il file `api_spec.json` (OpenAPI 3.1) nella stessa directory può essere importato direttamente in strumenti come Postman o Swagger UI.
