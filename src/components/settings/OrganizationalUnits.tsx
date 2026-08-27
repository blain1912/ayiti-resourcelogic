import { useEffect, useState } from "react";
import { Plus, Download } from "lucide-react";
import { downloadExistingStructuresExcel } from "@/utils/structureCollectionForm";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { institutionTypeLabel } from "@/lib/institutionTypes";
import UnitForm from "./UnitForm";
import UnitsList from "./UnitsList";
import OrgChart from "./OrgChart";
import StructureCollectionButton from "./StructureCollectionButton";
import StructureImportDialog from "./StructureImportDialog";

interface OrganizationalUnitsProps {
  organizationId: string;
}

const OrganizationalUnits = ({ organizationId }: OrganizationalUnitsProps) => {
  const [units, setUnits] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null }[]>([]);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgType, setOrgType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  useEffect(() => {
    if (!organizationId) return;
    loadUnits();
    supabase
      .from("organizations")
      .select("name, type")
      .eq("id", organizationId)
      .maybeSingle()
      .then(({ data }) => {
        setOrgName(data?.name ?? null);
        setOrgType(data?.type ?? null);
      });
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", organizationId)
      .order("full_name")
      .then(({ data }) => setProfiles(data || []));
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

  const profileName = (id?: string | null) =>
    profiles.find((p) => p.id === id)?.full_name ?? null;

  const chartUnits = units.map((u) => ({
    ...u,
    manager_name: profileName((u as any).manager_profile_id),
  }));

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
                ? "Gérez les différentes structures de votre institution, sur plusieurs niveaux"
                : "Manage your institution's structures, across multiple levels"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <StructureCollectionButton organizationName={orgName} />
          <Button
            type="button"
            variant="outline"
            disabled={units.length === 0}
            onClick={() => downloadExistingStructuresExcel(units, orgName)}
          >
            <Download className="h-4 w-4 mr-2" />
            {language === "fr" ? "Exporter Excel" : "Export Excel"}
          </Button>

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
                profiles={profiles}
                onSuccess={handleUnitCreated}
              />
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list">
          <TabsList className="mb-4">
            <TabsTrigger value="list">{language === "fr" ? "Liste" : "List"}</TabsTrigger>
            <TabsTrigger value="chart">{language === "fr" ? "Organigramme" : "Org chart"}</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <UnitsList units={units} onUpdate={loadUnits} />
          </TabsContent>
          <TabsContent value="chart">
            <OrgChart
              units={chartUnits}
              organizationName={orgName}
              organizationType={institutionTypeLabel(orgType, language)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default OrganizationalUnits;
