import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { buildContractClauses } from "@/lib/contract-text";
import { formatMoney } from "@/lib/format";
import type { Contract } from "@/lib/types";
import SignAndPay from "./SignAndPay";
import FinalizeAfterRedirect from "./FinalizeAfterRedirect";

export const dynamic = "force-dynamic";

function redirectErrorFor(status: string | undefined): string | null {
  if (!status || status === "succeeded") return null;
  if (status === "processing") {
    return "Your payment is still processing. We'll email you once it confirms — you don't need to do anything else right now.";
  }
  if (status === "requires_payment_method" || status === "failed") {
    return "Payment was not completed. Please try again or use a different payment method.";
  }
  if (status === "requires_action" || status === "canceled") {
    return "Payment was not completed. Please try again.";
  }
  return "Payment was not completed. Please try again.";
}

export default async function SignPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: {
    payment_intent?: string;
    payment_intent_client_secret?: string;
    redirect_status?: string;
  };
}) {
  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("signing_token", params.token)
    .single();

  if (!contract) notFound();

  // Mark as viewed if first view
  if (contract.status === "sent") {
    await admin
      .from("contracts")
      .update({ status: "viewed" })
      .eq("id", contract.id);
    contract.status = "viewed";
  }

  const isComplete = contract.status === "completed" || contract.status === "signed";
  const dueAtSigningCents = Math.round(Number(contract.amount_due_at_signing) * 100);

  // The parent has just been redirected back to us from a Stripe redirect-based
  // payment method (Klarna, Affirm, etc.). The query params tell us how it
  // went. We re-verify the payment status server-side before honoring it.
  const returnedFromRedirect = !!searchParams.payment_intent && !!searchParams.redirect_status;
  let verifiedRedirectSucceeded = false;
  let redirectError: string | null = null;

  if (returnedFromRedirect && !isComplete) {
    if (searchParams.redirect_status === "succeeded") {
      try {
        const stripe = getStripe();
        const pi = await stripe.paymentIntents.retrieve(searchParams.payment_intent!);
        if (
          pi.status === "succeeded" &&
          pi.metadata?.contract_id === contract.id
        ) {
          verifiedRedirectSucceeded = true;
        } else {
          redirectError =
            "Payment did not confirm. Please try again or use a different payment method.";
        }
      } catch {
        redirectError =
          "We couldn't verify your payment. Please try again or contact support@studycore.net.";
      }
    } else {
      redirectError = redirectErrorFor(searchParams.redirect_status);
    }
  }

  // Set up Stripe payment intent if we have an amount due and not yet paid.
  // Skip when we already verified a successful redirect — we're about to
  // render the finalizing UI and would otherwise create a stray fresh PI
  // (since the existing PI is already in a `succeeded` state).
  let clientSecret: string | null = null;
  if (!isComplete && !verifiedRedirectSucceeded && dueAtSigningCents > 0) {
    const stripe = getStripe();
    if (contract.stripe_payment_intent_id) {
      try {
        const existing = await stripe.paymentIntents.retrieve(
          contract.stripe_payment_intent_id
        );
        if (
          existing.amount === dueAtSigningCents &&
          existing.status !== "succeeded" &&
          existing.status !== "canceled"
        ) {
          clientSecret = existing.client_secret;
        } else {
          const fresh = await stripe.paymentIntents.create({
            amount: dueAtSigningCents,
            currency: "usd",
            automatic_payment_methods: { enabled: true },
            description: `StudyCore SAT Agreement — ${contract.student_name}`,
            receipt_email: contract.parent_email,
            metadata: { contract_id: contract.id },
          });
          await admin
            .from("contracts")
            .update({ stripe_payment_intent_id: fresh.id })
            .eq("id", contract.id);
          clientSecret = fresh.client_secret;
        }
      } catch {
        const fresh = await stripe.paymentIntents.create({
          amount: dueAtSigningCents,
          currency: "usd",
          automatic_payment_methods: { enabled: true },
          description: `StudyCore SAT Agreement — ${contract.student_name}`,
          receipt_email: contract.parent_email,
          metadata: { contract_id: contract.id },
        });
        await admin
          .from("contracts")
          .update({ stripe_payment_intent_id: fresh.id })
          .eq("id", contract.id);
        clientSecret = fresh.client_secret;
      }
    } else {
      const created = await stripe.paymentIntents.create({
        amount: dueAtSigningCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        description: `StudyCore SAT Agreement — ${contract.student_name}`,
        receipt_email: contract.parent_email,
        metadata: { contract_id: contract.id },
      });
      await admin
        .from("contracts")
        .update({ stripe_payment_intent_id: created.id })
        .eq("id", contract.id);
      clientSecret = created.client_secret;
    }
  }

  const clauses = buildContractClauses(contract as Contract);

  if (isComplete) {
    return (
      <main className="min-h-screen bg-cream">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h1 className="text-3xl font-bold text-navy">This contract is already signed.</h1>
          <p className="mt-3 text-slate-600">
            You signed and paid for {contract.student_name}'s enrollment. A copy was emailed
            to you. If you need it again, contact support@studycore.net.
          </p>
          {contract.pdf_url && (
            <a
              href={contract.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-6 inline-block"
            >
              Download signed PDF
            </a>
          )}
        </div>
      </main>
    );
  }

  // Successful redirect-method payment: render a "Finalizing..." UI that
  // POSTs the saved signature to /api/sign and then router.replace to
  // /welcome. The replace navigation strips Stripe's redirect query params
  // from the address bar.
  if (verifiedRedirectSucceeded) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-md px-5 py-20">
          <FinalizeAfterRedirect token={contract.signing_token} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white">
              SC
            </span>
            <div>
              <div className="text-sm font-semibold text-navy">StudyCore LLC</div>
              <div className="text-xs text-slate-500">SAT Tutoring Agreement</div>
            </div>
          </div>
          <a
            href="https://studycore.net"
            className="hidden text-xs font-medium text-slate-500 hover:text-navy md:inline"
          >
            studycore.net
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="card mb-6 p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500">For</div>
          <div className="mt-1 text-2xl font-bold text-navy">{contract.student_name}</div>
          <div className="text-sm text-slate-500">Parent / Guardian: {contract.parent_name}</div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Total program</div>
              <div className="font-semibold text-slate-800">{formatMoney(contract.total_price)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Due at signing</div>
              <div className="font-semibold text-orange">
                {formatMoney(contract.amount_due_at_signing)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Structure</div>
              <div className="font-semibold text-slate-800">{contract.payment_structure}</div>
            </div>
          </div>
        </div>

        <article className="card mb-6 max-h-[60vh] overflow-y-auto p-6 text-sm leading-relaxed text-slate-800">
          <div className="mb-4 border-b border-slate-200 pb-3">
            <div className="text-xs uppercase tracking-wider text-orange">StudyCore LLC</div>
            <h1 className="text-xl font-bold text-navy">SAT Tutoring Services Agreement</h1>
          </div>
          {clauses.map((clause) => (
            <section key={clause.heading} className="mb-5">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-navy">
                {clause.heading}
              </h2>
              {clause.paragraphs.map((p, i) => (
                <p key={i} className="mb-2 whitespace-pre-line">
                  {p}
                </p>
              ))}
              {clause.bullets && (
                <ul className="ml-5 list-disc space-y-1">
                  {clause.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <SignAndPay
          contractId={contract.id}
          token={contract.signing_token}
          parentName={contract.parent_name}
          amountDueCents={dueAtSigningCents}
          stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
          stripeClientSecret={clientSecret}
          initialError={redirectError}
        />
      </div>
    </main>
  );
}
