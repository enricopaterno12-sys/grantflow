import axios from "axios";
import type { CompanyData, ParametriFinanziari } from "@/types";

const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
});

export async function analyzeBando(file: File, visura?: File) {
  const formData = new FormData();
  formData.append("file", file);
  if (visura) formData.append("visura", visura);
  const res = await api.post("/analyze", formData);
  return res.data;
}

export async function verifyEligibility(data: {
  dati_azienda: CompanyData;
  parametri_finanziari: ParametriFinanziari;
  scheda_bando: string;
}) {
  const res = await api.post("/verify", data);
  return res.data;
}

export default api;
