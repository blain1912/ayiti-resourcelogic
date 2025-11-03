import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Leaves() {
  const { t } = useLanguage();

  const leaveRequests = [
    { id: 1, employee: "Marie Jeanne Louis", type: "Congé annuel", start: "15/12/2025", end: "20/12/2025", status: "approved" },
    { id: 2, employee: "Jean Baptiste Pierre", type: "Congé maladie", start: "10/12/2025", end: "12/12/2025", status: "pending" },
    { id: 3, employee: "Sophie Duvalsaint", type: "Congé maternité", start: "01/01/2026", end: "31/03/2026", status: "approved" },
    { id: 4, employee: "Marc Antoine Joseph", type: "Congé sans solde", start: "05/12/2025", end: "05/12/2025", status: "rejected" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("leaveRequests")}</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("requestLeave")}
        </Button>
      </div>

      <div className="grid gap-4">
        {leaveRequests.map((leave) => (
          <Card key={leave.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{leave.employee}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{leave.type}</p>
                </div>
                <Badge variant={getStatusColor(leave.status)}>
                  {getStatusText(leave.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>Du {leave.start} au {leave.end}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
