import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { EmployeeBadge } from "@/components/employees/EmployeeBadge";
import { useOrganization } from "@/hooks/useOrganization";
import { Search, Printer, Download, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
  id: string;
  nom: string | null;
  prenom: string | null;
  code_budgetaire: string | null;
  nif: string | null;
  groupe_sanguin: string | null;
  email: string | null;
  photo_url: string | null;
  organization_id: string | null;
  position_id: string | null;
  profile_completed: boolean | null;
  employee_status: string | null;
  positions?: {
    name: string;
  } | null;
}

export default function EmployeeBadges() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();

  // Live preview color overrides (not saved to DB)
  const [livePrimary, setLivePrimary] = useState<string>("#00209F");
  const [liveSecondary, setLiveSecondary] = useState<string>("#D21034");
  const [liveAccent, setLiveAccent] = useState<string>("#FFD700");

  useEffect(() => {
    fetchProfiles();
  }, [organization]);

  useEffect(() => {
    if (organization?.primary_color) setLivePrimary(organization.primary_color);
    if (organization?.secondary_color) setLiveSecondary(organization.secondary_color);
    if (organization?.accent_color) setLiveAccent(organization.accent_color);
  }, [organization]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProfiles(profiles);
    } else {
      const filtered = profiles.filter((profile) => {
        const fullName = `${profile.prenom} ${profile.nom}`.toLowerCase();
        const code = profile.code_budgetaire?.toLowerCase() || "";
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || code.includes(search);
      });
      setFilteredProfiles(filtered);
    }
  }, [searchTerm, profiles]);

  const fetchProfiles = async () => {
    try {
      if (!organization?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nom, prenom, code_budgetaire, nif, groupe_sanguin, email, photo_url, organization_id, position_id, profile_completed, employee_status, positions(name)")
        .eq("organization_id", organization.id)
        .eq("profile_completed", true)
        .order("nom");

      if (error) throw error;

      setProfiles(data || []);
      setFilteredProfiles(data || []);
    } catch (error: any) {
      console.error("Error fetching profiles:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les profils des employés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBadge = (profile: Profile) => {
    setSelectedProfile(profile);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadBadge = async (profile: Profile) => {
    setSelectedProfile(profile);
    
    // Wait for state update and render
    setTimeout(async () => {
      const printArea = document.getElementById('download-area');
      if (!printArea) return;

      // Temporarily show the download area
      printArea.style.display = 'block';
      printArea.style.position = 'fixed';
      printArea.style.left = '-9999px';
      printArea.style.top = '0';

      try {
        const html2canvas = await import('html2canvas');
        const canvas = await html2canvas.default(printArea, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true
        });
        
        const link = document.createElement('a');
        link.download = `badge-${profile.code_budgetaire || profile.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        toast({
          title: "Succès",
          description: "Badge téléchargé avec succès",
        });
      } catch (error) {
        console.error("Error downloading badge:", error);
        toast({
          title: "Erreur",
          description: "Impossible de télécharger le badge",
          variant: "destructive",
        });
      } finally {
        // Hide the download area again
        printArea.style.display = 'none';
      }
    }, 200);
  };

  const handlePrintAll = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestion des badges</h1>
        <p className="text-muted-foreground">
          Gérez et imprimez les badges d'identification des employés
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">
            <CreditCard className="h-4 w-4 mr-2" />
            Liste des employés
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Printer className="h-4 w-4 mr-2" />
            Aperçu d'impression
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Employés avec badges</CardTitle>
                <Badge variant="secondary">
                  {filteredProfiles.length} employé{filteredProfiles.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom ou code budgétaire..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handlePrintAll} variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer tout
                  </Button>
                </div>

                <div className="grid gap-4">
                  {filteredProfiles.map((profile) => (
                    <Card key={profile.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={profile.photo_url || undefined} />
                              <AvatarFallback>
                                {profile.prenom?.[0]}{profile.nom?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">
                                {profile.prenom} {profile.nom}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {profile.code_budgetaire || "Pas de code"}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintBadge(profile)}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Imprimer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadBadge(profile)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredProfiles.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun employé trouvé
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu live & personnalisation couleurs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Testez les couleurs en temps réel. Les modifications restent locales tant que vous ne les
                enregistrez pas dans les paramètres de votre organisation.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Employé
                  </label>
                  <select
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedProfile?.id || ""}
                    onChange={(e) => {
                      const p = profiles.find((x) => x.id === e.target.value);
                      setSelectedProfile(p || null);
                    }}
                  >
                    <option value="">— Choisir —</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.prenom} {p.nom}
                      </option>
                    ))}
                  </select>
                </div>
                {[
                  { label: "Couleur primaire", val: livePrimary, set: setLivePrimary },
                  { label: "Couleur secondaire", val: liveSecondary, set: setLiveSecondary },
                  { label: "Couleur accent", val: liveAccent, set: setLiveAccent },
                ].map((c) => (
                  <div key={c.label}>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {c.label}
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={c.val}
                        onChange={(e) => c.set(e.target.value)}
                        className="h-10 w-12 rounded border border-input cursor-pointer"
                      />
                      <Input
                        value={c.val}
                        onChange={(e) => c.set(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick palette presets */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Palettes rapides
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "Haïti officiel", p: "#00209F", s: "#D21034", a: "#FFD700" },
                    { name: "Or institutionnel", p: "#1a1a1a", s: "#8b6f3a", a: "#c9a84c" },
                    { name: "Marine", p: "#0f1b3d", s: "#1e3a5f", a: "#3b6fa0" },
                    { name: "Émeraude", p: "#064e3b", s: "#0d7a5f", a: "#c9a84c" },
                    { name: "Bordeaux", p: "#5c2018", s: "#9b4423", a: "#d4842a" },
                    { name: "Noir & or", p: "#0d0d0d", s: "#c9a84c", a: "#f0d78c" },
                  ].map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLivePrimary(preset.p);
                        setLiveSecondary(preset.s);
                        setLiveAccent(preset.a);
                      }}
                    >
                      <span className="inline-flex gap-0.5 mr-2">
                        <span className="w-2.5 h-4 rounded-sm" style={{ background: preset.p }} />
                        <span className="w-2.5 h-4 rounded-sm" style={{ background: preset.s }} />
                        <span className="w-2.5 h-4 rounded-sm" style={{ background: preset.a }} />
                      </span>
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                {selectedProfile ? (
                  <EmployeeBadge
                    profile={selectedProfile}
                    organization={organization}
                    positionName={selectedProfile.positions?.name}
                    colorOverride={{
                      primary: livePrimary,
                      secondary: liveSecondary,
                      accent: liveAccent,
                    }}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    Sélectionnez un employé pour prévisualiser son badge avec les couleurs choisies.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handlePrintAll} variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer tous les badges
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Zone de téléchargement (invisible mais rendue) */}
      {selectedProfile && (
        <div id="download-area" style={{ display: 'none' }}>
          <EmployeeBadge 
            profile={selectedProfile} 
            organization={organization}
            positionName={selectedProfile.positions?.name}
            hideActions={true}
          />
        </div>
      )}

      {/* Zone d'impression cachée */}
      <div className="hidden print:block">
        {selectedProfile ? (
          <div id="print-badge" className="flex items-center justify-center min-h-screen">
            <EmployeeBadge 
              profile={selectedProfile} 
              organization={organization}
              positionName={selectedProfile.positions?.name}
              hideActions={true}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {filteredProfiles.map((profile, index) => (
              <div 
                key={profile.id} 
                className="flex items-center justify-center min-h-screen"
                style={{ pageBreakAfter: index < filteredProfiles.length - 1 ? 'always' : 'auto' }}
              >
                <EmployeeBadge 
                  profile={profile} 
                  organization={organization}
                  positionName={profile.positions?.name}
                  hideActions={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
