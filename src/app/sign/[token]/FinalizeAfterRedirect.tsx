"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SIGNATURE_STORAGE_KEY } from "./SignAndPay";

export default function FinalizeAfterRedirect({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      let signatureDataUrl: string | null = null;
      try {
        signatureDataUrl = sessionStorage.getItem(SIGNATURE_STORAGE_KEY(token));
      } catch {
        signatureDataUrl = null;
      }

      if (!signatureDataUrl) {
        setError(
          "We received your payment but couldn't find the signature in this browser. Please re-open the contract from your email on the same device to finish signing — or contact support@studycore.net."
        );
        return;
      }

      try {
        const res = await fetch("/api/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, signature_data_url: signatureDataUrl }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Could not finalize signing. Please contact support.");
          return;
        }
      } catch {
        setError(
          "We couldn't reach the server to finalize signing. Please try again or contact support."
        );
        return;
      }

      try {
        sessionStorage.removeItem(SIGNATURE_STORAGE_KEY(token));
      } catch {}

      // router.replace navigates to /welcome and replaces history, so the
      // payment_intent / payment_intent_client_secret / redirect_status query
      // params are not visible in the address bar.
      router.replace("/welcome");
    })();
  }, [router, token]);

  if (error) {
    return (
      <div className="card p-6">
        <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-700">
          Couldn't finalize
        </div>
        <p className="text-sm text-slate-700">{error}</p>
        <a
          href={`/sign/${token}`}
          className="btn-secondary mt-4 inline-flex"
        >
          Back to contract
        </a>
      </div>
    );
  }

  return (
    <div className="card p-8 text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-navy/20 border-t-navy" />
      <div className="text-base font-semibold text-navy">Finalizing your enrollment…</div>
      <p className="mt-2 text-sm text-slate-500">
        Confirming your payment and saving your signed agreement.
      </p>
    </div>
  );
}
