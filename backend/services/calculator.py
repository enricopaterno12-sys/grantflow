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


def calcola_business_plan(investimento: float, contributo: float, finanziamento: float) -> dict:
    anni = 5
    tasso_sconto = 0.08
    cashflow = []
    cumulato = -investimento + contributo
    payback_anni = -1

    for anno in range(1, anni + 1):
        crescita = 0.15 + (anno - 1) * 0.05
        ricavi = investimento * crescita
        costi_op = investimento * 0.08
        quota_fin = finanziamento / anni
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

    dscr = (contributo + finanziamento) / investimento if investimento > 0 else 0

    flussi = [c["netto"] for c in cashflow]
    van = -investimento + sum(v / (1 + tasso_sconto) ** (i + 1) for i, v in enumerate(flussi))
    irr = _calcola_irr([-investimento] + flussi)

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


def _calcola_irr(flussi: list, guess: float = 0.1) -> float:
    precision = 1e-6
    x1 = guess
    for _ in range(1000):
        f1 = sum(v / (1 + x1) ** i for i, v in enumerate(flussi))
        f2 = sum(-i * v / (1 + x1) ** (i + 1) for i, v in enumerate(flussi))
        if abs(f2) < precision:
            break
        x2 = x1 - f1 / f2
        if abs(x2 - x1) < precision:
            return x2
        x1 = x2
    return x1
