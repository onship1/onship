import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, HandCoins, Star, Zap } from "lucide-react";
import heroImage from "@/assets/hero-services.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Onship — trouvez un prestataire près de vous en quelques minutes" },
      {
        name: "description",
        content:
          "Ménage, plomberie, garde d'enfants, coiffure : publiez votre besoin, recevez des offres de prestataires proches et choisissez votre prix.",
      },
      { property: "og:title", content: "Onship — services à la demande près de vous" },
      {
        property: "og:description",
        content:
          "Publiez votre demande, comparez les offres des prestataires proches et négociez librement le prix.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: MapPin, title: "Décrivez votre besoin", text: "Catégorie, durée, adresse, urgence." },
  { icon: HandCoins, title: "Proposez votre prix", text: "Un prix recommandé vous guide, vous restez libre." },
  { icon: Zap, title: "Recevez des offres", text: "Les prestataires proches et disponibles répondent." },
  { icon: Star, title: "Choisissez et notez", text: "Contact direct, suivi de mission, notation." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-brand pb-16 pt-8 text-primary-foreground">
        <div className="app-shell">
          <p className="font-display text-xl font-bold">Onship</p>
          <h1 className="mt-6 text-4xl font-bold leading-tight">
            Un service, un prix négocié, près de vous.
          </h1>
          <p className="mt-3 text-sm leading-relaxed opacity-90">
            Publiez votre demande en 3 taps. Les prestataires disponibles autour de vous font leurs
            offres, vous choisissez.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild variant="secondary" className="h-12 flex-1 rounded-full text-base font-semibold">
              <Link to="/auth">Commencer</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="app-shell -mt-10">
        <img
          src={heroImage}
          alt="Prestataires de services : agent d'entretien, plombier et coiffeuse"
          width={1024}
          height={1280}
          className="w-full rounded-3xl object-cover shadow-float"
        />
      </div>

      <section className="app-shell py-10">
        <h2 className="text-xl font-bold">Comment ça marche</h2>
        <div className="mt-4 space-y-3">
          {steps.map((step) => (
            <div key={step.title} className="flex gap-4 rounded-2xl bg-card p-4 shadow-card">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
                <step.icon className="size-5" />
              </div>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl bg-surface p-5">
          <p className="font-display text-lg font-semibold">Vous êtes prestataire ?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Activez le mode prestataire depuis le même compte, recevez les demandes proches et
            payez uniquement en crédits — aucune commission sur vos prestations.
          </p>
          <Button asChild className="mt-4 h-11 w-full rounded-full">
            <Link to="/auth">Créer mon compte</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
