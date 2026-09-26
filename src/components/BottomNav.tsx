import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListOrdered, PlusCircle, User, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppMode } from "@/hooks/useAppMode";

export function BottomNav() {
  const { mode } = useAppMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items =
    mode === "client"
      ? [
          { to: "/accueil", label: "Accueil", icon: Home },
          { to: "/demandes", label: "Demandes", icon: ListOrdered },
          { to: "/demandes/nouvelle", label: "Nouvelle", icon: PlusCircle },
          { to: "/profil", label: "Profil", icon: User },
        ]
      : [
          { to: "/accueil", label: "Accueil", icon: Home },
          { to: "/prestataire", label: "Activité", icon: Briefcase },
          { to: "/profil", label: "Profil", icon: User },
        ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <div className="app-shell flex items-stretch justify-between py-2">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "stroke-[2.4]")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
