"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Analysis } from "@/types";

export function useAnalyses() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching analyses:", error);
      return;
    }
    setAnalyses(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const saveAnalysis = async (record: {
    nome_azienda: string;
    esito_analisi: string;
    probabilita?: number;
    ateco?: string;
    investimento?: number;
    scheda_bando?: string;
    eligibility?: string;
    business_plan?: string;
    parametri_finanziari?: any;
    calcolo_finanziario?: any;
  }) => {
    const { data, error } = await supabase
      .from("analyses")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error("Error saving analysis:", error);
      throw error;
    }
    setAnalyses((prev) => [data as Analysis, ...prev]);
    return data as Analysis;
  };

  const deleteAnalysis = async (id: string) => {
    const { error } = await supabase
      .from("analyses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting analysis:", error);
      throw error;
    }
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  return { analyses, loading, fetchAnalyses, saveAnalysis, deleteAnalysis };
}
