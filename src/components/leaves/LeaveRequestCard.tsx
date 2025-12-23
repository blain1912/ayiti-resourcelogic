import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Check, X, Clock, Ban, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { LeaveRequest } from "@/hooks/useLeaveRequests";

const leaveTypeLabels: Record<string, string> = {
  conge_annuel: "Congé annuel",
  conge_maladie: "Congé maladie",
  conge_maternite: "Congé maternité",
  conge_paternite: "Congé paternité",
  conge_sans_solde: "Congé sans solde",
  conge_exceptionnel: "Congé exceptionnel",
  conge_etudes: "Congé d'études",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  approved: { label: "Approuvé", variant: "default" },
  rejected: { label: "Rejeté", variant: "destructive" },
  cancelled: { label: "Annulé", variant: "outline" },
};

interface LeaveRequestCardProps {
  request: LeaveRequest;
  isAdmin?: boolean;
  currentUserId?: string;
  onApprove?: (id: string, comment?: string) => Promise<{ error: any }>;
  onReject?: (id: string, comment?: string) => Promise<{ error: any }>;
  onCancel?: (id: string) => Promise<{ error: any }>;
}

export function LeaveRequestCard({
  request,
  isAdmin = false,
  currentUserId,
  onApprove,
  onReject,
  onCancel,
}: LeaveRequestCardProps) {
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employee = request.employee;
  const employeeName = employee?.full_name || 
    (employee?.prenom && employee?.nom ? `${employee.prenom} ${employee.nom}` : "Employé");
  
  const initials = employeeName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const startDate = format(new Date(request.start_date), "dd MMM yyyy", { locale: fr });
  const endDate = format(new Date(request.end_date), "dd MMM yyyy", { locale: fr });
  
  const isOwnRequest = currentUserId === request.employee_id;
  const canCancel = isOwnRequest && request.status === "pending" && onCancel;
  const canReview = isAdmin && request.status === "pending" && !isOwnRequest;

  const handleReviewClick = (action: "approve" | "reject") => {
    setReviewAction(action);
    setReviewComment("");
    setReviewDialogOpen(true);
  };

  const handleReviewSubmit = async () => {
    setIsSubmitting(true);
    if (reviewAction === "approve" && onApprove) {
      await onApprove(request.id, reviewComment);
    } else if (reviewAction === "reject" && onReject) {
      await onReject(request.id, reviewComment);
    }
    setIsSubmitting(false);
    setReviewDialogOpen(false);
  };

  const handleCancel = async () => {
    if (onCancel) {
      await onCancel(request.id);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={employee?.photo_url || undefined} alt={employeeName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{employeeName}</h3>
                <p className="text-sm text-muted-foreground">
                  {leaveTypeLabels[request.leave_type] || request.leave_type}
                </p>
              </div>
            </div>
            <Badge variant={statusConfig[request.status]?.variant || "secondary"}>
              {statusConfig[request.status]?.label || request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Du {startDate} au {endDate}</span>
          </div>

          {request.reason && (
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <p className="text-muted-foreground">{request.reason}</p>
            </div>
          )}

          {request.review_comment && (
            <div className="bg-muted/50 p-3 rounded-md text-sm">
              <p className="font-medium text-xs text-muted-foreground mb-1">
                Commentaire du responsable:
              </p>
              <p>{request.review_comment}</p>
            </div>
          )}

          {(canReview || canCancel) && (
            <div className="flex gap-2 pt-2">
              {canReview && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1"
                    onClick={() => handleReviewClick("approve")}
                  >
                    <Check className="h-4 w-4" />
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={() => handleReviewClick("reject")}
                  >
                    <X className="h-4 w-4" />
                    Rejeter
                  </Button>
                </>
              )}
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={handleCancel}
                >
                  <Ban className="h-4 w-4" />
                  Annuler
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approuver la demande" : "Rejeter la demande"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Commentaire (optionnel)</Label>
              <Textarea
                placeholder="Ajoutez un commentaire..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={reviewAction === "approve" ? "default" : "destructive"}
              onClick={handleReviewSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "En cours..." : reviewAction === "approve" ? "Approuver" : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
