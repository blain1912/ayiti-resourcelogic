/**
 * Ancienneté : toujours dérivée de dates fiables, jamais stockée.
 */

export interface Duration {
  years: number;
  months: number;
  totalMonths: number;
}

export const durationSince = (from?: string | Date | null, to: Date = new Date()): Duration | null => {
  if (!from) return null;
  const start = from instanceof Date ? from : new Date(`${from}T00:00:00`);
  if (Number.isNaN(start.getTime()) || start > to) return null;

  let months = (to.getFullYear() - start.getFullYear()) * 12 + (to.getMonth() - start.getMonth());
  if (to.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;

  return { years: Math.floor(months / 12), months: months % 12, totalMonths: months };
};

export const formatDuration = (duration: Duration | null): string => {
  if (!duration) return "Non calculable";
  const { years, months } = duration;
  if (years === 0 && months === 0) return "Moins d'un mois";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mois`);
  return parts.join(" ");
};

export const seniorityFrom = (date?: string | Date | null) => formatDuration(durationSince(date));

export const formatDate = (value?: string | Date | null) => {
  if (!value) return "Non renseigné";
  const d = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Non renseigné";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};
