import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft } from "lucide-react";
import { StaffMovementReport } from "@/components/reports/StaffMovementReport";

const StaffMovements = () => {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <ArrowRightLeft className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mouvement du personnel</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les promotions, mutations, transferts, mises à disposition, détachements et changements de catégorie.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registre officiel</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffMovementReport />
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffMovements;
