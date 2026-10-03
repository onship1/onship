import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LocateFixed, Wallet } from "lucide-react";
import { toast } from "sonner";
import { listCategories } from "@/lib/catalog.functions";
import { getMyProviderProfile, setupProviderMode, updateAvailability } from "@/lib/profile.functions";
import { useAppMode } from "@/hooks/useAppMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { verificationLabel } from "./accueil";

export const Route = createFileRoute("/_authenticated/prestataire")({
  head: () => ({
    meta: [
      { title: "Mon activité prestataire — Onship" },
      {
        name: "description",
        content:
          "Configurez votre profil professionnel Onship : métier, catégories, zone d'intervention et crédits.",
      },
      { property: "og:title", content: "Mon activité prestataire — Onship" },
      {
        property: "og:description",
        content: "Métier, catégories, disponibilité et portefeuille de crédits.",
      },
    ],
  }),
  component: ProviderPage,
});

function ProviderPage() {
  const queryClient = useQueryClient();
  const { setMode } = useAppMode();
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const provider = useQuery({ queryKey: ["provider-profile"], queryFn: () => getMyProviderProfile() });

  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (provider.data) {
      setTitle(provider.data.provider.professional_title ?? "");
      setBio(provider.data.provider.bio ?? "");
      setSelected(provider.data.categories.map((category) => category.id));
    }
  }, [provider.data]);

  const save = useMutation({
    mutationFn: () =>
      setupProviderMode({
        data: {
          professional_title: title.trim(),
          bio: bio.trim() || undefined,
          category_ids: selected,
        },
      }),
    onSuccess: () => {
      toast.success("Profil prestataire enregistré");
      setMode("provider");
      queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const locate = useMutation({
    mutationFn: async () =>
      new Promise<void>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Géolocalisation indisponible"));
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await updateAvailability({
                data: {
                  availability_status:
                    provider.data?.provider.availability_status === "available" ? "available" : "offline",
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                },
              });
              resolve();
            } catch (error) {
              reject(error as Error);
            }
          },
          () => reject(new Error("Position refusée")),
        );
      }),
    onSuccess: () => {
      toast.success("Zone d'intervention mise à jour");
      queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleCategory = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const wallet = provider.data?.wallet;

  return (
    <div className="app-shell pt-6">
      <h1 className="text-2xl font-bold">Mon activité</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Votre profil professionnel détermine les demandes que vous recevez.
      </p>

      {provider.isLoading ? (
        <Skeleton className="mt-6 h-40 rounded-3xl" />
      ) : (
        <>
          {provider.data && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                to="/credits"
                className="block rounded-2xl bg-card p-4 shadow-card transition-transform active:scale-95"
              >
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="size-4" /> Crédits
                </p>
                <p className="font-display text-2xl font-bold">{wallet?.balance ?? 0}</p>
                <p className="mt-1 text-[11px] font-medium text-primary">Voir l'historique →</p>
              </Link>
              <div className="rounded-2xl bg-card p-4 shadow-card">
                <p className="text-xs text-muted-foreground">Vérification</p>
                <Badge className="mt-2" variant="secondary">
                  {verificationLabel(provider.data.provider.verification_status)}
                </Badge>
              </div>
            </div>
          )}

          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (title.trim().length < 2) {
                toast.error("Indiquez votre métier");
                return;
              }
              if (selected.length === 0) {
                toast.error("Choisissez au moins une catégorie");
                return;
              }
              save.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="title">Métier / titre professionnel</Label>
              <Input
                id="title"
                className="h-12 rounded-xl"
                placeholder="Ex. Plombier indépendant"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Présentation</Label>
              <Textarea
                id="bio"
                className="min-h-24 rounded-xl"
                placeholder="Expérience, spécialités, zone d'intervention..."
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Catégories de services</Label>
              <div className="flex flex-wrap gap-2">
                {categories.data?.map((category) => {
                  const active = selected.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-surface"
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="submit" className="h-12 w-full rounded-full" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {provider.data ? "Enregistrer" : "Activer le mode prestataire"}
            </Button>
          </form>

          {provider.data && (
            <Button
              variant="outline"
              className="mt-4 h-12 w-full rounded-full"
              onClick={() => locate.mutate()}
              disabled={locate.isPending}
            >
              {locate.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <LocateFixed className="mr-2 size-4" />
              )}
              Mettre à jour ma position
            </Button>
          )}

          <div className="mt-6 rounded-3xl bg-surface p-5">
            <p className="text-sm font-semibold">Documents de vérification</p>
            <p className="mt-1 text-sm text-muted-foreground">
              L'envoi des pièces (identité, attestations) arrive au prochain module, avec le stockage
              sécurisé.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
