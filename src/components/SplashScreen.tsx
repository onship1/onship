/** Écran de démarrage : logo animé sur fond encre, disparaît seul après ~2 s. */
export function SplashScreen() {
  return (
    <div
      aria-hidden
      className="animate-splash-out pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink text-ink-foreground"
    >
      <div className="animate-splash-pop flex size-24 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-float">
        <span className="font-display text-5xl font-bold">O</span>
      </div>
      <p className="animate-splash-pop mt-6 font-display text-3xl font-bold tracking-tight [animation-delay:.15s]">
        onship
      </p>
      <p className="mt-2 text-sm text-ink-foreground/60">Vos services, à votre prix</p>
      <div className="absolute bottom-16 h-1 w-32 overflow-hidden rounded-full bg-ink-foreground/15">
        <div className="animate-splash-bar h-full w-full rounded-full bg-primary" />
      </div>
    </div>
  );
}
