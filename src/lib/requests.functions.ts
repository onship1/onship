import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CURRENCY, recommendedPrice } from "./pricing";

const urgencyEnum = z.enum(["urgent", "normal", "scheduled"]);

const quoteSchema = z.object({
  category_id: z.string().uuid(),
  duration_minutes: z.number().int().min(30).max(24 * 60),
  urgency: urgencyEnum,
});

/** Prix recommandé calculé côté serveur. */
export const getRecommendedPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => quoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: category, error } = await context.supabase
      .from("service_categories")
      .select("verification_level")
      .eq("id", data.category_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!category) throw new Error("Catégorie introuvable");

    return {
      price: recommendedPrice({
        verificationLevel: category.verification_level,
        durationMinutes: data.duration_minutes,
        urgency: data.urgency,
      }),
      currency: CURRENCY,
    };
  });

const createSchema = z.object({
  category_id: z.string().uuid(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
  duration_minutes: z.number().int().min(30).max(24 * 60),
  urgency: urgencyEnum,
  scheduled_at: z.string().datetime().optional(),
  address: z.string().trim().max(300).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  proposed_price: z.number().min(500).max(10_000_000),
  search_radius_km: z.number().min(1).max(100).default(10),
});

export const createServiceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: category, error: catError } = await supabase
      .from("service_categories")
      .select("verification_level, is_active")
      .eq("id", data.category_id)
      .maybeSingle();

    if (catError) throw new Error(catError.message);
    if (!category || !category.is_active) throw new Error("Catégorie indisponible");

    const recommended = recommendedPrice({
      verificationLevel: category.verification_level,
      durationMinutes: data.duration_minutes,
      urgency: data.urgency,
    });

    const { data: created, error } = await supabase
      .from("service_requests")
      .insert({
        client_id: userId,
        category_id: data.category_id,
        title: data.title,
        description: data.description ?? null,
        duration_minutes: data.duration_minutes,
        urgency: data.urgency,
        scheduled_at: data.urgency === "scheduled" ? (data.scheduled_at ?? null) : null,
        address: data.address ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        location:
          data.latitude !== undefined && data.longitude !== undefined
            ? `SRID=4326;POINT(${data.longitude} ${data.latitude})`
            : null,
        proposed_price: data.proposed_price,
        recommended_price: recommended,
        currency: CURRENCY,
        search_radius_km: data.search_radius_km,
        status: "searching",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const listMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("service_requests")
      .select(
        "id, title, status, urgency, proposed_price, recommended_price, currency, duration_minutes, address, scheduled_at, created_at, service_categories(name, icon)",
      )
      .eq("client_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return data ?? [];
  });
