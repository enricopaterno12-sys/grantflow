import axios from "axios";
import type { CompanyData, ParametriFinanziari } from "@/types";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "";
const baseURL = FASTAPI_URL || "/api";

const api = axios.create({
  baseURL,
  timeout: 180000,
});

export async function analyzeBando(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/analyze", formData, { timeout: 300000 });
  return res.data;
}

export async function enrichVisura(visura: File) {
  const formData = new FormData();
  formData.append("file", visura);
  const res = await api.post("/enrich", formData, { timeout: 120000 });
  return res.data;
}

export async function verifyEligibility(data: {
  dati_azienda: CompanyData;
  parametri_finanziari: ParametriFinanziari;
  scheda_bando: string;
  deep_scan: Record<string, unknown>;
  custom_prompt?: string;
}) {
  if (FASTAPI_URL) {
    const res = await api.post("/process", {
      testo_bando: data.scheda_bando,
      dati_azienda: data.dati_azienda,
      testo_visura: "",
    });
    return res.data;
  }
  const res = await api.post("/verify", data);
  return res.data;
}

export async function exportDocument(type: string, data: Record<string, unknown>) {
  if (FASTAPI_URL) {
    const res = await api.post(`/export/${type}`, data, { responseType: "blob" });
    return res.data;
  }
  const res = await api.post("/export", { type, data }, { responseType: "blob" });
  return res.data;
}

export default api;
