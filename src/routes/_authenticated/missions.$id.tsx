import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Navigation, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getMissionDetail, rateMission } from "@/lib/marketplace.functions";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/missions/$id")({
  head: () => ({
    meta: [
      { title: "Suivi de mission — Onship" },
      { name: "description", content: "Suivez votre prestataire en direct, discutez et notez la mission." },
      { property: "og:title", content: "Suivi de mission — Onship" },
      { property: "og:description", content: "Suivi en direct, chat et notation." },
    ],
  }),
  component: MissionDetailPage,
});

function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function MissionDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const mission = useQuery({
    queryKey: ["mission", id],
    queryFn: () => getMissionDetail({ data: { id } }),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`mission-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_locations" }, () =>
        qc.invalidateQueries({ queryKey: ["mission", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  const m = mission.data;
  const dest: [number, number] | null =
    m?.request_latitude != null && m?.request_longitude != null ? [m.request_latitude, m.request_longitude] : null;
  const prov: [number, number] | null =
    m?.provider_latitude != null && m?.provider_longitude != null ? [m.provider_latitude, m.provider_longitude] : null;
  const focus = prov ?? dest;
  const km = prov && dest ? distanceKm(prov, dest) : null;

  return (
    <div className="app-shell pt-6">
      <Link to="/missions" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Missions
      </Link>
      {mission.isLoading && <Skeleton className="mt-4 h-64 rounded-3xl" />}
      {mission.error && <p className="mt-4 text-sm text-destructive">{(mission.error as Error).message}</p>}
      {m && (
        <>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{m.title}</h1>
              <p className="text-sm text-muted-foreground">
                {m.is_provider ? "Client" : "Prestataire"} : {m.other_name || "—"}
              </p>
            </div>
            <StatusBadge status={m.status} />
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl bg-card shadow-card">
            {focus ? (
              <iframe
                title="Carte de suivi"
                className="h-64 w-full border-0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${focus[1] - 0.02},${focus[0] - 0.015},${focus[1] + 0.02},${focus[0] + 0.015}&layer=mapnik&marker=${focus[0]},${focus[1]}`}
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Position non disponible
              </div>
            )}
            <div className="flex items-center justify-between gap-2 p-3 text-sm">
              <span>
                {prov
                  ? km != null
                    ? `Prestataire à ${km.toFixed(1)} km`
                    : "Position du prestataire en direct"
                  : "En attente de la position du prestataire"}
              </span>
              {dest && (
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${dest[0]},${dest[1]}`}>
                    <Navigation className="mr-1 size-4" /> Itinéraire
                  </a>
                </Button>
              )}
            </div>
          </div>

          {m.status === "completed" && !m.already_rated && <RatingForm missionId={m.mission_id} />}
          {m.conversation_id && <Chat conversationId={m.conversation_id} />}
        </>
      )}
    </div>
  );
}

function RatingForm({ missionId }: { missionId: string }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const rate = useMutation({
    mutationFn: () => rateMission({ data: { id: missionId, rating, comment } }),
    onSuccess: () => {
      toast.success("Merci pour votre note !");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-4 rounded-3xl bg-card p-4 shadow-card">
      <p className="font-semibold">Notez cette mission</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} étoiles`} onClick={() => setRating(n)}>
            <Star className={`size-8 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Input className="mt-3 h-11 rounded-xl" placeholder="Un commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button className="mt-3 h-11 w-full rounded-full" disabled={rate.isPending} onClick={() => rate.mutate()}>
        Envoyer ma note
      </Button>
    </div>
  );
}

type Msg = { id: string; sender_id: string; message: string | null; created_at: string };

function Chat({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("messages")
      .select("id, sender_id, message, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .limit(200)
      .then(({ data }) => active && setMessages(data ?? []));
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Msg;
          setMessages((cur) => (cur.some((x) => x.id === msg.id) ? cur : [...cur, msg]));
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user) return;
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, message: body.slice(0, 1000) })
      .select("id, sender_id, message, created_at")
      .single();
    if (error) return toast.error("Message non envoyé");
    setMessages((cur) => (cur.some((x) => x.id === data.id) ? cur : [...cur, data]));
  };

  return (
    <div className="mt-4 rounded-3xl bg-card p-4 shadow-card">
      <p className="font-semibold">Discussion</p>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">Aucun message. Dites bonjour !</p>}
        {messages.map((msg) => {
          const mine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-surface"}`}>
                {msg.message}
                <p className="mt-0.5 text-[10px] opacity-70">
                  {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input className="h-11 rounded-full" placeholder="Votre message…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" size="icon" className="size-11 shrink-0 rounded-full" aria-label="Envoyer">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
