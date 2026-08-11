import { Button } from "@/components/ui/button";
import { ClipboardList, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  downloadStructureFormExcel,
  downloadStructureFormPdf,
} from "@/utils/structureCollectionForm";

interface Props {
  organizationName?: string | null;
}

const StructureCollectionButton = ({ organizationName }: Props) => {
  const handle = (fn: () => void) => {
    try {
      fn();
      toast.success("Fiche de collecte téléchargée");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération de la fiche");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline">
          <ClipboardList className="h-4 w-4 mr-2" />
          Fiche de collecte
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover z-50">
        <DropdownMenuItem onClick={() => handle(() => downloadStructureFormPdf(organizationName))}>
          <FileText className="h-4 w-4 mr-2" />
          Formulaire PDF (à imprimer)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle(() => downloadStructureFormExcel(organizationName))}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Modèle Excel (à remplir)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StructureCollectionButton;
