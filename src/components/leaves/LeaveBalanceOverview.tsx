import { useLeaveBalances } from "@/hooks/useLeaveBalances";
import { LeaveBalanceCard } from "./LeaveBalanceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";

interface LeaveBalanceOverviewProps {
  employeeId?: string;
  showTitle?: boolean;
}

export function LeaveBalanceOverview({ employeeId, showTitle = true }: LeaveBalanceOverviewProps) {
  const { balances, loading } = useLeaveBalances(employeeId);

  // Filter to show only the main leave types
  const mainLeaveTypes = [
    "conge_annuel",
    "conge_maladie",
    "conge_exceptionnel",
  ];

  const mainBalances = balances.filter((b) =>
    mainLeaveTypes.includes(b.leave_type)
  );

  if (loading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5" />
              Solde de Congés
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5" />
            Solde de Congés {new Date().getFullYear()}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mainBalances.map((balance) => (
            <LeaveBalanceCard key={balance.id} balance={balance} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
