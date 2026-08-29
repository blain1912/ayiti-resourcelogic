import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { exportToPdf } from "@/lib/exportPdf";
import { useOrganization } from "@/hooks/useOrganization";
import { hrProfileName } from "@/hooks/useHrProfile";
import { formatFrDate } from "@/lib/hr";
import type { Mission } from "@/hooks/useMissions";

interface Props {
  mission: Mission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Ordre de mission imprimable (format lettre US, marges 2,5 cm). */
export const MissionOrderDialog = ({ mission, open, onOpenChange }: Props) => {
  const { organization } = useOrganization();

  if (!mission) return null;

  const handleExport = async () => {
    await exportToPdf(
      "mission-order-document",
      `ordre-de-mission-${mission.reference || mission.id.slice(0, 8)}.pdf`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ordre de mission</DialogTitle>
          <DialogDescription>Document officiel à signer par l'autorité compétente.</DialogDescription>
        </DialogHeader>

        <div
          id="mission-order-document"
          data-pdf-section
          className="bg-card text-card-foreground border rounded-md p-10 space-y-6"
        >
          <div className="text-center space-y-1 border-b pb-4">
            <p className="text-sm uppercase tracking-wide">{organization?.name ?? ""}</p>
            {organization?.acronym && <p className="text-xs text-muted-foreground">{organization.acronym}</p>}
            <h2 className="text-xl font-bold pt-3">ORDRE DE MISSION</h2>
            {mission.reference && <p className="text-sm">Référence : {mission.reference}</p>}
          </div>

          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              <span className="font-semibold">Objet de la mission :</span> {mission.subject}
            </p>
            <p>
              <span className="font-semibold">Destination :</span>{" "}
              {[mission.place, mission.destination, mission.city, mission.country].filter(Boolean).join(", ") ||
                "—"}
            </p>
            <p>
              <span className="font-semibold">Période :</span> du {formatFrDate(mission.start_date)} au{" "}
              {formatFrDate(mission.end_date)}
            </p>
            {mission.lead && (
              <p>
                <span className="font-semibold">Chef de mission :</span> {hrProfileName(mission.lead)}
              </p>
            )}
            {mission.unit?.name && (
              <p>
                <span className="font-semibold">Structure :</span> {mission.unit.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-sm">Agents désignés</p>
            <ol className="list-decimal pl-6 text-sm space-y-1">
              {(mission.participants || []).map((p) => (
                <li key={p.id}>
                  {hrProfileName(p.profile)}
                  {p.role_in_mission ? ` — ${p.role_in_mission}` : ""}
                </li>
              ))}
            </ol>
          </div>

          {mission.observations && (
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Observations</p>
              <p>{mission.observations}</p>
            </div>
          )}

          <div className="pt-10 flex justify-between text-sm">
            <div>
              <p>
                Fait à {organization?.city ?? "________"}, le{" "}
                {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="text-center">
              <p className="mb-16">L'Autorité compétente</p>
              <p className="border-t pt-1">Signature et cachet</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handleExport}>
            <Printer className="h-4 w-4 mr-2" /> Télécharger en PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MissionOrderDialog;
