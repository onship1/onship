import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { listCategories } from "@/lib/catalog.functions";
import { createServiceRequest, getRecommendedPrice } from "@/lib/requests.functions";
import { formatPrice } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const searchSchema = z.object({ category: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/demandes/nouvelle")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Nouvelle demande — Onship" },
      {
        name: "description",
        content:
          "Décrivez votre besoin, choisissez la durée, l'urgence et votre prix : les prestataires proches répondent.",
      },
      { property: "og:title", content: "Nouvelle demande — Onship" },
      {
        property: "og:description",
        content: "Publiez une demande de service et recevez des offres de prestataires proches.",
      },
    ],
  }),
  component: NewRequestPage,
});

type Urgency = "urgent" | "normal" | "scheduled";

const URGENCIES: { value: Urgency; label: string; hint: string }[] = [
  { value: "urgent", label: "Urgent", hint: "Maintenant" },
  { value: "normal", label: "Bientôt", hint: "Dans la journée" },
  { value: "scheduled", label: "Planifié", hint: "Date choisie" },
];

function NewRequestPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });

  const [categoryId, setCategoryId] = useState(search.category ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(120);
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [scheduledAt, setScheduledAt] = useState("");
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState(10);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [price, setPrice] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);

  const quote = useQuery({
    queryKey: ["recommended-price", categoryId, duration, urgency],
    enabled: Boolean(categoryId),
    queryFn: () =>
      getRecommendedPrice({
        data: { category_id: categoryId, duration_minutes: duration, urgency },
      }),
  });

  useEffect(() => {
    if (quote.data && !priceTouched) setPrice(String(quote.data.price));
  }, [quote.data, priceTouched]);

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas disponible sur cet appareil");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        toast.success("Position enregistrée");
      },
      () => toast.error("Impossible de récupérer votre position"),
    );
  };

  const create = useMutation({
    mutationFn: () =>
      createServiceRequest({
        data: {
          category_id: categoryId,
          title: title.trim(),
          description: description.trim() || undefined,
          duration_minutes: duration,
          urgency,
          scheduled_at:
            urgency === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          address: address.trim() || undefined,
          latitude: coords?.lat,
          longitude: coords?.lng,
          proposed_price: Number(price),
          search_radius_km: radius,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      toast.success("Demande publiée — recherche de prestataires en cours");
      navigate({ to: "/demandes" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canSubmit = categoryId && title.trim().length >= 3 && Number(price) >= 500;

  return (
    <div className="app-shell pt-6">
      <h1 className="text-2xl font-bold">Nouvelle demande</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Quelques informations et votre demande part aux prestataires proches.
      </p>

      <form
        className="mt-6 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) create.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label>Catégorie</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.data?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            className="h-12 rounded-xl"
            placeholder="Ex. Ménage complet d'un 3 pièces"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            className="min-h-24 rounded-xl"
            placeholder="Détaillez votre besoin (pièces, matériel, contraintes...)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Durée estimée</Label>
            <span className="text-sm font-semibold text-primary">
              {Math.floor(duration / 60)} h {duration % 60 ? `${duration % 60} min` : ""}
            </span>
          </div>
          <Slider
            value={[duration]}
            min={30}
            max={480}
            step={30}
            onValueChange={(value) => setDuration(value[0] ?? 60)}
          />
        </div>

        <div className="space-y-2">
          <Label>Urgence</Label>
          <div className="grid grid-cols-3 gap-2">
            {URGENCIES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setUrgency(item.value)}
                className={`rounded-2xl border p-3 text-left transition-colors ${
                  urgency === item.value
                    ? "border-primary bg-surface"
                    : "border-border bg-card hover:bg-surface"
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-[11px] text-muted-foreground">{item.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {urgency === "scheduled" && (
          <div className="space-y-1.5">
            <Label htmlFor="scheduledAt">Date et heure</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              className="h-12 rounded-xl"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="address">Adresse</Label>
          <div className="flex gap-2">
            <Input
              id="address"
              className="h-12 rounded-xl"
              placeholder="Quartier, rue, repère"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="size-12 shrink-0 rounded-xl"
              onClick={locate}
              aria-label="Utiliser ma position"
            >
              <LocateFixed className="size-5" />
            </Button>
          </div>
          {coords && (
            <p className="text-xs text-success">Position GPS enregistrée pour le matching.</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Rayon de recherche</Label>
            <span className="text-sm font-semibold text-primary">{radius} km</span>
          </div>
          <Slider
            value={[radius]}
            min={1}
            max={50}
            step={1}
            onValueChange={(value) => setRadius(value[0] ?? 10)}
          />
        </div>

        <div className="rounded-3xl bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Prix recommandé</p>
            <p className="font-display text-lg font-bold text-primary">
              {quote.isLoading ? "…" : quote.data ? formatPrice(quote.data.price) : "—"}
            </p>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="price">Votre proposition (négociable)</Label>
            <Input
              id="price"
              type="number"
              min={500}
              step={500}
              className="h-12 rounded-xl bg-card"
              value={price}
              onChange={(event) => {
                setPriceTouched(true);
                setPrice(event.target.value);
              }}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-full text-base"
          disabled={!canSubmit || create.isPending}
        >
          {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Publier ma demande
        </Button>
      </form>
    </div>
  );
}
