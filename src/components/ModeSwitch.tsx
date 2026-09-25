import { useNavigate } from "@tanstack/react-router";
import { useAppMode } from "@/hooks/useAppMode";
import { cn } from "@/lib/utils";

/** Bascule Client / Prestataire (mode unique, comme InDrive). */
export function ModeSwitch({ className }: { className?: string }) {
  const { mode, setMode } = useAppMode();
  const navigate = useNavigate();

  const options: { value: "client" | "provider"; label: string }[] = [
    { value: "client", label: "Client" },
    { value: "provider", label: "Prestataire" },
  ];

  return (
    <div className={cn("inline-flex rounded-full bg-surface p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            setMode(option.value);
            navigate({ to: "/accueil" });
          }}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
            mode === option.value
              ? "bg-card text-foreground shadow-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
