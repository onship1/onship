import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Onship" },
      {
        name: "description",
        content:
          "Connectez-vous ou créez votre compte Onship pour publier une demande de service ou recevoir des missions.",
      },
      { property: "og:title", content: "Connexion — Onship" },
      {
        property: "og:description",
        content: "Accédez à votre compte Onship, en mode client ou prestataire.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  useEffect(() => {
    if (!loading && user) navigate({ to: "/accueil" });
  }, [user, loading, navigate]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
        toast.success("Bienvenue !");
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/accueil`,
            data: {
              first_name: form.firstName.trim(),
              last_name: form.lastName.trim(),
              phone: form.phone.trim(),
              role: "client",
            },
          },
        });
        if (error) throw error;
        toast.success("Compte créé, vous êtes connecté");
      }
      navigate({ to: "/accueil" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error(
        message.includes("Invalid login credentials")
          ? "E-mail ou mot de passe incorrect"
          : message.includes("already registered")
            ? "Cet e-mail a déjà un compte"
            : message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-brand px-6 pb-12 pt-8 text-ink-foreground">
        <div className="app-shell px-0">
          <Link to="/" className="inline-flex items-center gap-2 text-sm opacity-90">
            <ArrowLeft className="size-4" /> Retour
          </Link>
          <h1 className="mt-6 text-3xl font-bold">Onship</h1>
          <p className="mt-2 text-sm opacity-90">
            Un seul compte pour demander un service ou en proposer.
          </p>
        </div>
      </div>

      <div className="app-shell -mt-6">
        <div className="rounded-3xl bg-card p-5 shadow-card">
          <div className="mb-5 inline-flex w-full rounded-full bg-surface p-1">
            {(["signin", "signup"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  tab === value ? "bg-card text-foreground shadow-card" : "text-muted-foreground"
                }`}
              >
                {value === "signin" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {tab === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input id="firstName" value={form.firstName} onChange={update("firstName")} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input id="lastName" value={form.lastName} onChange={update("lastName")} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+225 ..."
                    value={form.phone}
                    onChange={update("phone")}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={update("email")} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                minLength={6}
                value={form.password}
                onChange={update("password")}
                required
              />
            </div>

            <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {tab === "signin" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
