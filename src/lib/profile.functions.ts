import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  });

const updateSchema = z.object({
  first_name: z.string().trim().max(80).optional(),
  last_name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  avatar_url: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Profil prestataire + portefeuille + catégories (null si le mode n'est pas encore activé). */
export const getMyProviderProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: provider, error } = await context.supabase
      .from("provider_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!provider) return null;

    const [{ data: wallet }, { data: categories }] = await Promise.all([
      context.supabase.from("credit_wallets").select("*").eq("provider_id", provider.id).maybeSingle(),
      context.supabase
        .from("provider_categories")
        .select("category_id, service_categories(id, name, icon)")
        .eq("provider_id", provider.id),
    ]);

    return {
      provider,
      wallet: wallet ?? null,
      categories: (categories ?? []).map((row) => ({
        id: row.category_id,
        name: row.service_categories?.name ?? "",
        icon: row.service_categories?.icon ?? null,
      })),
    };
  });

const providerSetupSchema = z.object({
  professional_title: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(1000).optional(),
  category_ids: z.array(z.string().uuid()).min(1).max(10),
});

/** Active le mode prestataire : crée le profil pro (portefeuille créé par la base) et ses catégories. */
export const setupProviderMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerSetupSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("provider_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let providerId = existing?.id ?? null;

    if (providerId) {
      const { error } = await supabase
        .from("provider_profiles")
        .update({
          professional_title: data.professional_title,
          bio: data.bio ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", providerId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabase
        .from("provider_profiles")
        .insert({
          user_id: userId,
          professional_title: data.professional_title,
          bio: data.bio ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      providerId = created.id;
    }

    const { data: current } = await supabase
      .from("provider_categories")
      .select("category_id")
      .eq("provider_id", providerId);

    const currentIds = new Set((current ?? []).map((row) => row.category_id));
    const nextIds = new Set(data.category_ids);

    const toAdd = data.category_ids.filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from("provider_categories")
        .insert(toAdd.map((category_id) => ({ provider_id: providerId!, category_id })));
      if (error) throw new Error(error.message);
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("provider_categories")
        .delete()
        .eq("provider_id", providerId)
        .in("category_id", toRemove);
      if (error) throw new Error(error.message);
    }

    return { providerId };
  });

const availabilitySchema = z.object({
  availability_status: z.enum(["offline", "available", "busy"]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const updateAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => availabilitySchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      availability_status: data.availability_status,
      updated_at: new Date().toISOString(),
    };
    if (data.latitude !== undefined && data.longitude !== undefined) {
      patch["latitude"] = data.latitude;
      patch["longitude"] = data.longitude;
      patch["location"] = `SRID=4326;POINT(${data.longitude} ${data.latitude})`;
    }

    const { error } = await context.supabase
      .from("provider_profiles")
      .update(patch)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
