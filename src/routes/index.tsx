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
    <div className="min-h-screen bg-ink text-ink-foreground">
      <header className="relative">
        <img
          src={heroImage}
          alt="Prestataires de services : agent d'entretien, plombier et coiffeuse"
          width={1024}
          height={1280}
          className="h-[58vh] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink" />
        <div className="app-shell absolute inset-x-0 top-0 flex items-center justify-between pt-6">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
              O
            </span>
            <span className="font-display text-xl font-bold">onship</span>
          </div>
          <Link to="/auth" className="rounded-full bg-ink/70 px-4 py-2 text-sm font-semibold backdrop-blur">
            Connexion
          </Link>
        </div>
      </header>

      <section className="app-shell -mt-24 relative pb-10">
        <h1 className="text-[2.6rem] font-bold leading-[1.05]">
          Votre service.
          <br />
          <span className="text-primary">Votre prix.</span>
        </h1>
        <p className="mt-3 text-base text-ink-foreground/70">
          Publiez votre besoin, les prestataires proches vous font leurs offres. Vous choisissez.
        </p>
        <Button asChild className="mt-6 h-14 w-full rounded-2xl text-base font-bold">
          <Link to="/auth">Commencer</Link>
        </Button>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-2xl bg-ink-foreground/[0.06] p-4">
              <div className="flex items-center justify-between">
                <step.icon className="size-5 text-primary" />
                <span className="font-display text-xs text-ink-foreground/40">0{i + 1}</span>
              </div>
              <p className="mt-3 text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs text-ink-foreground/60">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-primary p-5 text-primary-foreground">
          <p className="font-display text-lg font-bold">Vous êtes prestataire ?</p>
          <p className="mt-1 text-sm opacity-80">
            Recevez les demandes proches, payez en crédits — aucune commission sur vos prestations.
          </p>
          <Button asChild variant="secondary" className="mt-4 h-11 w-full rounded-xl bg-ink text-ink-foreground hover:bg-ink/90">
            <Link to="/auth">Devenir prestataire</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
