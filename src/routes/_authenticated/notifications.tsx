import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { listNotifications, markNotificationsRead } from "@/lib/marketplace.functions";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Onship" },
      { name: "description", content: "Nouvelles offres, demandes et suivi de vos missions Onship." },
      { property: "og:title", content: "Notifications — Onship" },
      { property: "og:description", content: "Toute l'activité de votre compte Onship." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  useEffect(() => {
    if (list.data?.some((n) => !n.is_read)) {
      markNotificationsRead().then(() => qc.invalidateQueries({ queryKey: ["notif-count"] }));
    }
  }, [list.data, qc]);

  return (
    <div className="app-shell pt-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <div className="mt-5 space-y-2">
        {list.isLoading && <Skeleton className="h-20 rounded-2xl" />}
        {list.data?.length === 0 && (
          <p className="rounded-3xl bg-surface p-6 text-center text-sm text-muted-foreground">Rien de neuf.</p>
        )}
        {list.data?.map((n) => (
          <div key={n.id} className={`flex gap-3 rounded-2xl p-4 ${n.is_read ? "bg-card" : "bg-surface"} shadow-card`}>
            <Bell className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
