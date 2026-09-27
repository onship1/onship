import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { getMyMissions, updateMissionStatus } from "@/lib/marketplace.functions";
import { formatPrice } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/missions")({
  head: () => ({
    meta: [
      { title: "Mes missions — Onship" },
      { name: "description", content: "Suivez vos missions Onship en temps réel, étape par étape." },
      { property: "og:title", content: "Mes missions — Onship" },
      { property: "og:description", content: "Suivi des missions en cours et terminées." },
    ],
  }),
  component: MissionsPage,
});

const STEPS = ["confirmed", "provider_on_way", "started", "completed"] as const;
const STEP_LABELS = ["Confirmée", "En route", "Démarrée", "Terminée"];
const NEXT: Record<string, { status: "provider_on_way" | "started" | "completed"; label: string }> = {
  confirmed: { status: "provider_on_way", label: "Je suis en route" },
  provider_on_way: { status: "started", label: "Démarrer la mission" },
  started: { status: "completed", label: "Terminer la mission" },
};

type Status = "provider_on_way" | "started" | "completed" | "cancelled";

function MissionsPage() {
  const qc = useQueryClient();
  const missions = useQuery({ queryKey: ["missions"], queryFn: () => getMyMissions(), refetchInterval: 15_000 });
  const update = useMutation({
    mutationFn: (v: { id: string; status: Status }) => updateMissionStatus({ data: v }),
    onSuccess: () => {
      toast.success("Mission mise à jour");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="app-shell pt-6">
      <h1 className="text-2xl font-bold">Mes missions</h1>
      <div className="mt-5 space-y-4">
        {missions.isLoading && <Skeleton className="h-40 rounded-3xl" />}
        {missions.data?.length === 0 && (
          <div className="rounded-3xl bg-surface p-6 text-center text-sm text-muted-foreground">
            Aucune mission pour le moment.
          </div>
        )}
        {missions.data?.map((m) => {
          const stepIndex = STEPS.indexOf(m.status as (typeof STEPS)[number]);
          const next = m.is_provider ? NEXT[m.status] : undefined;
          const canCancel = m.status === "confirmed" || m.status === "provider_on_way";
          return (
            <div key={m.mission_id} className="rounded-3xl bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {m.category_name} · {m.is_provider ? "Client" : "Prestataire"} : {m.other_name || "—"}
                  </p>
                  <p className="font-semibold">{m.title}</p>
                </div>
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-2 font-display text-lg font-bold">{formatPrice(m.agreed_price)}</p>

              {stepIndex >= 0 && (
                <div className="mt-3 grid grid-cols-4 gap-1">
                  {STEP_LABELS.map((label, i) => (
                    <div key={label}>
                      <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-muted"}`} />
                      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {m.other_phone && (
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <a href={`tel:${m.other_phone}`}><Phone className="mr-1 size-4" /> Appeler</a>
                  </Button>
                )}
                {m.is_provider && m.request_latitude != null && m.request_longitude != null && canCancel && (
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${m.request_latitude},${m.request_longitude}`}
                    >
                      <MapPin className="mr-1 size-4" /> Itinéraire
                    </a>
                  </Button>
                )}
              </div>

              {next && (
                <Button
                  className="mt-3 h-11 w-full rounded-full"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ id: m.mission_id, status: next.status })}
                >
                  {next.label}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="ghost"
                  className="mt-1 w-full rounded-full text-destructive"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ id: m.mission_id, status: "cancelled" })}
                >
                  Annuler la mission
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
