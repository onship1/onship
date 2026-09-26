import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { listMyRequests } from "@/lib/requests.functions";
import { formatPrice } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/demandes/")({
  head: () => ({
    meta: [
      { title: "Mes demandes — Onship" },
      {
        name: "description",
        content: "Suivez l'état de vos demandes de service Onship et les offres reçues.",
      },
      { property: "og:title", content: "Mes demandes — Onship" },
      { property: "og:description", content: "Historique et suivi de vos demandes de service." },
    ],
  }),
  component: RequestsPage,
});

const URGENCY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  normal: "Dès que possible",
  scheduled: "Planifié",
};

function RequestsPage() {
  const requests = useQuery({ queryKey: ["my-requests"], queryFn: () => listMyRequests() });

  return (
    <div className="app-shell pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes demandes</h1>
        <Button asChild size="sm" className="rounded-full">
          <Link to="/demandes/nouvelle">
            <Plus className="mr-1 size-4" /> Nouvelle
          </Link>
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {requests.isLoading && (
          <>
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </>
        )}

        {requests.data?.length === 0 && (
          <div className="rounded-3xl bg-surface p-6 text-center">
            <p className="font-semibold">Aucune demande</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Publiez votre première demande pour recevoir des offres.
            </p>
          </div>
        )}

        {requests.data?.map((request) => (
          <div key={request.id} className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{request.title}</p>
                <p className="text-xs text-muted-foreground">
                  {request.service_categories?.name} · {URGENCY_LABELS[request.urgency] ?? request.urgency}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">{formatPrice(request.proposed_price)}</span>
              <span className="text-muted-foreground">
                {Math.round((request.duration_minutes ?? 0) / 60)} h ·{" "}
                {new Date(request.created_at).toLocaleDateString("fr-FR")}
              </span>
            </div>
            {request.address && (
              <p className="mt-2 truncate text-xs text-muted-foreground">{request.address}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
