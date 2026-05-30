// Politique de congés - barème haïtien par défaut + personnalisation par organisation

export interface LeaveTier {
  min_years: number;
  max_years: number;
  days: number;
}

export interface LeavePolicy {
  mode: "seniority_haiti" | "fixed";
  fixed_annual_days: number;
  tiers: LeaveTier[];
  sick_days: number;
  maternity_days: number;
  paternity_days: number;
  exceptional_days: number;
  study_days: number;
}

export const DEFAULT_LEAVE_POLICY: LeavePolicy = {
  mode: "seniority_haiti",
  fixed_annual_days: 20,
  tiers: [
    { min_years: 0, max_years: 5, days: 15 },
    { min_years: 6, max_years: 10, days: 20 },
    { min_years: 11, max_years: 999, days: 25 },
  ],
  sick_days: 15,
  maternity_days: 90,
  paternity_days: 10,
  exceptional_days: 5,
  study_days: 30,
};

export function computeYearsOfService(dateEntreeFonction?: string | null): number {
  if (!dateEntreeFonction) return 0;
  const start = new Date(dateEntreeFonction);
  if (isNaN(start.getTime())) return 0;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const m = now.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < start.getDate())) years--;
  return Math.max(0, years);
}

export function computeAnnualLeaveDays(
  policy: LeavePolicy,
  dateEntreeFonction?: string | null
): number {
  if (policy.mode === "fixed") return policy.fixed_annual_days;
  const years = computeYearsOfService(dateEntreeFonction);
  const tier = policy.tiers.find((t) => years >= t.min_years && years <= t.max_years);
  return tier?.days ?? policy.fixed_annual_days;
}

export function normalizePolicy(raw: any): LeavePolicy {
  if (!raw || typeof raw !== "object") return DEFAULT_LEAVE_POLICY;
  return {
    mode: raw.mode === "fixed" ? "fixed" : "seniority_haiti",
    fixed_annual_days: Number(raw.fixed_annual_days ?? 20),
    tiers: Array.isArray(raw.tiers) && raw.tiers.length > 0 ? raw.tiers : DEFAULT_LEAVE_POLICY.tiers,
    sick_days: Number(raw.sick_days ?? 15),
    maternity_days: Number(raw.maternity_days ?? 90),
    paternity_days: Number(raw.paternity_days ?? 10),
    exceptional_days: Number(raw.exceptional_days ?? 5),
    study_days: Number(raw.study_days ?? 30),
  };
}
