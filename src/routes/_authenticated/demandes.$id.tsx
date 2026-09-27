import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Loader2, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { acceptOffer, cancelRequest, getRequestDetail } from "@/lib/marketplace.functions";
import { formatPrice } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/demandes/$id")({
  head: () => ({
    meta: [
      { title: "Détail de la demande — Onship" },
      { name: "description", content: "Comparez les offres des prestataires et choisissez la meilleure." },
      { property: "og:title", content: "Détail de la demande — Onship" },
      { property: "og:description", content: "Offres reçues et choix du prestataire." },
    ],
  }),
  component: RequestDetail,
});

function RequestDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const detail = useQuery({
    queryKey: ["request", id],
    queryFn: () => getRequestDetail({ data: { id } }),
    refetchInterval: 10_000,
  });

  const accept = useMutation({
    mutationFn: (offerId: string) => acceptOffer({ data: { id: offerId } }),
    onSuccess: () => {
      toast.success("Prestataire choisi ! La mission est créée.");
      qc.invalidateQueries();
      navigate({ to: "/missions" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: () => cancelRequest({ data: { id } }),
    onSuccess: () => {
      toast.success("Demande annulée");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isLoading) return <div className="app-shell pt-6"><Skeleton className="h-60 rounded-3xl" /></div>;
  if (detail.error || !detail.data)
    return <div className="app-shell pt-6 text-sm text-muted-foreground">Demande introuvable.</div>;

  const { request, offers } = detail.data;
  const open = request.status === "searching" || request.status === "offers_received";

  return (
    <div className="app-shell pt-6">
      <Link to="/demandes" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Mes demandes
      </Link>

      <div className="mt-4 rounded-3xl bg-ink p-5 text-ink-foreground shadow-float">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs opacity-70">{request.service_categories?.name}</p>
            <h1 className="font-display text-xl font-bold">{request.title}</h1>
          </div>
          <StatusBadge status={request.status} />
        </div>
        <p className="mt-3 font-display text-2xl font-bold text-primary">{formatPrice(request.proposed_price)}</p>
        <p className="text-xs opacity-70">Prix recommandé : {formatPrice(request.recommended_price ?? 0)}</p>
        {request.address && <p className="mt-2 text-sm opacity-80">{request.address}</p>}
      </div>

      <h2 className="mt-6 font-display text-lg font-bold">Offres reçues ({offers.length})</h2>
      {open && offers.length === 0 && (
        <div className="mt-3 rounded-3xl bg-surface p-5 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 size-5 animate-spin text-primary" />
          Nous prévenons les prestataires proches de vous…
        </div>
      )}

      <div className="mt-3 space-y-3">
        {offers.map((o) => (
          <div key={o.offer_id} className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1 font-semibold">
                  {o.provider_name || "Prestataire"}
                  {o.verification_status === "verified" && <ShieldCheck className="size-4 text-accent" />}
                </p>
                <p className="text-xs text-muted-foreground">{o.professional_title}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3 fill-primary text-primary" /> {Number(o.average_rating).toFixed(1)} ·{" "}
                  {o.completed_missions} missions
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold">{formatPrice(o.price)}</p>
                {o.estimated_arrival_minutes != null && (
                  <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> {o.estimated_arrival_minutes} min
                  </p>
                )}
              </div>
            </div>
            {o.message && <p className="mt-2 text-sm text-muted-foreground">« {o.message} »</p>}
            {open && o.status === "pending" ? (
              <Button
                className="mt-3 h-11 w-full rounded-full"
                disabled={accept.isPending}
                onClick={() => accept.mutate(o.offer_id)}
              >
                Choisir cette offre
              </Button>
            ) : (
              <div className="mt-2"><StatusBadge status={o.status === "accepted" ? "provider_selected" : o.status} /></div>
            )}
          </div>
        ))}
      </div>

      {open && (
        <Button
          variant="outline"
          className="mt-6 h-11 w-full rounded-full"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
        >
          Annuler la demande
        </Button>
      )}
    </div>
  );
}
