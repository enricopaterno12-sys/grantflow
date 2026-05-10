import streamlit as st
import json
import re
import csv
import io
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from modules.analyzer import BandoAnalyzer, CalcolatoreFinanziario
from modules.history_manager import HistoryManager
from modules.parser import BandoParser
from modules.exporter import BandoExporter

BG = '#F8F9FA'; BG_SEC = '#FFFFFF'; TEXT = '#1a1a2e'; TEXT_SEC = '#6B7280'
BORDER = '#E5E7EB'; CARD_BG = '#FFFFFF'; CARD_ACTIVE = '#1E3A8A'
HEADING = '#1E3A8A'; INPUT_BG = '#FFFFFF'; HOVER_BG = '#F3F4F6'
SUC_BG = '#d4edda'; WAR_BG = '#fff3cd'; ERR_BG = '#f8d7da'; INFO_BG = '#d1ecf1'
BLUE = '#1E3A8A'; BLUE_LIGHT = '#DBEAFE'

st.set_page_config(page_title="GrantFlow AI", layout="wide")

st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }}
    :root {{
        --bg: {BG}; --bg-sec: {BG_SEC}; --text: {TEXT}; --text-sec: {TEXT_SEC};
        --border: {BORDER}; --card-bg: {CARD_BG}; --card-active: {CARD_ACTIVE};
        --heading: {HEADING}; --input-bg: {INPUT_BG}; --hover-bg: {HOVER_BG};
        --blue: {BLUE}; --blue-light: {BLUE_LIGHT};
        --success-bg: {SUC_BG}; --warning-bg: {WAR_BG}; --error-bg: {ERR_BG}; --info-bg: {INFO_BG};
    }}
    .stApp {{ background: var(--bg); color: var(--text); }}
    h1, h2, h3, h4, h5, h6 {{ color: var(--heading) !important; font-weight: 600; }}
    p, li, span, div, label, .stMarkdown {{ color: var(--text); }}
    /* ── SIDEBAR ── */
    .stSidebar {{ background: var(--bg-sec) !important; border-right: 1px solid var(--border) !important; }}
    .stSidebar .stMarkdown, .stSidebar .stButton, .stSidebar .stTextInput {{ color: var(--text); }}
    .sidebar-title {{ font-size: 1.25rem; font-weight: 700; color: var(--heading); margin-bottom: 0.75rem; }}
    .sidebar-sub {{ font-size: 0.75rem; font-weight: 600; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.5px; margin: 1rem 0 0.5rem 0; }}
    /* History item card */
    .hist-item {{
        background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
        padding: 10px 12px; margin-bottom: 6px; cursor: pointer;
        transition: all 0.15s ease; position: relative;
        display: flex; align-items: center; gap: 10px;
    }}
    .hist-item:hover {{ border-color: var(--heading); background: var(--hover-bg); }}
    .hist-status {{ width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }}
    .hist-status.verde {{ background: #28A745; box-shadow: 0 0 6px rgba(40,167,69,0.4); }}
    .hist-status.giallo {{ background: #FFC107; box-shadow: 0 0 6px rgba(255,193,7,0.4); }}
    .hist-status.rosso {{ background: #DC3545; box-shadow: 0 0 6px rgba(220,53,69,0.4); }}
    .hist-status.nd {{ background: var(--text-sec); }}
    .hist-name {{ font-size: 0.85rem; font-weight: 600; color: var(--text); line-height: 1.3; }}
    .hist-bando {{ font-size: 0.72rem; color: var(--text-sec); line-height: 1.2; }}
    .hist-date {{ font-size: 0.65rem; color: var(--text-sec); margin-top: 2px; }}
    /* CTA Button */
    .cta-btn button {{
        background: var(--blue) !important; color: #ffffff !important;
        border: none !important; border-radius: 10px !important;
        font-weight: 600 !important; padding: 10px 16px !important;
        font-size: 0.9rem !important; transition: all 0.15s ease;
        box-shadow: 0 2px 8px rgba(30,58,138,0.15);
    }}
    .cta-btn button:hover {{
        transform: translateY(-1px); box-shadow: 0 4px 12px rgba(30,58,138,0.25);
    }}
    /* Section Box */
    .section-box {{
        background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px;
        padding: 1.5rem; margin-bottom: 1.2rem;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }}
    .section-box h3 {{ font-size: 1rem; font-weight: 600; color: var(--heading); margin-bottom: 1rem; }}
    .section-box.done {{ border-color: #28A745; }}
    /* Form inputs */
    .stTextInput input, .stNumberInput input, .stDateInput input, .stSelectbox div[data-baseweb="select"] {{
        background: var(--input-bg) !important; color: var(--text) !important;
        border: 1px solid var(--border) !important; border-radius: 8px !important;
        font-size: 0.85rem !important;
    }}
    .stTextInput label, .stNumberInput label, .stDateInput label, .stSelectbox label {{
        color: var(--text-sec) !important; font-size: 0.8rem !important; font-weight: 500 !important;
    }}
    .stTextInput input::placeholder {{ color: var(--text-sec) !important; opacity: 0.7; }}
    /* File Uploader */
    .stFileUploader {{
        background: var(--input-bg) !important; border: 1.5px dashed var(--border) !important;
        border-radius: 10px !important; padding: 6px !important;
    }}
    .stFileUploader section {{ border: none !important; background: transparent !important; }}
    .stFileUploader section span {{ color: var(--text) !important; }}
    .stFileUploader small {{ color: var(--text-sec) !important; }}
    .stFileUploader button {{
        background: var(--blue-light) !important; color: var(--blue) !important;
        border: none !important; border-radius: 6px !important; font-weight: 500 !important;
    }}
    /* KPI Cards */
    .kpi-row {{ display: flex; gap: 12px; margin-bottom: 1rem; }}
    .kpi-card {{
        flex: 1; background: var(--card-bg); border: 1px solid var(--border);
        border-radius: 10px; padding: 14px 16px; text-align: center;
    }}
    .kpi-label {{ font-size: 0.72rem; font-weight: 500; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.3px; }}
    .kpi-value {{ font-size: 1.4rem; font-weight: 700; color: var(--heading); margin-top: 4px; }}
    .kpi-delta {{ font-size: 0.75rem; margin-top: 2px; }}
    /* Status Badge */
    .status-badge {{
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 14px; border-radius: 20px; font-weight: 600;
        font-size: 0.85rem;
    }}
    .status-badge.verde {{ background: {SUC_BG}; color: #28A745; border: 1px solid #28A745; }}
    .status-badge.giallo {{ background: {WAR_BG}; color: #B8860B; border: 1px solid #FFC107; }}
    .status-badge.rosso {{ background: {ERR_BG}; color: #DC3545; border: 1px solid #DC3545; }}
    .status-badge.nd {{ background: var(--border); color: var(--text-sec); border: 1px solid var(--border); }}
    /* Tabs */
    .stTabs [data-baseweb="tab-list"] {{ background: var(--bg-sec); border-bottom: 1px solid var(--border); gap: 0; }}
    .stTabs [data-baseweb="tab"] {{ color: var(--text-sec); font-weight: 500; }}
    .stTabs [aria-selected="true"] {{ color: var(--heading) !important; font-weight: 600; }}
    .stTabs [data-baseweb="tab-highlight"] {{ background: var(--heading); }}
    /* Metrics */
    div[data-testid="stMetric"] {{
        background: var(--card-bg); border: 1px solid var(--border);
        border-radius: 8px; padding: 8px 12px;
    }}
    div[data-testid="stMetricValue"] {{ font-size: 1.6rem !important; color: var(--heading) !important; font-weight: 700 !important; }}
    div[data-testid="stMetricLabel"] {{ color: var(--text-sec) !important; font-size: 0.75rem !important; font-weight: 500 !important; }}
    /* Buttons */
    .stButton button {{
        border-radius: 8px !important; font-weight: 500 !important;
        transition: all 0.15s ease;
    }}
    .stButton button:hover {{ transform: translateY(-1px); }}
    .stDownloadButton button {{
        background: var(--card-bg) !important; color: var(--text) !important;
        border: 1px solid var(--border) !important; border-radius: 8px !important;
    }}
    .stDownloadButton button:hover {{ border-color: var(--heading) !important; background: var(--hover-bg) !important; }}
    /* Alerts */
    .stAlert {{ border-radius: 10px !important; border: 1px solid var(--border) !important; }}
    div[data-testid="stSuccessBox"] {{ background: var(--success-bg) !important; color: #155724 !important; }}
    div[data-testid="stWarningBox"] {{ background: var(--warning-bg) !important; color: #856404 !important; }}
    div[data-testid="stErrorBox"] {{ background: var(--error-bg) !important; color: #721c24 !important; }}
    div[data-testid="stInfoBox"] {{ background: var(--info-bg) !important; color: var(--text) !important; }}
    /* Expanders */
    .streamlit-expanderHeader {{ background: var(--bg-sec); border: 1px solid var(--border); border-radius: 8px; font-weight: 500; }}
    .streamlit-expanderContent {{ background: var(--card-bg); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; }}
    /* Divider */
    hr {{ border-color: var(--border) !important; }}
    /* Caption */
    .stCaption {{ color: var(--text-sec) !important; }}
    /* Status / Spinner */
    .stStatusWidget {{ background: var(--card-bg) !important; border: 1px solid var(--border) !important; border-radius: 10px !important; }}
    .stSpinner > div > div {{ border-color: var(--heading) transparent transparent transparent !important; }}
    /* Checkbox */
    .stCheckbox label {{ color: var(--text) !important; }}
    /* Back button */
    .back-btn button {{
        background: var(--bg-sec) !important; color: var(--text-sec) !important;
        border: 1px solid var(--border) !important; border-radius: 8px !important;
    }}
    .back-btn button:hover {{ border-color: var(--heading) !important; color: var(--text) !important; }}
    button[key^="hist_"], button[key^="del_"] {{
        justify-content: flex-start !important; white-space: pre-line !important;
        text-align: left !important; font-size: 0.8rem !important;
        line-height: 1.4 !important; padding: 8px 12px !important;
    }}
    button[key^="del_"] {{ background: #fff5f5 !important; border-color: #fecaca !important; }}
    /* Sidebar delete mode checkbox */
    .stCheckbox {{ margin-bottom: 4px; }}
    /* Responsive adjustments */
    @media (max-width: 768px) {{ .kpi-row {{ flex-direction: column; }} }}
</style>
""", unsafe_allow_html=True)

parser = BandoParser()
analyzer = BandoAnalyzer()
exporter = BandoExporter()
history_mgr = HistoryManager()

DOCUMENTI_BASE = [
    "Documento Identità Legale Rappresentante",
    "Visura Camerale (aggiornata)",
    "Bilanci Ultimi 2 Anni",
    "DURC (Documento Unico Regolarità Contributiva)",
    "Preventivi / Proforma Investimento",
    "Valutazione DNSH (Do No Significant Harm)",
    "Certificazione ATECO / Iscrizione CCIIAA",
    "Dichiarazione sostitutiva requisiti morali",
]

if 'visura_prefill' not in st.session_state:
    st.session_state.visura_prefill = {}

for key in ['current_analysis', 'pending_delete', 'pending_delete_name',
            'step', 'bando_scheda', 'esito_raw', 'progetto_raw',
            'dati_az_raw', 'parametri_finanziari', 'calcolo_finanziario',
            'document_checklist_items']:
    if key not in st.session_state:
        if key in ('parametri_finanziari', 'calcolo_finanziario'):
            setattr(st.session_state, key, {})
        elif key == 'document_checklist_items':
            st.session_state.document_checklist_items = {}
        elif key in ('pending_delete', 'pending_delete_name', 'current_analysis',
                     'bando_scheda', 'esito_raw', 'progetto_raw', 'dati_az_raw'):
            setattr(st.session_state, key, None)
        elif key == 'step':
            st.session_state.step = 'upload'


def sanitize_text(text):
    if not isinstance(text, str):
        return str(text) if text is not None else ''
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    text = re.sub(r'<img[^>]*>', '', text, flags=re.IGNORECASE)
    return text


def safe_markdown(text, fallback=''):
    clean = sanitize_text(text)
    if clean:
        st.markdown(clean)
    elif fallback:
        st.markdown(fallback)


def parse_status(text):
    if not text:
        return 'N/D'
    t = text.upper()
    if 'ROSSO' in t:
        return 'ROSSO'
    if 'GIALLO' in t:
        return 'GIALLO'
    if 'VERDE' in t:
        return 'VERDE'
    return 'N/D'


def status_emoji(s):
    return {'VERDE': '🟢', 'GIALLO': '🟡', 'ROSSO': '🔴', 'N/D': '⚪'}.get(s, '⚪')


def status_css(s):
    return {'VERDE': 'verde', 'GIALLO': 'giallo', 'ROSSO': 'rosso', 'N/D': 'nd'}.get(s, 'nd')


def parse_kpi(text):
    prob = re.search(r'PROBABILITÀ\s*APPROVAZIONE\s*[:\-]?\s*(\d+)', text, re.IGNORECASE)
    prob_val = int(prob.group(1)) if prob else None
    return {'probabilita': prob_val}


def estrai_dati_visura(testo):
    dati = {}
    patterns = {
        'ragione_sociale': [
            r'Ragione\s*Sociale[:\s]+(.+)', r'Denominazione[:\s]+(.+)',
            r'(?:IMPRESA|AZIENDA|DITTA|Denominazione)\s*[:\s]+(.+)',
        ],
        'ateco': [
            r'ATECO[:\s]*(\d{2}(?:\.\d{1,2})?)', r'Codice\s*ATECO[:\s]*(\d{2}(?:\.\d{1,2})?)',
            r'(?:Attività|Codice)\s*(?:economica|ATECO)[:\s]*(\d{2}(?:\.\d{1,2})?)',
        ],
    }
    for key, pats in patterns.items():
        for p in pats:
            m = re.search(p, testo, re.IGNORECASE)
            if m:
                dati[key] = m.group(1).strip().rstrip('.')
                break
    return dati


def estrai_documenti_da_scheda(scheda):
    docs = []
    in_doc_section = False
    for line in scheda.split('\n'):
        stripped = line.strip()
        if re.match(r'^##\s+.?Documenti', stripped, re.IGNORECASE):
            in_doc_section = True
            continue
        if in_doc_section:
            if stripped.startswith('## '):
                break
            if stripped.startswith('- ') or stripped.startswith('* '):
                doc = stripped[2:].strip()
                if doc: docs.append(doc)
            elif stripped and not stripped.startswith('#') and not stripped.startswith('|'):
                docs.append(stripped)
    return docs if docs else DOCUMENTI_BASE[:]


def estrai_parametri_da_scheda(scheda):
    p = {}
    m = re.search(r'Contributo a fondo perduto[:\s]*(\d+)%', scheda)
    p['aliquota_contributo'] = float(m.group(1)) if m else 0
    m = re.search(r'Finanziamento agevolato[:\s]*(\d+)%', scheda)
    p['aliquota_finanziamento'] = float(m.group(1)) if m else 0
    m = re.search(r'Investimento minimo[:\s]*€?\s*([\d.]+)', scheda)
    p['limite_min_investimento'] = float(m.group(1).replace('.', '')) if m else 0
    m = re.search(r'Investimento massimo[:\s]*€?\s*([\d.]+)', scheda)
    p['limite_max_investimento'] = float(m.group(1).replace('.', '')) if m else 0
    m = re.search(r'Fatturato minimo[:\s]*€?\s*([\d.]+)', scheda)
    p['fatturato_minimo'] = float(m.group(1).replace('.', '')) if m else 0
    m = re.search(r'(?:Numero|N\.?\s*)\s*bilanci\s*richiesti[:\s]*(\d+)', scheda, re.IGNORECASE)
    p['bilanci_richiesti'] = int(m.group(1)) if m else 0
    return p


def carica_parametri_e_checklist(record, investimento_val):
    pf = record.get('parametri_finanziari', '{}')
    if isinstance(pf, str):
        try: pf = json.loads(pf)
        except Exception: pf = {}
    if not pf or all(v == 0 for v in pf.values()):
        pf = estrai_parametri_da_scheda(record.get('scheda', ''))
    st.session_state.parametri_finanziari = pf

    calcolatore = CalcolatoreFinanziario(pf)
    calcolo = calcolatore.calcola(investimento_val)
    st.session_state.calcolo_finanziario = calcolo

    cl = record.get('document_checklist_items', '{}')
    if isinstance(cl, str):
        try: cl = json.loads(cl)
        except Exception: cl = {}
    if not cl:
        docs_list = estrai_documenti_da_scheda(record.get('scheda', ''))
        cl = {d: False for d in docs_list}
    st.session_state.document_checklist_items = cl
    return pf, calcolo


# ──────────────────────────────────────────────
# SIDEBAR
# ──────────────────────────────────────────────
with st.sidebar:
    st.markdown("<div class='sidebar-title'>🎯 GrantFlow AI</div>", unsafe_allow_html=True)

    st.markdown("<div class='cta-btn'>", unsafe_allow_html=True)
    if st.button("➕ NUOVA ANALISI", use_container_width=True):
        for k in ['current_analysis', 'bando_scheda', 'esito_raw', 'progetto_raw', 'dati_az_raw']:
            st.session_state[k] = None
        st.session_state.step = 'upload'
        st.session_state.what_if_mode = False
        st.session_state.visura_prefill = {}
        st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<hr style='margin:12px 0;'>", unsafe_allow_html=True)
    st.markdown("<div class='sidebar-sub'>🕐 Cronologia Recente</div>", unsafe_allow_html=True)

    search = st.text_input("", placeholder="Cerca azienda o bando...", label_visibility="collapsed")
    all_items = history_mgr.get_all() or []

    if search:
        q = search.lower()
        filtered = [i for i in all_items if q in i.get('azienda', '').lower()
                    or q in i.get('cliente', '').lower() or q in i.get('bando', '').lower()]
    else:
        filtered = all_items

    shown = filtered[:10]

    del_mode = st.checkbox("🗑️ Delete Mode", key="sidebar_del_mode",
                           help="ON: click per eliminare — OFF: click per aprire")

    if not shown:
        st.caption("Nessuna analisi.")
    else:
        for item in shown:
            nome_az = item.get('azienda', item.get('cliente', 'N/D'))
            nome_bando = item.get('bando', 'Analisi')
            key = item.get('id', '')
            status = parse_status(item.get('esito', ''))
            data = item.get('data', '')[:10]

            if del_mode:
                label = f"🗑️ **{nome_az}**  \n{nome_bando}  \n{data}"
                if st.button(label, key=f'del_{key}', use_container_width=True):
                    st.session_state.pending_delete = item.get('id')
                    st.session_state.pending_delete_name = nome_az
                    st.rerun()
            else:
                label = f"{status_emoji(status)} **{nome_az}**  \n{nome_bando}  \n{data}"
                if st.button(label, key=f'hist_{key}', use_container_width=True):
                    st.session_state.pending_delete = None
                    st.session_state.current_analysis = item
                    invest = item.get('investimento', item.get('finanziamento', 0))
                    carica_parametri_e_checklist(item, invest)
                    st.session_state.step = 'results'
                    st.rerun()

    if st.session_state.get('pending_delete'):
        st.warning(f"Eliminare '{st.session_state.pending_delete_name}'?", icon="⚠️")
        c1, c2 = st.columns(2)
        with c1:
            if st.button("🗑️ Elimina", key="confirm_delete", use_container_width=True, type="primary"):
                did = st.session_state.pending_delete
                dc = st.session_state.get('current_analysis', {}) or {}
                history_mgr.delete_by_id(did)
                st.session_state.pending_delete = None
                st.session_state.pending_delete_name = None
                if dc.get('id') == did:
                    st.session_state.current_analysis = None
                    st.session_state.step = 'upload'
                st.rerun()
        with c2:
            if st.button("↩️ Annulla", key="cancel_delete", use_container_width=True):
                st.session_state.pending_delete = None
                st.session_state.pending_delete_name = None
                st.rerun()

    if all_items:
        st.markdown("<hr style='margin:8px 0;'>", unsafe_allow_html=True)
        if st.button("📥 Esporta CSV Storico", use_container_width=True):
            output = io.StringIO()
            w = csv.writer(output)
            w.writerow(['ID', 'Data', 'Azienda', 'Bando', 'Stato', 'ATECO', 'Fatturato'])
            for item in all_items:
                w.writerow([
                    item.get('id', ''), item.get('data', ''),
                    item.get('azienda', item.get('cliente', '')),
                    item.get('bando', ''), parse_status(item.get('esito', '')),
                    item.get('ateco', ''), item.get('fatturato', '')
                ])
            st.download_button("⬇️ Scarica CSV", data=output.getvalue(),
                               file_name="storico_grantflow.csv", mime="text/csv")




# ──────────────────────────────────────────────
# MAIN — RESULTS
# ──────────────────────────────────────────────
if st.session_state.current_analysis is not None and st.session_state.step == 'results':
    res = st.session_state.current_analysis
    azienda = res.get('azienda', 'N/D')
    nome_bando = res.get('bando', 'Analisi')
    data_analisi = res.get('data', '')[:10]
    status = parse_status(res.get('esito', ''))
    s_class = status_css(status)
    kpi = parse_kpi(res.get('esito', ''))

    invest_val = res.get('investimento', 0)
    pf = st.session_state.get('parametri_finanziari', {})
    calcolo = st.session_state.get('calcolo_finanziario', {})
    if not pf:
        pf, calcolo = carica_parametri_e_checklist(res, invest_val)

    # Header
    st.markdown(f"<div style='margin-bottom:4px; font-size:0.8rem; color:var(--text-sec);'>"
                f"{nome_bando} &middot; {data_analisi}</div>", unsafe_allow_html=True)
    st.markdown(f"<h1 style='margin:0 0 0.25rem 0;'>📊 Analisi: {azienda}</h1>", unsafe_allow_html=True)
    st.markdown(f"<span class='status-badge {s_class}'>{status_emoji(status)} {status}</span>", unsafe_allow_html=True)

    # KPI Row
    prob = kpi.get('probabilita')
    eff = calcolo.get('investimento_effettivo', invest_val)
    contrib = calcolo.get('contributo', 0)
    tot_agev = calcolo.get('totale_agevolazione', calcolo.get('totale_agevolabile', 0))

    st.markdown("<div class='kpi-row'>", unsafe_allow_html=True)
    mc1, mc2, mc3, mc4 = st.columns(4)
    with mc1:
        val = f"{prob}%" if prob else "N/D"
        delta = "+" if prob and prob >= 60 else ("-" if prob and prob < 40 else None)
        st.metric("Probabilità Successo", val, delta=delta)
    with mc2:
        st.metric("Investimento", f"€{int(eff):,}")
    with mc3:
        st.metric("Contributo Ottenibile", f"€{contrib:,.0f}" if contrib else "N/D")
    with mc4:
        st.metric("Totale Agevolabile", f"€{tot_agev:,.0f}" if tot_agev else "—")
    st.markdown("</div>", unsafe_allow_html=True)

    # Company expander
    with st.expander("🏢 Dati Aziendali", expanded=False):
        c1, c2, c3 = st.columns(3)
        with c1:
            st.markdown(f"**Ragione Sociale:** {azienda}")
            st.markdown(f"**ATECO:** {res.get('ateco', 'N/D')}")
            st.markdown(f"**Dimensione:** {res.get('dimensione', 'N/D')}")
        with c2:
            st.markdown(f"**Regione:** {res.get('regione', 'N/D')}")
            st.markdown(f"**Dipendenti:** {res.get('dipendenti', 0)}")
            st.markdown(f"**Costituzione:** {res.get('data_costituzione', 'N/D')}")
        with c3:
            st.markdown(f"**Fatturato:** €{int(res.get('fatturato', 0)):,}")
            st.markdown(f"**Investimento:** €{int(res.get('investimento', 0)):,}")
            st.markdown(f"**Richiesto:** €{int(res.get('finanziamento', 0)):,}")
        if calcolo.get('troncato'):
            st.warning("Investimento troncato al massimale del bando")

    # ── TABS ──
    tab1, tab2 = st.tabs(["🧐 Eligibility & Matching", "📝 Business Plan Generato"])

    with tab1:
        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown("<div class='section-box'>", unsafe_allow_html=True)
            st.markdown("**📋 Scheda Bando**")
            safe_markdown(res.get('scheda'), fallback='*Nessun dato*')
            st.markdown("</div>", unsafe_allow_html=True)

        with col_b:
            st.markdown("<div class='section-box'>", unsafe_allow_html=True)
            st.markdown(f"**🎯 Esito**")
            st.markdown(f"<div style='margin:12px 0;'><span class='status-badge {s_class}' style='font-size:1.1rem; padding:8px 20px;'>{status_emoji(status)} {status}</span></div>", unsafe_allow_html=True)
            safe_markdown(res.get('esito'), fallback='*Nessun dato*')
            st.markdown("</div>", unsafe_allow_html=True)

            # Financial calculation
            if calcolo and calcolo.get('successo'):
                st.markdown("<div class='section-box'>", unsafe_allow_html=True)
                st.markdown("**💰 Riepilogo Calcolo Finanziario**")
                mc1, mc2, mc3, mc4 = st.columns(4)
                mc1.metric("Investimento", f"€{calcolo['investimento_effettivo']:,.0f}")
                mc2.metric("Contributo", f"€{calcolo['contributo']:,.0f}")
                mc3.metric("Finanziamento", f"€{calcolo['finanziamento']:,.0f}")
                mc4.metric("Aliquota Contributo", f"{calcolo['aliquota_contributo']:.0f}%")
                st.markdown("</div>", unsafe_allow_html=True)
            elif calcolo and not calcolo.get('successo'):
                st.error(calcolo.get('errore', ''))

            # What-If
            with st.expander("🔮 Analisi What-If", expanded=False):
                st.markdown("Simula come cambierebbe l'esito variando l'investimento:")
                default_inv = int(invest_val or 100000)
                what_if_val = st.slider("Nuovo Importo Investimento (€)",
                                        min_value=10000, max_value=max(1000000, default_inv * 2),
                                        value=default_inv, step=5000)
                if st.button("Ricalcola con questo importo", use_container_width=True):
                    calcolatore = CalcolatoreFinanziario(pf)
                    nuovo_calcolo = calcolatore.calcola(what_if_val)
                    if nuovo_calcolo.get('successo'):
                        st.success("Ricalcolo effettuato con parametri del bando:")
                        wc1, wc2, wc3 = st.columns(3)
                        wc1.metric("Investimento", f"€{nuovo_calcolo['investimento_effettivo']:,.0f}")
                        wc2.metric("Contributo", f"€{nuovo_calcolo['contributo']:,.0f}")
                        wc3.metric("Finanziamento", f"€{nuovo_calcolo['finanziamento']:,.0f}")
                        if nuovo_calcolo.get('troncato'):
                            st.warning("Superato il massimale — importo troncato")
                    else:
                        st.error(nuovo_calcolo.get('errore', ''))

    with tab2:
        st.markdown("<div class='section-box'>", unsafe_allow_html=True)
        safe_markdown(res.get('progetto'), fallback='*Nessun dato*')
        st.markdown("</div>", unsafe_allow_html=True)

    # Export + Checklist
    st.markdown("<hr style='margin:20px 0;'>", unsafe_allow_html=True)
    ex_c1, ex_c2, ex_c3 = st.columns(3)
    with ex_c1:
        buf = exporter.genera_word(
            "\n".join(f"{k}: {v}" for k, v in [
                ("Azienda", azienda), ("ATECO", res.get('ateco', 'N/D')),
                ("Dimensione", res.get('dimensione', 'N/D')), ("Regione", res.get('regione', 'N/D')),
                ("Dipendenti", res.get('dipendenti', 0)),
                ("Fatturato", f"€{int(res.get('fatturato', 0)):,}"),
                ("Investimento", f"€{int(res.get('investimento', 0)):,}"),
            ]),
            res.get('scheda', ''), res.get('esito', ''), res.get('progetto', ''),
            parametri_finanziari=pf, calcolo_finanziario=calcolo
        )
        st.download_button("📥 Scarica Word", data=buf,
                           file_name=f"Report_{azienda}.docx",
                           mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                           use_container_width=True)
    with ex_c2:
        buf_pdf = exporter.genera_pdf(
            "\n".join(f"{k}: {v}" for k, v in [
                ("Azienda", azienda), ("ATECO", res.get('ateco', 'N/D')),
                ("Dimensione", res.get('dimensione', 'N/D')), ("Regione", res.get('regione', 'N/D')),
                ("Dipendenti", res.get('dipendenti', 0)),
                ("Fatturato", f"€{int(res.get('fatturato', 0)):,}"),
                ("Investimento", f"€{int(res.get('investimento', 0)):,}"),
            ]),
            res.get('scheda', ''), res.get('esito', ''), res.get('progetto', '')
        )
        st.download_button("📥 Scarica PDF", data=buf_pdf,
                           file_name=f"Report_{azienda}.pdf",
                           mime="application/pdf",
                           use_container_width=True)
    with ex_c3:
        buf_pptx = exporter.genera_slides({
            'azienda': azienda, 'esito': res.get('esito', ''),
            'probabilita': res.get('probabilita', 'N/D'),
            'clausole': pf, 'calcolo': calcolo,
            'checklist': list(st.session_state.get('document_checklist_items', {}).keys()),
        })
        st.download_button("📥 Scarica PPTX", data=buf_pptx,
                           file_name=f"Report_{azienda}.pptx",
                           mime="application/vnd.openxmlformats-officedocument.presentationml.presentation",
                           use_container_width=True)

    # Checklist
    st.markdown("<div class='section-box'>", unsafe_allow_html=True)
    st.markdown("**📋 Checklist Documentale**")
    cl_items = st.session_state.get('document_checklist_items', {})
    if cl_items:
        for doc_name in list(cl_items.keys()):
            checked = st.checkbox(doc_name, value=cl_items[doc_name], key=f"chk_{doc_name[:40]}")
            cl_items[doc_name] = checked
    else:
        st.caption("Nessun documento estratto dal bando.")
        st.checkbox("Documento Identità Legale Rappresentante", key="chk_fallback_id")
    st.caption("Spunta i documenti man mano che li ricevi dal cliente.")
    st.markdown("</div>", unsafe_allow_html=True)

    # Back button
    st.markdown("<div class='back-btn'>", unsafe_allow_html=True)
    if st.button("⬅️ TORNA A NUOVA ANALISI", use_container_width=True):
        for k in ['current_analysis', 'bando_scheda', 'esito_raw', 'progetto_raw', 'dati_az_raw']:
            st.session_state[k] = None
        st.session_state.step = 'upload'
        st.session_state.visura_prefill = {}
        st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)


# ──────────────────────────────────────────────
# MAIN — NEW ANALYSIS
# ──────────────────────────────────────────────
else:
    st.markdown("<h1 style='margin-bottom:0.25rem'>🔍 Nuova Valutazione</h1>", unsafe_allow_html=True)
    st.markdown(f"<p style='color:var(--text-sec); margin-top:0;'>Inserisci il bando e i dati azienda per l'analisi di eligibility.</p>", unsafe_allow_html=True)

    # ── CONTAINER 1: Document Upload ──
    done1 = st.session_state.step != 'upload'
    st.markdown(f"<div class='section-box {'done' if done1 else ''}'>", unsafe_allow_html=True)
    st.markdown("**📂 1. Caricamento Documenti**")
    up_c1, up_c2 = st.columns(2)
    with up_c1:
        st.markdown("**📄 Documento Bando**")
        file_bando = st.file_uploader("Carica Bando (PDF)", type="pdf", label_visibility="collapsed")
    with up_c2:
        st.markdown("**🏢 Documenti Azienda (Opzionale)**")
        file_visura = st.file_uploader("Carica Visura (PDF)", type="pdf", label_visibility="collapsed", key="visura_uploader")
        if file_visura:
            if st.button("🔍 Estrai dati automatica", key="estrai_visura", use_container_width=True):
                with st.spinner("Lettura Visura in corso..."):
                    testo_visura = parser.estrai_testo(file_visura)
                    if not testo_visura.startswith("Errore"):
                        dati_visura = estrai_dati_visura(testo_visura)
                        st.session_state.visura_prefill = dati_visura
                        if dati_visura.get('ragione_sociale') or dati_visura.get('ateco'):
                            st.success("Dati precompilati dalla Visura. Verifica e modifica se necessario.")
                            st.rerun()
                        else:
                            st.warning("Visura letta ma non è stato possibile estrarre ATECO/Ragione Sociale. Inserisci manualmente.")
                    else:
                        st.error("Errore lettura Visura. Inserisci manualmente.")
    st.markdown("</div>", unsafe_allow_html=True)

    mostra_form = file_bando is not None
    if mostra_form and st.session_state.step == 'upload':
        st.session_state.step = 'form'
        st.rerun()

    if st.session_state.step == 'form' or (st.session_state.step == 'upload' and mostra_form):
        st.session_state.step = 'form'

    if st.session_state.step == 'form':
        # ── CONTAINER 2: Company Form ──
        st.markdown("<div class='section-box'>", unsafe_allow_html=True)
        st.markdown("**📝 2. Verifica e Inserimento Dati**")
        prefill = st.session_state.visura_prefill

        f_c1, f_c2, f_c3 = st.columns(3)
        with f_c1:
            nome_az = st.text_input("Ragione Sociale *", value=prefill.get('ragione_sociale', ''), placeholder="Mia Impresa Srl")
            ateco = st.text_input("Codice ATECO *", value=prefill.get('ateco', ''), placeholder="62.01")
            regione = st.text_input("Regione Sede", placeholder="Puglia")
        with f_c2:
            fatturato = st.number_input("Fatturato (€)", min_value=0, value=0, step=10000)
            investimento = st.number_input("Investimento Previsto (€)", min_value=0, value=0, step=10000)
            dipendenti = st.number_input("N. Dipendenti", min_value=0, value=0)
        with f_c3:
            dimensione = st.selectbox("Dimensione", ["", "Micro (0-9)", "Piccola (10-49)", "Media (50-249)", "Grande (250+)"])
            data_cost = st.date_input("Costituzione", datetime(2020, 1, 1), min_value=datetime(1900, 1, 1), max_value=datetime.today())
            finanziamento = st.number_input("Finanziamento Richiesto (€)", min_value=0, value=0, step=10000)
        st.markdown("</div>", unsafe_allow_html=True)

        # ── CONTAINER 3: Analysis ──
        st.markdown("<div class='section-box'>", unsafe_allow_html=True)
        st.markdown("**🚀 3. Avvia Analisi**")

        errors = []
        if not file_bando: errors.append("Carica un bando PDF")
        if not nome_az.strip(): errors.append("Ragione Sociale obbligatoria")
        if not ateco.strip(): errors.append("ATECO obbligatorio")
        if fatturato <= 0: errors.append("Il fatturato deve essere > 0")

        if errors:
            for e in errors:
                st.warning(f"⚠️ {e}")

        st.markdown("<div style='text-align:center;'>", unsafe_allow_html=True)
        if st.button("🚀 AVVIA ANALISI PROFESSIONALE", use_container_width=True, type="primary"):
            if not errors:
                anni_bil = datetime.today().year - data_cost.year
                dati_az = (
                    f"Azienda: {nome_az}\nATECO: {ateco}\n"
                    f"Dimensione: {dimensione}\nRegione: {regione}\n"
                    f"Fatturato: €{fatturato:,.0f}\nDipendenti: {dipendenti}\n"
                    f"Data Costituzione: {data_cost}\nAnni Bilancio: {anni_bil}\n"
                    f"Investimento: €{investimento:,.0f}\n"
                    f"Finanziamento Richiesto: €{finanziamento:,.0f}"
                )

                testo = parser.estrai_testo(file_bando)
                if testo.startswith("Errore"):
                    st.error(testo)
                else:
                    errore_llm = None
                    with st.status("Analisi in corso...", expanded=True) as status:
                        st.write("📄 Analisi bando: estrazione parametri...")
                        try: scheda = analyzer.analizza_bando(testo)
                        except Exception as e:
                            scheda = f"Errore analisi bando: {e}"
                            errore_llm = str(e)

                        if not errore_llm:
                            st.write("💰 Estrazione parametri finanziari...")
                            try: parametri = analyzer.estrai_parametri_finanziari(testo)
                            except Exception as e:
                                parametri = {}; errore_llm = str(e)

                        if not errore_llm:
                            st.write("🔄 Verifica eligibility e business plan in parallelo...")
                            try:
                                with ThreadPoolExecutor(max_workers=2) as pool:
                                    fut_elig = pool.submit(analyzer.verifica_eligibility, scheda, dati_az)
                                    fut_prog = pool.submit(analyzer.genera_bozza_progetto, scheda, dati_az)
                                    esito = fut_elig.result(); progetto = fut_prog.result()
                            except Exception as e:
                                esito = f"Errore: {e}"; progetto = ""; errore_llm = str(e)

                        if not errore_llm:
                            st.write("📊 Calcolo finanziario deterministico...")
                            calcolatore = CalcolatoreFinanziario(parametri)
                            calcolo = calcolatore.calcola(investimento)
                            st.session_state.calcolo_finanziario = calcolo
                            st.session_state.parametri_finanziari = parametri

                            val_bil = calcolatore.valida_bilanci(str(data_cost), max(0, anni_bil))
                            if not val_bil['conforme']:
                                esito = f"## VALUTAZIONE_TECNICA\n{val_bil['dettaglio']}\n\nCLASSIFICAZIONE FINALE: ROSSO\n\n" + esito

                            status.update(label="✅ Analisi completata!", state="complete")
                        else:
                            status.update(label="❌ Errore durante l'analisi", state="error")

                    if errore_llm:
                        st.error(f"Errore chiamate LLM: {errore_llm}")
                    else:
                        docs_list = estrai_documenti_da_scheda(scheda)
                        st.session_state.document_checklist_items = {d: False for d in docs_list}

                        res = history_mgr.save_full_analysis(
                            bando_titolo="Bando", azienda_nome=nome_az.strip(),
                            ateco=ateco.strip(), fatturato=fatturato, investimento=investimento,
                            finanziamento=finanziamento, dimensione=dimensione, regione=regione,
                            dipendenti=dipendenti, data_costituzione=str(data_cost),
                            scheda=scheda, esito=esito, progetto=progetto,
                            parametri_finanziari=json.dumps(parametri),
                            document_checklist_items=json.dumps(st.session_state.document_checklist_items),
                        )
                        st.session_state.current_analysis = res
                        st.session_state.step = 'results'
                        st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
