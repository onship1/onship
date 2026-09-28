import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppMode } from "@/hooks/useAppMode";
import { updateMyLocation } from "@/lib/marketplace.functions";

/** Matching en direct : rafraîchit l'app dès qu'une demande, offre, mission ou alerte change. */
export function useRealtimeSync() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => qc.invalidateQueries(), 400);
    };
    const channel = supabase
      .channel(`live-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as { title?: string; body?: string };
          toast(n.title ?? "Nouvelle alerte", { description: n.body });
          refresh();
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "service_offers" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user, qc]);
}

/** En mode prestataire, partage la position GPS toutes les ~15 s. */
export function useProviderLiveLocation() {
  const { user } = useAuth();
  const { mode } = useAppMode();
  const last = useRef(0);

  useEffect(() => {
    if (!user || mode !== "provider" || !("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - last.current < 15_000) return;
        last.current = now;
        updateMyLocation({
          data: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          },
        }).catch(() => undefined);
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, mode]);
}
