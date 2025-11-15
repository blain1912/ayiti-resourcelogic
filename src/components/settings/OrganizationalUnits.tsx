import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import UnitForm from "./UnitForm";
import UnitsList from "./UnitsList";

interface OrganizationalUnitsProps {
  organizationId: string;
}

const OrganizationalUnits = ({ organizationId }: OrganizationalUnitsProps) => {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  useEffect(() => {
    loadUnits();
  }, [organizationId]);

  const loadUnits = async () => {
    try {
      const { data, error } = await supabase
        .from("organizational_units")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setUnits(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnitCreated = () => {
    setDialogOpen(false);
    loadUnits();
  };

  if (loading) {
    return <p>{language === "fr" ? "Chargement..." : "Loading..."}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {language === "fr" ? "Structures Administratives" : "Administrative Units"}
            </CardTitle>
            <CardDescription>
              {language === "fr" 
                ? "Gérez les différentes structures de votre organisation" 
                : "Manage your organization's different structures"}
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {language === "fr" ? "Ajouter une structure" : "Add Unit"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === "fr" ? "Nouvelle structure administrative" : "New Administrative Unit"}
                </DialogTitle>
              </DialogHeader>
              <UnitForm 
                organizationId={organizationId} 
                units={units}
                onSuccess={handleUnitCreated} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <UnitsList units={units} onUpdate={loadUnits} />
      </CardContent>
    </Card>
  );
};

export default OrganizationalUnits;
