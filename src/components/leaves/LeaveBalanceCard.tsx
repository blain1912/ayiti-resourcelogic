import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LEAVE_TYPE_LABELS, type LeaveBalance } from "@/hooks/useLeaveBalances";
import { Calendar, TrendingDown, TrendingUp } from "lucide-react";

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
}

export function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  const usagePercentage = balance.total_days > 0 
    ? (balance.used_days / balance.total_days) * 100 
    : 0;

  const getProgressColor = () => {
    if (usagePercentage >= 90) return "bg-destructive";
    if (usagePercentage >= 70) return "bg-amber-500";
    return "bg-primary";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {LEAVE_TYPE_LABELS[balance.leave_type]}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              <span>Utilisés</span>
            </div>
            <span className="font-semibold">{balance.used_days} j</span>
          </div>

          <Progress 
            value={usagePercentage} 
            className="h-2"
            indicatorClassName={getProgressColor()}
          />

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Restants</span>
            </div>
            <span className={`font-semibold ${balance.remaining_days <= 2 ? 'text-destructive' : 'text-primary'}`}>
              {balance.remaining_days} j
            </span>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-1 border-t">
            Total: {balance.total_days} jours / an
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
