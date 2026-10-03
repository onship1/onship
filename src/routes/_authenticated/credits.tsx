import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getWalletHistory } from "@/lib/marketplace.functions";
import { getMyProviderProfile } from "@/lib/profile.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppMode } from "@/hooks/useAppMode";

export const Route = createFileRoute("/_authenticated/credits")({
  head: () => ({
    meta: [
      { title: "Mes crédits — Onship" },
      { name: "description", content: "Solde et historique des crédits prestataire Onship." },
      { property: "og:title", content: "Mes crédits — Onship" },
      { property: "og:description", content: "Portefeuille de crédits prestataire." },
    ],
  }),
  component: CreditsPage,
});

const TYPE_FR: Record<string, string> = {
  purchase: "Achat",
  consumption: "Offre envoyée",
  refund: "Remboursement",
  bonus: "Bonus",
  adjustment: "Ajustement",
};

function CreditsPage() {
  const { mode } = useAppMode();
  const provider = useQuery({ queryKey: ["provider-profile"], queryFn: () => getMyProviderProfile() });
  const history = useQuery({ queryKey: ["wallet-history"], queryFn: () => getWalletHistory() });
  const wallet = provider.data?.wallet;

  if (mode !== "provider") {
    return (
      <div className="app-shell pt-6">
        <h1 className="text-2xl font-bold">Mes crédits</h1>
        <p className="mt-5 rounded-3xl bg-surface p-6 text-sm text-muted-foreground">
          Les crédits sont réservés aux prestataires. Passez en mode Prestataire depuis votre profil.
        </p>
      </div>
    );
  }


  return (
    <div className="app-shell pt-6">
      <h1 className="text-2xl font-bold">Mes crédits</h1>
      <div className="mt-5 rounded-3xl bg-ink p-5 text-ink-foreground shadow-float">
        <p className="text-sm opacity-70">Solde disponible</p>
        <p className="font-display text-4xl font-bold">{wallet?.balance ?? 0}</p>
        <p className="mt-1 text-xs opacity-70">
          Acheté : {wallet?.total_purchased ?? 0} · Utilisé : {wallet?.total_consumed ?? 0}
        </p>
      </div>
      <p className="mt-3 rounded-2xl bg-surface p-3 text-xs text-muted-foreground">
        L'achat de crédits en ligne arrive bientôt (moyen de paiement en cours de choix).
      </p>
      <h2 className="mt-6 text-lg font-bold">Historique</h2>
      <div className="mt-3 space-y-2">
        {history.isLoading && <Skeleton className="h-20 rounded-2xl" />}
        {history.data?.length === 0 && <p className="text-sm text-muted-foreground">Aucun mouvement.</p>}
        {history.data?.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-card">
            <div>
              <p className="text-sm font-semibold">{TYPE_FR[t.type] ?? t.type}</p>
              <p className="text-xs text-muted-foreground">
                {t.description ?? ""} · {new Date(t.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <p className={`font-display font-bold ${t.amount < 0 ? "text-destructive" : "text-secondary"}`}>
              {t.amount > 0 ? "+" : ""}
              {t.amount}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
