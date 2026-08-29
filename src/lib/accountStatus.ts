/**
 * Statut du COMPTE UTILISATEUR GRHPro rattaché à un PROFIL AGENT.
 * Un agent peut exister dans le registre RH sans compte utilisateur.
 */
export type AccountStatus =
  | "no_account"
  | "invitation_pending"
  | "invitation_sent"
  | "invitation_expired"
  | "active"
  | "suspended";

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  no_account: "Aucun compte",
  invitation_pending: "Invitation à envoyer",
  invitation_sent: "Invitation envoyée",
  invitation_expired: "Invitation expirée",
  active: "Compte activé",
  suspended: "Compte suspendu",
};

export const ACCOUNT_STATUS_VARIANTS: Record<
  AccountStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  no_account: "outline",
  invitation_pending: "secondary",
  invitation_sent: "secondary",
  invitation_expired: "destructive",
  active: "default",
  suspended: "destructive",
};

/** Statut effectif : une invitation dont la date d'expiration est passée est considérée expirée. */
export const effectiveAccountStatus = (
  status?: string | null,
  expiresAt?: string | null,
): AccountStatus => {
  const s = (status || "no_account") as AccountStatus;
  if (s === "invitation_sent" && expiresAt && new Date(expiresAt) < new Date()) {
    return "invitation_expired";
  }
  return s;
};

export const accountStatusLabel = (status?: string | null, expiresAt?: string | null) =>
  ACCOUNT_STATUS_LABELS[effectiveAccountStatus(status, expiresAt)];
