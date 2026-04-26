"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

interface Props {
  contractId: string;
  token: string;
  parentName: string;
  amountDueCents: number;
  stripePublishableKey: string;
  stripeClientSecret: string | null;
}

export default function SignAndPay(props: Props) {
  const stripePromise = useMemo<Promise<Stripe | null> | null>(() => {
    if (!props.stripePublishableKey) return null;
    return loadStripe(props.stripePublishableKey);
  }, [props.stripePublishableKey]);

  if (props.amountDueCents > 0 && props.stripeClientSecret && stripePromise) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret: props.stripeClientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#1A3C6B",
              colorText: "#0f172a",
              borderRadius: "10px",
              fontFamily: "Inter, system-ui, sans-serif",
            },
          },
        }}
      >
        <InnerForm {...props} />
      </Elements>
    );
  }
  return <InnerForm {...props} />;
}

function InnerForm(props: Props) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Resize signature canvas to its parent (avoid blurry strokes on mobile)
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mounted) return;
    function resize() {
      if (!wrapRef.current || !sigRef.current) return;
      const canvas = sigRef.current.getCanvas();
      const ratio = window.devicePixelRatio || 1;
      const width = wrapRef.current.clientWidth;
      const height = 180;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext("2d")?.scale(ratio, ratio);
      sigRef.current.clear();
      setHasSigned(false);
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mounted]);

  function clearSignature() {
    sigRef.current?.clear();
    setHasSigned(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasSigned || !sigRef.current || sigRef.current.isEmpty()) {
      setError("Please sign in the box above before submitting.");
      return;
    }
    if (!agree) {
      setError("Please confirm you agree to the terms.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Confirm payment if there is an amount due
      if (props.amountDueCents > 0) {
        if (!stripe || !elements) {
          throw new Error("Payment is still loading. Please wait a moment and try again.");
        }
        const { error: submitError } = await elements.submit();
        if (submitError) throw submitError;

        const { error: payError, paymentIntent } = await stripe.confirmPayment({
          elements,
          redirect: "if_required",
          confirmParams: {
            return_url: `${window.location.origin}/welcome`,
          },
        });
        if (payError) throw payError;
        if (!paymentIntent || paymentIntent.status !== "succeeded") {
          throw new Error("Payment did not complete. Please try again.");
        }
      }

      // 2. Submit signature to server, which renders & stores the PDF and sends emails
      const signatureDataUrl = sigRef.current
        .getTrimmedCanvas()
        .toDataURL("image/png");
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: props.token,
          signature_data_url: signatureDataUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not finalize signing.");

      router.push("/welcome");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
      setSubmitting(false);
    }
  }

  const showPay = props.amountDueCents > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-5">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-navy">
          Sign here
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Use your finger or mouse to draw your signature as {props.parentName}.
        </p>
        <div
          ref={wrapRef}
          className="rounded-lg border border-dashed border-slate-300 bg-slate-50"
        >
          {mounted ? (
            <SignatureCanvas
              ref={(el) => {
                sigRef.current = el;
              }}
              penColor="#0f172a"
              onEnd={() => setHasSigned(true)}
              canvasProps={{ className: "w-full h-[180px] rounded-lg" }}
            />
          ) : (
            <div className="h-[180px] w-full" />
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            By signing you confirm you are {props.parentName} and the legal guardian.
          </span>
          <button
            type="button"
            onClick={clearSignature}
            className="text-navy/70 hover:text-navy"
          >
            Clear
          </button>
        </div>
      </div>

      {showPay && (
        <div className="card p-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-navy">
            Payment due at signing
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Securely processed by Stripe. You will be charged once you submit.
          </p>
          {props.stripeClientSecret ? (
            <PaymentElement />
          ) : (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Payment is currently unavailable. Please try refreshing.
            </div>
          )}
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange focus:ring-orange/40"
        />
        <span>
          I have read and agree to the StudyCore SAT Tutoring Services Agreement above, and I
          authorize StudyCore LLC to charge my payment method as described.
        </span>
      </label>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <button
        type="submit"
        className="btn-primary w-full text-base"
        disabled={submitting}
      >
        {submitting
          ? "Processing…"
          : showPay
          ? `Sign & Pay`
          : `Sign Agreement`}
      </button>
    </form>
  );
}
