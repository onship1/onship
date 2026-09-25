export type Urgency = "urgent" | "normal" | "scheduled";

export const CURRENCY = "XOF";

/** Tarif horaire de référence selon le niveau de vérification exigé par la catégorie. */
export function hourlyBaseRate(verificationLevel: number): number {
  return 2500 + Math.max(0, verificationLevel - 1) * 1500;
}

export function urgencyMultiplier(urgency: Urgency): number {
  if (urgency === "urgent") return 1.3;
  if (urgency === "scheduled") return 1;
  return 1.1;
}

/** Prix recommandé, arrondi à 500 près. */
export function recommendedPrice(input: {
  verificationLevel: number;
  durationMinutes: number;
  urgency: Urgency;
}): number {
  const hours = Math.max(0.5, input.durationMinutes / 60);
  const raw = hourlyBaseRate(input.verificationLevel) * hours * urgencyMultiplier(input.urgency);
  return Math.max(1000, Math.round(raw / 500) * 500);
}

export function formatPrice(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} FCFA`;
}
