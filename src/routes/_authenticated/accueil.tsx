import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { listCategories } from "@/lib/catalog.functions";
import { getMyProfile, getMyProviderProfile, updateAvailability } from "@/lib/profile.functions";
import { listMyRequests } from "@/lib/requests.functions";
import { useAppMode } from "@/hooks/useAppMode";
import { ModeSwitch } from "@/components/ModeSwitch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/accueil")({
  head: () => ({
    meta: [
      { title: "Accueil — Onship" },
      {
        name: "description",
        content: "Votre tableau de bord Onship : catégories de services, demandes et missions en cours.",
      },
      { property: "og:title", content: "Accueil — Onship" },
      { property: "og:description", content: "Vos demandes et missions Onship en un coup d'œil." },
    ],
  }),
  component: HomePage,
});

function CategoryIcon({ name }: { name: string | null }) {
  const Icon = (name && (Icons as unknown as Record<string, Icons.LucideIcon>)[name]) || Icons.Sparkles;
  return <Icon className="size-6" />;
}

function HomePage() {
  const { mode } = useAppMode();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getMyProfile() });

  return (
    <div className="app-shell pt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Bonjour</p>
          <h1 className="text-2xl font-bold">{profile.data?.first_name ?? "Bienvenue"}</h1>
        </div>
        <ModeSwitch />
      </div>

      {mode === "client" ? <ClientHome /> : <ProviderHome />}
    </div>
  );
}

function ClientHome() {
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const requests = useQuery({ queryKey: ["my-requests"], queryFn: () => listMyRequests() });

  return (
    <div className="mt-6 space-y-8">
      <div className="rounded-3xl bg-gradient-brand p-5 text-primary-foreground shadow-float">
        <p className="font-display text-lg font-semibold">Besoin d'un service maintenant ?</p>
        <p className="mt-1 text-sm opacity-90">
          Décrivez votre demande, proposez votre prix et recevez des offres autour de vous.
        </p>
        <Button asChild variant="secondary" className="mt-4 h-11 w-full rounded-full font-semibold">
          <Link to="/demandes/nouvelle">Publier une demande</Link>
        </Button>
      </div>

      <section>
        <h2 className="text-lg font-bold">Catégories</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {categories.isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-2xl" />
              ))
            : categories.data?.map((category) => (
                <Link
                  key={category.id}
                  to="/demandes/nouvelle"
                  search={{ category: category.id }}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 text-center shadow-card transition-transform active:scale-95"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-surface text-primary">
                    <CategoryIcon name={category.icon} />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight">{category.name}</span>
                </Link>
              ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Mes demandes</h2>
          <Link to="/demandes" className="text-sm font-medium text-primary">
            Tout voir
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {requests.isLoading && <Skeleton className="h-20 rounded-2xl" />}
          {requests.data?.length === 0 && (
            <p className="rounded-2xl bg-surface p-4 text-sm text-muted-foreground">
              Aucune demande pour le moment.
            </p>
          )}
          {requests.data?.slice(0, 3).map((request) => (
            <div key={request.id} className="rounded-2xl bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{request.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.service_categories?.name} · {formatPrice(request.proposed_price)}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProviderHome() {
  const queryClient = useQueryClient();
  const provider = useQuery({ queryKey: ["provider-profile"], queryFn: () => getMyProviderProfile() });

  const availability = useMutation({
    mutationFn: (status: "offline" | "available" | "busy") =>
      updateAvailability({ data: { availability_status: status } }),
    onSuccess: () => {
      toast.success("Disponibilité mise à jour");
      queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (provider.isLoading) {
    return <Skeleton className="mt-6 h-40 rounded-3xl" />;
  }

  if (!provider.data) {
    return (
      <div className="mt-6 rounded-3xl bg-card p-5 shadow-card">
        <p className="font-display text-lg font-semibold">Activez votre profil prestataire</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Indiquez votre métier et vos catégories pour recevoir les demandes proches de vous.
        </p>
        <Button asChild className="mt-4 h-11 w-full rounded-full">
          <Link to="/prestataire">Configurer mon profil</Link>
        </Button>
      </div>
    );
  }

  const { provider: pro, wallet, categories } = provider.data;
  const isOnline = pro.availability_status === "available";

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-3xl bg-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{pro.professional_title ?? "Prestataire"}</p>
            <p className="text-xs text-muted-foreground">
              Vérification :{" "}
              <span className="font-medium text-foreground">{verificationLabel(pro.verification_status)}</span>
            </p>
          </div>
          <Badge variant={isOnline ? "default" : "secondary"}>{isOnline ? "En ligne" : "Hors ligne"}</Badge>
        </div>

        <Button
          className="mt-4 h-11 w-full rounded-full"
          variant={isOnline ? "secondary" : "default"}
          disabled={availability.isPending}
          onClick={() => availability.mutate(isOnline ? "offline" : "available")}
        >
          {isOnline ? "Me mettre hors ligne" : "Passer en ligne"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Crédits" value={String(wallet?.balance ?? 0)} />
        <Stat label="Note" value={Number(pro.average_rating ?? 0).toFixed(1)} />
        <Stat label="Missions" value={String(pro.completed_missions ?? 0)} />
      </div>

      <div className="rounded-3xl bg-surface p-5">
        <p className="text-sm font-semibold">Mes catégories</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune catégorie sélectionnée.</p>
          )}
          {categories.map((category) => (
            <Badge key={category.id} variant="secondary">
              {category.name}
            </Badge>
          ))}
        </div>
        <Button asChild variant="outline" className="mt-4 h-10 w-full rounded-full">
          <Link to="/prestataire">Gérer mon activité</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 text-center shadow-card">
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function verificationLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "En attente",
    under_review: "En cours d'examen",
    verified: "Vérifié",
    rejected: "Refusé",
    suspended: "Suspendu",
  };
  return labels[status] ?? status;
}
