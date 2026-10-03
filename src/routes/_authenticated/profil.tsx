import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Loader2, Wallet, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/useAuth";
import { ModeSwitch } from "@/components/ModeSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — Onship" },
      {
        name: "description",
        content: "Gérez vos informations personnelles Onship et basculez entre mode client et prestataire.",
      },
      { property: "og:title", content: "Mon profil — Onship" },
      { property: "og:description", content: "Vos informations et préférences Onship." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getMyProfile() });

  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });

  useEffect(() => {
    if (profile.data) {
      setForm({
        first_name: profile.data.first_name ?? "",
        last_name: profile.data.last_name ?? "",
        phone: profile.data.phone ?? "",
      });
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => updateMyProfile({ data: form }),
    onSuccess: () => {
      toast.success("Profil mis à jour");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="app-shell pt-6">
      <h1 className="text-2xl font-bold">Mon profil</h1>

      <div className="mt-4 rounded-3xl bg-surface p-4">
        <p className="text-sm font-semibold">Mode d'utilisation</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Un seul compte, deux usages : demander un service ou en proposer.
        </p>
        <ModeSwitch />
      </div>

      {profile.isLoading ? (
        <Skeleton className="mt-6 h-64 rounded-3xl" />
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                className="h-12 rounded-xl"
                value={form.first_name}
                onChange={(event) => setForm({ ...form, first_name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                className="h-12 rounded-xl"
                value={form.last_name}
                onChange={(event) => setForm({ ...form, last_name: event.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              className="h-12 rounded-xl"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input className="h-12 rounded-xl" value={user?.email ?? ""} disabled />
          </div>

          <Button type="submit" className="h-12 w-full rounded-full" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Enregistrer
          </Button>
        </form>
      )}

      <div className="mt-8 space-y-2">
        <Button asChild variant="outline" className="h-12 w-full rounded-full">
          <Link to="/credits">
            <Wallet className="mr-2 size-4" /> Mes crédits
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12 w-full rounded-full">
          <Link to="/admin">
            <ShieldCheck className="mr-2 size-4" /> Administration
          </Link>
        </Button>
      </div>

      <Button
        variant="outline"
        className="mt-4 h-12 w-full rounded-full"
        onClick={async () => {
          await signOut();
          navigate({ to: "/" });
        }}
      >
        <LogOut className="mr-2 size-4" /> Se déconnecter
      </Button>
    </div>
  );
}
