import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Documents() {
  const { t } = useLanguage();

  const documents = [
    { id: 1, name: "Contrat_MJLouis_2025.pdf", category: "Contrats", date: "01/11/2025", size: "245 KB" },
    { id: 2, name: "Fiche_Paie_Nov2025.xlsx", category: "Paie", date: "30/11/2025", size: "89 KB" },
    { id: 3, name: "Reglement_Interieur.pdf", category: "Règlements", date: "15/10/2025", size: "1.2 MB" },
    { id: 4, name: "Attestation_Travail_JBP.pdf", category: "Attestations", date: "20/11/2025", size: "156 KB" },
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, "default" | "secondary" | "outline"> = {
      "Contrats": "default",
      "Paie": "secondary",
      "Règlements": "outline",
      "Attestations": "default",
    };
    return colors[category] || "secondary";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("documentManagement")}</h1>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          {t("uploadDocument")}
        </Button>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{doc.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getCategoryColor(doc.category)}>{doc.category}</Badge>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{doc.date}</span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{doc.size}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
