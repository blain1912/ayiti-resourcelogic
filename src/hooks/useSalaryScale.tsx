import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Position {
  id: string;
  name: string;
  category_id: string;
  salary: number;
  organization_id: string | null;
  is_template?: boolean;
}

export interface EmployeeCategory {
  id: string;
  name: string;
  organization_id: string | null;
  is_template?: boolean;
  positions?: Position[];
}

export const useSalaryScale = (organizationId?: string | null, isTemplate: boolean = false) => {
  const [categories, setCategories] = useState<EmployeeCategory[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isTemplate || organizationId) {
      fetchSalaryScale();
    }
  }, [organizationId, isTemplate]);

  const fetchSalaryScale = async () => {
    try {
      setLoading(true);

      let categoriesQuery = supabase.from("employee_categories").select("*");
      let positionsQuery = supabase.from("positions").select("*");

      if (isTemplate) {
        // Fetch template categories and positions (organization_id IS NULL)
        categoriesQuery = categoriesQuery.is("organization_id", null).eq("is_template", true);
        positionsQuery = positionsQuery.is("organization_id", null).eq("is_template", true);
      } else {
        // Fetch organization-specific categories and positions
        categoriesQuery = categoriesQuery.eq("organization_id", organizationId!);
        positionsQuery = positionsQuery.eq("organization_id", organizationId!);
      }

      const { data: categoriesData, error: categoriesError } = await categoriesQuery.order("name");
      if (categoriesError) throw categoriesError;

      const { data: positionsData, error: positionsError } = await positionsQuery.order("name");
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
      const insertData: any = { name };
      if (isTemplate) {
        insertData.organization_id = null;
        insertData.is_template = true;
      } else {
        insertData.organization_id = organizationId!;
        insertData.is_template = false;
      }

      const { data, error } = await supabase
        .from("employee_categories")
        .insert(insertData)
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
      const insertData: any = {
        name,
        category_id: categoryId,
        salary,
      };
      if (isTemplate) {
        insertData.organization_id = null;
        insertData.is_template = true;
      } else {
        insertData.organization_id = organizationId!;
        insertData.is_template = false;
      }

      const { data, error } = await supabase
        .from("positions")
        .insert(insertData)
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
