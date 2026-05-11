from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from models.schemas import ExportRequest
from services.exporter import genera_pdf, genera_docx, genera_pptx, genera_xlsx

router = APIRouter()


@router.post("/export/{tipo}")
async def export_document(tipo: str, req: ExportRequest):
    azienda = req.dati_azienda.dict()
    calcolo = req.calcolo
    parametri = req.parametri

    if tipo == "pdf":
        buf = genera_pdf(
            nome_bando="Bando",
            ente="Ente",
            azienda=azienda,
            eligibility=req.eligibility_report,
            analisi=req.analisi_tecnica,
            business_plan=req.business_plan,
            parametri=parametri,
            calcolo=calcolo,
        )
        return Response(
            content=buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="report_{azienda.get("ragione_sociale", "azienda")}.pdf"'},
        )

    elif tipo == "docx":
        buf = genera_docx(
            nome_bando="Bando",
            ente="Ente",
            azienda=azienda,
            eligibility=req.eligibility_report,
            analisi=req.analisi_tecnica,
            business_plan=req.business_plan,
            parametri=parametri,
            calcolo=calcolo,
            checklist=[],
        )
        return Response(
            content=buf,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="dossier_{azienda.get("ragione_sociale", "azienda")}.docx"'},
        )

    elif tipo == "pptx":
        buf = genera_pptx(
            azienda=azienda,
            calcolo=calcolo,
            eligibility=req.eligibility_report,
            nome_bando="Bando",
            analisi=req.analisi_tecnica,
        )
        return Response(
            content=buf,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f'attachment; filename="pitch_{azienda.get("ragione_sociale", "azienda")}.pptx"'},
        )

    elif tipo == "xlsx":
        buf = genera_xlsx(
            calcolo=calcolo,
            azienda=azienda,
            parametri=parametri,
            nome_bando="Bando",
        )
        return Response(
            content=buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="business_plan_{azienda.get("ragione_sociale", "azienda")}.xlsx"'},
        )

    else:
        raise HTTPException(400, f"Tipo sconosciuto: {tipo}")
