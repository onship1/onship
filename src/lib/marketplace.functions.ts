import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const id = z.object({ id: z.string().uuid() });

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export const getProviderFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_provider_feed");
    fail(error);
    return data ?? [];
  });

export const submitOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        price: z.number().min(500).max(10_000_000),
        eta: z.number().int().min(0).max(24 * 60),
        message: z.string().trim().max(500).default(""),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: offerId, error } = await context.supabase.rpc("submit_offer", {
      _request_id: data.request_id,
      _price: data.price,
      _eta: data.eta,
      _message: data.message,
    });
    fail(error);
    return { id: offerId as string };
  });

export const getRequestDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => id.parse(i))
  .handler(async ({ data, context }) => {
    const { data: request, error } = await context.supabase
      .from("service_requests")
      .select(
        "id, title, description, status, urgency, proposed_price, recommended_price, currency, duration_minutes, address, scheduled_at, created_at, service_categories(name)",
      )
      .eq("id", data.id)
      .maybeSingle();
    fail(error);
    if (!request) throw new Error("Demande introuvable");
    const { data: offers, error: e2 } = await context.supabase.rpc("get_request_offers", {
      _request_id: data.id,
    });
    fail(e2);
    return { request, offers: offers ?? [] };
  });

export const acceptOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => id.parse(i))
  .handler(async ({ data, context }) => {
    const { data: missionId, error } = await context.supabase.rpc("accept_offer", { _offer_id: data.id });
    fail(error);
    return { missionId: missionId as string };
  });

export const cancelRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => id.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_request", { _request_id: data.id });
    fail(error);
    return { ok: true };
  });

export const getMyMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_my_missions");
    fail(error);
    return data ?? [];
  });

const missionStatus = z.enum(["provider_on_way", "started", "completed", "cancelled"]);

export const updateMissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: missionStatus }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_mission_status", {
      _mission_id: data.id,
      _status: data.status,
    });
    fail(error);
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, type, title, body, data, is_read, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    fail(error);
    return data ?? [];
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", context.userId)
      .eq("is_read", false);
    fail(error);
    return { ok: true };
  });

// ---------- Géolocalisation en direct ----------
export const updateMyLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        heading: z.number().nullable().optional(),
        speed: z.number().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_my_location", {
      _lat: data.lat,
      _lng: data.lng,
      _heading: data.heading ?? undefined,
      _speed: data.speed ?? undefined,
    });
    fail(error);
    return { ok: true };
  });

// ---------- Détail mission (suivi + chat + notation) ----------
export const getMissionDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => id.parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_mission_detail", { _mission_id: data.id });
    fail(error);
    const mission = rows?.[0];
    if (!mission) throw new Error("Mission introuvable");
    return mission;
  });

export const rateMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(500).default("") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rate_mission", {
      _mission_id: data.id,
      _rating: data.rating,
      _comment: data.comment,
    });
    fail(error);
    return { ok: true };
  });

// ---------- Crédits ----------
export const getWalletHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("credit_transactions")
      .select("id, type, amount, balance_after, description, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    fail(error);
    return data ?? [];
  });

// ---------- Administration ----------
export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_admin");
    return { isAdmin: data === true };
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [stats, providers] = await Promise.all([
      context.supabase.rpc("admin_stats"),
      context.supabase.rpc("admin_list_providers"),
    ]);
    fail(stats.error);
    fail(providers.error);
    return { stats: stats.data as Record<string, number>, providers: providers.data ?? [] };
  });

export const setProviderVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "under_review", "verified", "rejected", "suspended"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_verification", { _provider_id: data.id, _status: data.status });
    fail(error);
    return { ok: true };
  });
