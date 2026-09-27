import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getProviderFeed, submitOffer } from "@/lib/marketplace.functions";
import { formatPrice } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/opportunites")({
  head: () => ({
    meta: [
      { title: "Demandes près de moi — Onship" },
      { name: "description", content: "Les demandes de clients proches de vous : envoyez votre offre en un geste." },
      { property: "og:title", content: "Demandes près de moi — Onship" },
      { property: "og:description", content: "Opportunités de missions pour les prestataires Onship." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const feed = useQuery({ queryKey: ["provider-feed"], queryFn: () => getProviderFeed(), refetchInterval: 15_000 });
  return (
    <div className="app-shell pt-6">
      <h1 className="text-2xl font-bold">Demandes près de moi</h1>
      <p className="mt-1 text-sm text-muted-foreground">Chaque offre envoyée coûte 1 crédit.</p>
      <div className="mt-5 space-y-3">
        {feed.isLoading && <Skeleton className="h-40 rounded-3xl" />}
        {feed.data?.length === 0 && (
          <div className="rounded-3xl bg-surface p-6 text-center text-sm text-muted-foreground">
            Aucune demande pour l'instant. Restez « disponible » pour être prévenu.
          </div>
        )}
        {feed.data?.map((r) => <FeedCard key={r.request_id} item={r} />)}
      </div>
    </div>
  );
}

type Item = Awaited<ReturnType<typeof getProviderFeed>>[number];

function FeedCard({ item }: { item: Item }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState(String(item.proposed_price));
  const [eta, setEta] = useState("30");
  const [message, setMessage] = useState("");
  const send = useMutation({
    mutationFn: () =>
      submitOffer({
        data: { request_id: item.request_id, price: Number(price), eta: Number(eta) || 0, message },
      }),
    onSuccess: () => {
      toast.success("Offre envoyée");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-3xl bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{item.category_name}</p>
          <p className="font-semibold">{item.title}</p>
        </div>
        {item.urgency === "urgent" && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">Urgent</span>}
      </div>
      {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
      <p className="mt-2 text-sm">
        Budget client : <span className="font-bold">{formatPrice(item.proposed_price)}</span> ·{" "}
        {Math.round((item.duration_minutes ?? 0) / 60)} h
      </p>
      {item.address && <p className="truncate text-xs text-muted-foreground">{item.address}</p>}

      {item.my_offer_status ? (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface p-3 text-sm">
          <span>Votre offre : {formatPrice(item.my_offer_price ?? 0)}</span>
          <StatusBadge status={item.my_offer_status === "pending" ? "searching" : item.my_offer_status} />
        </div>
      ) : (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={500} className="h-11 rounded-xl" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Votre prix" />
            <Input type="number" min={0} className="h-11 rounded-xl" value={eta} onChange={(e) => setEta(e.target.value)} aria-label="Arrivée (min)" />
          </div>
          <Input className="h-11 rounded-xl" placeholder="Message au client (optionnel)" value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1 rounded-full" disabled={send.isPending}
              onClick={() => { setPrice(String(item.proposed_price)); setTimeout(() => send.mutate(), 0); }}>
              Accepter le prix
            </Button>
            <Button type="submit" className="h-11 flex-1 rounded-full" disabled={send.isPending}>Proposer</Button>
          </div>
        </form>
      )}
    </div>
  );
}
