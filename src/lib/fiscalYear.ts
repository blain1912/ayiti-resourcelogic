// Année fiscale haïtienne : 1er octobre -> 30 septembre de l'année suivante.

export const FISCAL_MONTHS = [
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
];

export const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** Année de début de l'exercice fiscal contenant la date donnée. */
export const fiscalYearStart = (date: Date = new Date()): number =>
  date.getMonth() + 1 >= 10 ? date.getFullYear() : date.getFullYear() - 1;

/** Libellé d'un exercice : "Exercice 2025-2026". */
export const fiscalYearLabel = (startYear: number) =>
  `Exercice ${startYear}-${startYear + 1}`;

/** Année civile d'un mois donné à l'intérieur d'un exercice fiscal. */
export const calendarYearForFiscalMonth = (startYear: number, month: number) =>
  month >= 10 ? startYear : startYear + 1;

/** Exercice fiscal d'un couple (année civile, mois). */
export const fiscalYearOf = (year: number, month: number) =>
  month >= 10 ? year : year - 1;

/** Ordre d'un mois dans l'exercice fiscal (Octobre = 0 ... Septembre = 11). */
export const fiscalMonthOrder = (month: number) => (month >= 10 ? month - 10 : month + 2);

/** Liste d'exercices disponibles, du plus récent au plus ancien. */
export const fiscalYearOptions = (count = 6, from: Date = new Date()) => {
  const start = fiscalYearStart(from);
  return Array.from({ length: count }, (_, i) => start - i);
};
