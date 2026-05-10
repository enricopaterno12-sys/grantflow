import json
import os
import uuid
from datetime import datetime

HISTORY_FILE = "data/history.json"


class HistoryManager:
    def __init__(self):
        os.makedirs("data", exist_ok=True)
        if not os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump([], f)

    def save_full_analysis(self, bando_titolo, azienda_nome, **kwargs):
        history = self.get_all()
        entry = {
            "id": str(uuid.uuid4()),
            "data": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "bando": bando_titolo,
            "azienda": azienda_nome,
            **kwargs
        }
        history.insert(0, entry)
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history[:50], f, indent=4, ensure_ascii=False)
        return entry

    def get_all(self):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def delete_by_id(self, analysis_id):
        history = self.get_all()
        history = [i for i in history if i.get('id') != analysis_id]
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=4, ensure_ascii=False)
        return history
