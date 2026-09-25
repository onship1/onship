import { createServerFn } from "@tanstack/react-start";

export type ServiceCategory = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  verification_level: number;
};

/** Catégories actives — lecture publique. */
export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicSupabase } = await import("./supabase-public.server");
  const supabase = createPublicSupabase();

  const { data, error } = await supabase
    .from("service_categories")
    .select("id, name, description, icon, image_url, verification_level")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as ServiceCategory[];
});
