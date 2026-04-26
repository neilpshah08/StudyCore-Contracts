import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getSessionUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/closer");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white">
            <span className="text-xl font-bold">SC</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">StudyCore Contracts</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage agreements</p>
        </div>
        <div className="card p-6">
          <LoginForm errorParam={searchParams?.error} />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Trouble signing in? Contact your StudyCore admin.
        </p>
      </div>
    </main>
  );
}
