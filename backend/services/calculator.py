from datetime import datetime


class CalcolatoreFinanziario:
    def __init__(self, parametri: dict):
        self.aliquota_contributo = parametri.get("aliquota_contributo", 0) or 0
        self.aliquota_finanziamento = parametri.get("aliquota_finanziamento", 0) or 0
        self.limite_min = parametri.get("limite_min_investimento", 0) or 0
        self.limite_max = parametri.get("limite_max_investimento", 0) or 0
        self.fatturato_minimo = parametri.get("fatturato_minimo", 0) or 0
        self.bilanci_richiesti = parametri.get("bilanci_richiesti", 0) or 0

    def calcola(self, investimento: float) -> dict:
        if self.limite_min > 0 and investimento < self.limite_min:
            return {
                "successo": False,
                "errore": f"Investimento ({investimento:,.0f}€) inferiore al minimo ({self.limite_min:,.0f}€)",
                "contributo": 0,
                "finanziamento": 0,
                "totale_agevolabile": 0,
            }
        troncato = False
        if self.limite_max > 0 and investimento > self.limite_max:
            investimento = float(self.limite_max)
            troncato = True
        contributo = investimento * (self.aliquota_contributo / 100)
        finanziamento = investimento * (self.aliquota_finanziamento / 100)
        return {
            "successo": True,
            "troncato": troncato,
            "investimento_effettivo": round(investimento, 2),
            "contributo": round(contributo, 2),
            "finanziamento": round(finanziamento, 2),
            "totale_agevolabile": round(contributo + finanziamento, 2),
            "aliquota_contributo": self.aliquota_contributo,
            "aliquota_finanziamento": self.aliquota_finanziamento,
        }

    def valida_bilanci(self, data_costituzione: str, anni_bilancio: int) -> dict:
        if self.bilanci_richiesti <= 0:
            return {"conforme": True, "stato": "N/D", "dettaglio": "Nessun vincolo"}
        if anni_bilancio < self.bilanci_richiesti:
            return {"conforme": False, "stato": "ROSSO",
                    "dettaglio": f"Servono {self.bilanci_richiesti} bilanci, disponibili {anni_bilancio}"}
        return {"conforme": True, "stato": "VERDE",
                "dettaglio": f"{anni_bilancio}/{self.bilanci_richiesti} bilanci OK"}

    def valida_fatturato(self, fatturato: float) -> dict:
        if self.fatturato_minimo <= 0:
            return {"conforme": True, "stato": "N/D", "dettaglio": "Nessun vincolo"}
        if fatturato < self.fatturato_minimo:
            return {"conforme": False, "stato": "ROSSO",
                    "dettaglio": f"Fatturato {fatturato:,.0f}€ < minimo {self.fatturato_minimo:,.0f}€"}
        if fatturato < self.fatturato_minimo * 1.2:
            return {"conforme": True, "stato": "GIALLO",
                    "dettaglio": f"Margine insufficiente: {fatturato:,.0f}€ vs {self.fatturato_minimo:,.0f}€"}
        return {"conforme": True, "stato": "VERDE", "dettaglio": "Fatturato conforme"}


