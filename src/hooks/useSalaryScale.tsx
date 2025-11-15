import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Position {
  id: string;
  name: string;
  category_id: string;
  salary: number;
  organization_id: string;
}

export interface EmployeeCategory {
  id: string;
  name: string;
  organization_id: string;
  positions?: Position[];
}

export const useSalaryScale = (organizationId?: string) => {
  const [categories, setCategories] = useState<EmployeeCategory[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (organizationId) {
      fetchSalaryScale();
    }
  }, [organizationId]);

  const fetchSalaryScale = async () => {
    try {
      setLoading(true);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("employee_categories")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("name");

      if (categoriesError) throw categoriesError;

      // Fetch positions
      const { data: positionsData, error: positionsError } = await supabase
        .from("positions")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("name");

      if (positionsError) throw positionsError;

      setCategories(categoriesData || []);
      setPositions(positionsData || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from("employee_categories")
        .insert({ name, organization_id: organizationId! })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Catégorie créée avec succès",
      });

      fetchSalaryScale();
      return data;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createPosition = async (
    name: string,
    categoryId: string,
    salary: number
  ) => {
    try {
      const { data, error } = await supabase
        .from("positions")
        .insert({
          name,
          category_id: categoryId,
          salary,
          organization_id: organizationId!,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Poste créé avec succès",
      });

      fetchSalaryScale();
      return data;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deletePosition = async (positionId: string) => {
    try {
      const { error } = await supabase
        .from("positions")
        .delete()
        .eq("id", positionId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Poste supprimé avec succès",
      });

      fetchSalaryScale();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from("employee_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès",
      });

      fetchSalaryScale();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    categories,
    positions,
    loading,
    createCategory,
    createPosition,
    deletePosition,
    deleteCategory,
    refetch: fetchSalaryScale,
  };
};
