import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ProfessorGrade = "assistant" | "adjoint" | "associe" | "titulaire" | "emerite";

export interface ProfessorGradeData {
  id: string;
  organization_id: string;
  grade: ProfessorGrade;
  salary: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useProfessorGrades = (organizationId: string | undefined) => {
  const [grades, setGrades] = useState<ProfessorGradeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchGrades();
    }
  }, [organizationId]);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("professor_grades")
        .select("*")
        .eq("organization_id", organizationId)
        .order("salary", { ascending: true });

      if (error) throw error;
      setGrades(data || []);
    } catch (error: any) {
      console.error("Error fetching professor grades:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les grades de professeurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createGrade = async (grade: ProfessorGrade, salary: number, description?: string) => {
    try {
      const { error } = await supabase.from("professor_grades").insert({
        organization_id: organizationId,
        grade,
        salary,
        description: description || null,
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Grade créé avec succès",
      });

      fetchGrades();
      return true;
    } catch (error: any) {
      console.error("Error creating grade:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le grade",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGrade = async (id: string, salary: number, description?: string) => {
    try {
      const { error } = await supabase
        .from("professor_grades")
        .update({
          salary,
          description: description || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Grade mis à jour avec succès",
      });

      fetchGrades();
      return true;
    } catch (error: any) {
      console.error("Error updating grade:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le grade",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteGrade = async (id: string) => {
    try {
      const { error } = await supabase
        .from("professor_grades")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Grade supprimé avec succès",
      });

      fetchGrades();
      return true;
    } catch (error: any) {
      console.error("Error deleting grade:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le grade",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    grades,
    loading,
    createGrade,
    updateGrade,
    deleteGrade,
    refetch: fetchGrades,
  };
};
