import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@/lib/types";

export async function getSessionUser(): Promise<AppUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id,email,name,role,active,created_at")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return profile as AppUser;
}

export async function requireRole(roles: UserRole[]): Promise<AppUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.active) redirect("/login?error=inactive");
  if (!roles.includes(user.role)) redirect("/login?error=forbidden");
  return user;
}
