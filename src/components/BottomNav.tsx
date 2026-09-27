import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListOrdered, PlusCircle, User, Briefcase, Radar, Route as RouteIcon, Bell } from "lucide-react";
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
          { to: "/missions", label: "Missions", icon: RouteIcon },
          { to: "/notifications", label: "Alertes", icon: Bell },
          { to: "/profil", label: "Profil", icon: User },
        ]
      : [
          { to: "/accueil", label: "Accueil", icon: Home },
          { to: "/opportunites", label: "Demandes", icon: Radar },
          { to: "/missions", label: "Missions", icon: RouteIcon },
          { to: "/notifications", label: "Alertes", icon: Bell },
          { to: "/prestataire", label: "Activité", icon: Briefcase },
          { to: "/profil", label: "Profil", icon: User },
        ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-3">
      <div className="app-shell">
      <div className="flex items-stretch justify-between rounded-full bg-ink p-1.5 text-ink-foreground shadow-float">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 text-[11px] font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-ink-foreground/60 hover:text-ink-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "stroke-[2.4]")} />
              {item.label}
            </Link>
          );
        })}
      </div>
      </div>
    </nav>
  );
}
