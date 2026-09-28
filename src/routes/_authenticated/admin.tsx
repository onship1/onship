import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAdminOverview, setProviderVerification } from "@/lib/marketplace.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Onship" },
      { name: "description", content: "Tableau de bord d'administration Onship : statistiques et validation des prestataires." },
      { property: "og:title", content: "Administration — Onship" },
      { property: "og:description", content: "Pilotage de la plateforme Onship." },
    ],
  }),
  component: AdminPage,
});

const LABELS: Record<string, string> = {
  users: "Utilisateurs",
  providers: "Prestataires",
  pending_providers: "À vérifier",
  requests: "Demandes",
  missions: "Missions",
  completed: "Terminées",
  open_disputes: "Litiges ouverts",
};

const STATUS_FR: Record<string, string> = {
  pending: "En attente",
  under_review: "En examen",
  verified: "Vérifié",
  rejected: "Refusé",
  suspended: "Suspendu",
};

function AdminPage() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ["admin"], queryFn: () => getAdminOverview(), retry: false });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: "verified" | "rejected" | "suspended" }) => setProviderVerification({ data: v }),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="app-shell pt-6">
      <h1 className="text-2xl font-bold">Administration</h1>
      {overview.isLoading && <Skeleton className="mt-5 h-40 rounded-3xl" />}
      {overview.error && (
        <p className="mt-5 rounded-3xl bg-surface p-6 text-sm text-muted-foreground">Accès réservé aux administrateurs.</p>
      )}
      {overview.data && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {Object.entries(overview.data.stats).map(([k, v]) => (
              <div key={k} className="rounded-3xl bg-card p-4 shadow-card">
                <p className="text-xs text-muted-foreground">{LABELS[k] ?? k}</p>
                <p className="font-display text-2xl font-bold">{v}</p>
              </div>
            ))}
          </div>
          <h2 className="mt-6 text-lg font-bold">Prestataires</h2>
          <div className="mt-3 space-y-3">
            {overview.data.providers.map((p) => (
              <div key={p.provider_id} className="rounded-3xl bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.name || "Sans nom"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.professional_title ?? "—"} · {p.phone ?? "pas de téléphone"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ★ {Number(p.average_rating).toFixed(1)} · {p.completed_missions} missions
                    </p>
                  </div>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold">
                    {STATUS_FR[p.verification_status] ?? p.verification_status}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="flex-1 rounded-full" disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: p.provider_id, status: "verified" })}>Valider</Button>
                  <Button size="sm" variant="outline" className="flex-1 rounded-full" disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: p.provider_id, status: "rejected" })}>Refuser</Button>
                  <Button size="sm" variant="ghost" className="rounded-full text-destructive" disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: p.provider_id, status: "suspended" })}>Suspendre</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
