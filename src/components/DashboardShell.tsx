import Link from "next/link";
import type { AppUser } from "@/lib/types";

export default function DashboardShell({
  user,
  children,
  nav,
}: {
  user: AppUser;
  children: React.ReactNode;
  nav?: { href: string; label: string }[];
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href={user.role === "admin" ? "/admin" : "/closer"} className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white">
                SC
              </span>
              <span className="font-semibold text-navy">StudyCore Contracts</span>
            </Link>
            {nav && (
              <nav className="hidden items-center gap-1 md:flex">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href} className="btn-ghost">
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs text-slate-500 md:block">
              <div className="font-medium text-slate-700">{user.name}</div>
              <div className="capitalize">{user.role}</div>
            </div>
            <form action="/logout" method="POST">
              <button className="btn-ghost" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
