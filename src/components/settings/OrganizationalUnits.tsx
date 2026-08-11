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
import StructureCollectionButton from "./StructureCollectionButton";
import StructureImportDialog from "./StructureImportDialog";

interface OrganizationalUnitsProps {
  organizationId: string;
}

const OrganizationalUnits = ({ organizationId }: OrganizationalUnitsProps) => {
  const [units, setUnits] = useState<any[]>([]);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  useEffect(() => {
    if (!organizationId) return;
    loadUnits();
    supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle()
      .then(({ data }) => setOrgName(data?.name ?? null));
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          <div className="flex flex-wrap items-center gap-2">
          <StructureCollectionButton organizationName={orgName} />
          <StructureImportDialog
            organizationId={organizationId}
            existingUnits={units}
            onImported={loadUnits}
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button">
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
        </div>
      </CardHeader>
      <CardContent>
        <UnitsList units={units} onUpdate={loadUnits} />
      </CardContent>
    </Card>
  );
};

export default OrganizationalUnits;