def calcola_business_plan(
    investimento: float,
    contributo: float,
    finanziamento: float,
    utile_netto: float = 0,
) -> dict:
    try:
        from numpy_financial import irr as np_irr
        USE_NUMPY = True
    except ImportError:
        USE_NUMPY = False

    anni = 5
    tasso_sconto = 0.08
    rata_finanziamento = finanziamento / anni if anni > 0 else 0
    cashflow = []
    cumulato = -investimento + contributo
    payback_anni = -1

    for anno in range(1, anni + 1):
        crescita = 0.15 + (anno - 1) * 0.05
        ricavi = investimento * crescita
        costi_op = investimento * 0.08
        quota_fin = rata_finanziamento
        ammortamento = investimento / anni
        costi = costi_op + quota_fin + ammortamento
        netto = ricavi - costi
        cumulato += netto
        if payback_anni < 0 and cumulato >= 0:
            payback_anni = anno
        cashflow.append({
            "anno": anno,
            "ricavi": round(ricavi),
            "costi": round(costi),
            "netto": round(netto),
        })

    if payback_anni < 0:
        payback_anni = anni + 1

    # DSCR: utile_netto / rata_finanziamento (fallback a EBITDA medio se utile_netto non disponibile)
    ebitda_medio = sum(c["ricavi"] - investimento * 0.08 for c in cashflow) / anni
    dscr_base = utile_netto if utile_netto > 0 else ebitda_medio
    dscr = dscr_base / rata_finanziamento if rata_finanziamento > 0 else 0

    flussi_netti = [c["netto"] for c in cashflow]
    flussi_irr = [-investimento] + flussi_netti
    van = -investimento + sum(v / (1 + tasso_sconto) ** (i + 1) for i, v in enumerate(flussi_netti))

    if USE_NUMPY and len(flussi_irr) >= 2:
        try:
            raw = float(np_irr(flussi_irr))
            irr = max(-0.999, min(raw, 10.0))
        except Exception:
            irr = _calcola_irr_sicura(flussi_irr)
    else:
        irr = _calcola_irr_sicura(flussi_irr)

    return {
        "dscr": round(dscr, 2),
        "payback_anni": payback_anni,
        "van": round(van),
        "irr": round(irr * 100, 2),
        "cashflow": cashflow,
        "contributo": round(contributo),
        "finanziamento": round(finanziamento),
        "investimento_totale": round(investimento),
    }


def _calcola_irr_sicura(flussi: list) -> float:
    """IRR via Newton con protezione convergenza, fallback a bisezione."""
    precision = 1e-6
    max_iter = 200

    def npv(rate):
        return sum(v / (1 + rate) ** i for i, v in enumerate(flussi))

    def npv_deriv(rate):
        return sum(-i * v / (1 + rate) ** (i + 1) for i, v in enumerate(flussi))

    # Newton
    x = 0.1
    for _ in range(max_iter):
        f = npv(x)
        df = npv_deriv(x)
        if abs(df) < 1e-12:
            break
        x_new = x - f / df
        if abs(x_new - x) < precision:
            if -0.999 < x_new < 10.0:
                return x_new
            break
        x = x_new

    # Fallback: bisezione
    lo, hi = -0.99, 10.0
    f_lo = npv(lo)
    f_hi = npv(hi)
    if f_lo * f_hi > 0:
        return 0.0
    for _ in range(100):
        mid = (lo + hi) / 2
        f_mid = npv(mid)
        if abs(f_mid) < precision:
            return mid
        if f_lo * f_mid <= 0:
            hi = mid
            f_hi = f_mid
        else:
            lo = mid
            f_lo = f_mid
    return 0.0


def calcola_payback(
    investimento: float,
    contributo: float,
    rata_finanziamento: float,
    proiezioni: list,
) -> dict:
    """Calcola il payback period in anni basato sulle proiezioni di cashflow."""
    cumulato = -investimento + contributo
    anni = len(proiezioni)
    for i, p in enumerate(proiezioni):
        netto = p.get("netto", 0) if isinstance(p, dict) else p
        cumulato += netto
        if cumulato >= 0:
            return {"anni": i + 1, "raggiunto": True, "messaggio": f"Payback a {i + 1} anni"}
    return {"anni": anni + 1, "raggiunto": False, "messaggio": f"Payback > {anni} anni — non raggiunto nel periodo"}


def calcola_indipendenza_finanziaria(patrimonio_netto: float, debiti_finanziari: float) -> dict:
    if debiti_finanziari <= 0:
        return {"indice": 1.0, "stato": "VERDE", "dettaglio": "Nessun debito finanziario"}
    indice = patrimonio_netto / debiti_finanziari if debiti_finanziari > 0 else 0
    if indice >= 1.0:
        stato = "VERDE"
        dettaglio = f"Indice {indice:.2f} — patrimonio netto copre i debiti finanziari"
    elif indice >= 0.5:
        stato = "GIALLO"
        dettaglio = f"Indice {indice:.2f} — patrimonio netto copre il 50%+ dei debiti"
    else:
        stato = "ROSSO"
        dettaglio = f"Indice {indice:.2f} — patrimonio netto insufficiente a coprire i debiti"
    return {"indice": round(indice, 2), "stato": stato, "dettaglio": dettaglio}
