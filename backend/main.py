import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from routers import analyze, enrich, process, export

app = FastAPI(
    title="GrantFlow AI API",
    description="Backend per analisi bandi e finanziamenti agevolati",
    version="2.0.0",
)

# CORS for frontend
origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000,https://grantflow-39h3-enricopaterno12-sys-projects.vercel.app").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(analyze.router, prefix="/api", tags=["Analyze"])
app.include_router(enrich.router, prefix="/api", tags=["Enrich"])
app.include_router(process.router, prefix="/api", tags=["Process"])
app.include_router(export.router, prefix="/api", tags=["Export"])


@app.get("/api/health")
async def health():
    return {"status": "online", "version": "2.0.0"}


# Vercel handler
handler = Mangum(app)
