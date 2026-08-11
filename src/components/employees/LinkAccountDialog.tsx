import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Candidate {
  id: string;
  full_name: string | null;
  nif: string | null;
  email: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  signupProfile: { id: string; full_name: string | null; email: string | null } | null;
  onDone?: () => void;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function LinkAccountDialog({ open, onOpenChange, organizationId, signupProfile, onDone }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !organizationId) return;
    setSelected(null);
    setSearch("");
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, full_name, nif, email")
      .eq("organization_id", organizationId)
      .order("full_name")
      .then(({ data }) => {
        setCandidates((data || []).filter((c: any) => c.id !== signupProfile?.id));
        setLoading(false);
      });
  }, [open, organizationId, signupProfile?.id]);

  const suggestions = useMemo(() => {
    const name = normalize(signupProfile?.full_name || "");
    if (!name) return new Set<string>();
    const words = name.split(/\s+/).filter((w) => w.length > 2);
    return new Set(
      candidates
        .filter((c) => {
          const n = normalize(c.full_name || "");
          return words.some((w) => n.includes(w));
        })
        .map((c) => c.id)
    );
  }, [candidates, signupProfile?.full_name]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    const list = q
      ? candidates.filter(
          (c) => normalize(c.full_name || "").includes(q) || (c.nif || "").includes(search)
        )
      : candidates;
    return [...list].sort((a, b) => Number(suggestions.has(b.id)) - Number(suggestions.has(a.id)));
  }, [candidates, search, suggestions]);

  const handleMerge = async () => {
    if (!selected || !signupProfile) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("link-employee-account", {
        body: { action: "merge", signup_profile_id: signupProfile.id, target_profile_id: selected },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Compte lié",
        description: "L'inscription a été rattachée à la fiche employé existante.",
      });
      onOpenChange(false);
      onDone?.();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lier à une fiche existante</DialogTitle>
          <DialogDescription>
            Rattachez le compte de <strong>{signupProfile?.full_name || signupProfile?.email}</strong> à une
            fiche employé déjà présente (importée). L'historique de la fiche est conservé et le doublon est
            supprimé.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher par nom ou NIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
          {loading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Aucune fiche trouvée</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-muted ${
                  selected === c.id ? "bg-muted" : ""
                }`}
              >
                <span>
                  <span className="font-medium">{c.full_name || "Sans nom"}</span>
                  {c.nif && <span className="text-muted-foreground text-xs ml-2">NIF {c.nif}</span>}
                </span>
                {suggestions.has(c.id) && (
                  <Badge variant="outline" className="text-[10px]">
                    suggéré
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleMerge} disabled={!selected || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
            Lier le compte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
