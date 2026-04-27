"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ errorParam }: { errorParam?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "inactive"
      ? "Your account is deactivated. Contact your admin."
      : errorParam === "forbidden"
      ? "You don't have access to that area."
      : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role,active")
        .eq("id", user.id)
        .single();
      if (profileError) {
        await supabase.auth.signOut();
        setError(`Profile lookup failed: ${profileError.message}`);
        setLoading(false);
        return;
      }
      if (!profile) {
        await supabase.auth.signOut();
        setError("No profile row found for this account.");
        setLoading(false);
        return;
      }
      if (!profile.active) {
        await supabase.auth.signOut();
        setError("Your account is deactivated. Contact your admin.");
        setLoading(false);
        return;
      }
      router.replace(profile.role === "admin" ? "/admin" : "/closer");
      router.refresh();
    } catch {
      setError("Unexpected error. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
