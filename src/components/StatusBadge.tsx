import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  draft: "Brouillon",
  searching: "Recherche en cours",
  offers_received: "Offres reçues",
  provider_selected: "Prestataire choisi",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  expired: "Expirée",
  disputed: "Litige",
  confirmed: "Confirmée",
  provider_on_way: "En route",
  started: "Démarrée",
};

const VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  searching: "default",
  offers_received: "default",
  provider_selected: "default",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
  expired: "outline",
  disputed: "destructive",
  draft: "outline",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANTS[status] ?? "secondary"} className="shrink-0">
      {LABELS[status] ?? status}
    </Badge>
  );
}
