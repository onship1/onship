/** Écran de démarrage Onship : un soleil qui se lève sur l'océan, disparaît seul après ~2 s. */
export function SplashScreen() {
  return (
    <div
      aria-hidden
      className="animate-splash-out pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-brand text-ink-foreground"
    >
      <div className="relative flex size-28 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/25 blur-2xl" />
        <div className="animate-splash-pop relative size-24 overflow-hidden rounded-full bg-gradient-accent shadow-float">
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-accent" />
          <div className="absolute inset-x-0 bottom-1/3 h-1 bg-ink/30" />
        </div>
      </div>
      <p className="animate-splash-pop mt-7 font-display text-4xl font-bold tracking-tight [animation-delay:.15s]">
        on<span className="text-primary">ship</span>
      </p>
      <p className="mt-2 text-sm text-ink-foreground/70">Vos services, à votre prix</p>
      <div className="absolute bottom-16 h-1 w-32 overflow-hidden rounded-full bg-ink-foreground/15">
        <div className="animate-splash-bar h-full w-full rounded-full bg-gradient-accent" />
      </div>
    </div>
  );
}
