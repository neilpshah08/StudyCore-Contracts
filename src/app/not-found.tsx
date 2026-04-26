import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-lg font-bold text-white">
          SC
        </div>
        <h1 className="text-2xl font-bold text-navy">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The link you followed may have expired or been mistyped.
        </p>
        <Link href="/" className="btn-secondary mt-6">
          Back to home
        </Link>
      </div>
    </main>
  );
}
