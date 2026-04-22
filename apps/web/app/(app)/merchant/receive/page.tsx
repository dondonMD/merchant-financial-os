"use client";

import QRCode from "react-qr-code";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/shell";
import { EvidenceBadge } from "@/components/evidence-badge";
import { getMerchantDetail, getReceipt, recordCashSale, simulatePayment } from "@/lib/api";
import { settlementLabelKey, tierKeyMap } from "@/lib/labels";
import { useAppContext } from "@/components/providers";
import type { MerchantDetail, PaymentResult, ReceiptDetail } from "@/lib/types";

export default function MerchantReceivePage() {
  const { session, translate } = useAppContext();
  const [detail, setDetail] = useState<MerchantDetail | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [error, setError] = useState("");
  const [activeFlow, setActiveFlow] = useState<"qr" | "cash">("qr");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.merchantId) {
      return;
    }
    getMerchantDetail(session.merchantId, session).then(setDetail).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : translate("failedLoadMerchant"));
    });
  }, [session, translate]);

  async function hydrateSaleOutcome(payment: PaymentResult, successMessage: string, loadingMessage: string) {
    const loadingToastId = toast.loading(loadingMessage);
    try {
      setResult(payment);
      if (!session?.merchantId) {
        return;
      }
      const [nextDetail, nextReceipt] = await Promise.all([
        getMerchantDetail(session.merchantId, session),
        getReceipt(payment.transaction.id, session)
      ]);
      setDetail(nextDetail);
      setReceipt(nextReceipt);
      confetti({
        particleCount: 140,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#059669", "#10b981", "#34d399", "#fbbf24", "#0f172a"]
      });
      toast.success(successMessage, { id: loadingToastId });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : translate("paymentFailed");
      setError(message);
      toast.error(message, { id: loadingToastId });
    }
  }

  async function handleSimulate(formData: FormData) {
    if (!session?.merchantId) {
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const payment = await simulatePayment(session, {
        merchant_id: session.merchantId,
        payer_name: String(formData.get("payer_name")),
        payer_phone: String(formData.get("payer_phone")),
        amount: Number(formData.get("amount")),
        location: String(formData.get("location")),
        device_id: String(formData.get("device_id")),
        idempotency_key: crypto.randomUUID()
      });
      await hydrateSaleOutcome(payment, translate("paymentReceivedSuccess"), translate("simulatedPaymentProcessing"));
    } catch (paymentError) {
      const message = paymentError instanceof Error ? paymentError.message : translate("paymentFailed");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCashSale(formData: FormData) {
    if (!session) {
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const payment = await recordCashSale(session, {
        amount: Number(formData.get("amount")),
        payer_name: String(formData.get("payer_name") || ""),
        payer_phone: String(formData.get("payer_phone") || ""),
        category: String(formData.get("category")),
        note: String(formData.get("note") || ""),
        location: String(formData.get("location")),
        device_id: String(formData.get("device_id")),
        recorded_at: String(formData.get("recorded_at"))
      });
      await hydrateSaleOutcome(payment, translate("cashSaleSaved"), translate("cashSaleProcessing"));
    } catch (paymentError) {
      const message = paymentError instanceof Error ? paymentError.message : translate("paymentFailed");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthGuard role="merchant">
      <AppShell>
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="panel p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("interoperableQr")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">{detail?.merchant.business_name ?? translate("loading")}</h2>
            <p className="mt-2 text-sm text-slate-500">{translate("oneMerchantQrDemo")}</p>
            <div className="mt-6 rounded-[32px] bg-white p-4">
              {detail ? <QRCode value={detail.qr_profile.qr_payload} className="h-auto w-full" /> : null}
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {translate("payload")}: <span className="break-all font-mono">{detail?.qr_profile.qr_payload}</span>
            </div>
            <div className="mt-4 rounded-3xl bg-amber-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-amber-800">{translate("hybridEvidenceSupportTitle")}</p>
              <p className="mt-2">{translate("hybridEvidenceSupportBody")}</p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="panel p-6">
              <div className="inline-flex w-full rounded-full bg-slate-100 p-1 sm:w-auto">
                <button
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-medium sm:flex-none ${activeFlow === "qr" ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
                  onClick={() => setActiveFlow("qr")}
                  type="button"
                >
                  {translate("qrReceiveTab")}
                </button>
                <button
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-medium sm:flex-none ${activeFlow === "cash" ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
                  onClick={() => setActiveFlow("cash")}
                  type="button"
                >
                  {translate("cashSaleTab")}
                </button>
              </div>

              {activeFlow === "qr" ? (
                <div className="mt-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("customerSimulator")}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">{translate("runLivePayment")}</h2>
                  <form action={handleSimulate} className="mt-6 grid gap-4 md:grid-cols-2">
                    <input name="payer_name" placeholder={translate("customerName")} defaultValue="Judges Table" className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="payer_phone" placeholder={translate("phone")} defaultValue="+263778991122" className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="amount" type="number" step="0.01" placeholder={translate("amount")} defaultValue="20.00" className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="location" placeholder={translate("location")} defaultValue={detail?.merchant.location ?? "Harare"} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="device_id" placeholder={translate("deviceId")} defaultValue="judge-device-01" className="col-span-full rounded-2xl border border-slate-200 px-4 py-3" />
                    <button disabled={isSubmitting} className="col-span-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                      {isSubmitting ? translate("processing") : translate("simulateQrPayment")}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("recordCashSale")}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">{translate("cashSaleFastEntryTitle")}</h2>
                  <p className="mt-2 text-sm text-slate-500">{translate("cashSalesSupportCopy")}</p>
                  <form action={handleCashSale} className="mt-6 grid gap-4 md:grid-cols-2">
                    <input name="amount" type="number" step="0.01" placeholder={translate("amount")} defaultValue="12.50" className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="category" placeholder={translate("saleCategory")} defaultValue="produce" className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="payer_name" placeholder={translate("customerNameOptional")} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="payer_phone" placeholder={translate("phoneOptional")} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="location" placeholder={translate("location")} defaultValue={detail?.merchant.location ?? "Harare"} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="device_id" placeholder={translate("deviceId")} defaultValue="merchant-device-01" className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="recorded_at" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <input name="note" placeholder={translate("noteOptional")} className="rounded-2xl border border-slate-200 px-4 py-3" />
                    <button disabled={isSubmitting} className="col-span-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                      {isSubmitting ? translate("processing") : translate("recordSale")}
                    </button>
                  </form>
                </div>
              )}

              {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            </div>

            <AnimatePresence>
              {result && receipt ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
                >
                  <div className="panel p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("beforeAfterSplit")}</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <EvidenceBadge source={result.transaction.evidence_source} />
                      <p className="text-sm text-slate-500">{translate("evidenceType")}</p>
                    </div>
                    <div className="mt-4 space-y-4 text-sm text-slate-600">
                      {Object.entries(result.allocation).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                          <span>{translate(key as "operating" | "savings" | "growth")}</span>
                          <span className="font-semibold text-ink">${value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-3xl bg-brand-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">{translate("moatSignal")}</p>
                      <p className="mt-2 text-sm text-slate-700">{translate("moatSignalCopy")}</p>
                    </div>
                  </div>
                  <div className="panel p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("digitalReceipt")}</p>
                    <div className="mt-4 rounded-[28px] border border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">{translate("receipt")}</p>
                          <h3 className="mt-2 text-xl font-semibold text-ink">{receipt.receipt_number}</h3>
                        </div>
                        {receipt.evidence_source ? <EvidenceBadge source={receipt.evidence_source} /> : null}
                      </div>
                      <div className="mt-6 space-y-3 text-sm text-slate-600">
                        <div className="flex items-start justify-between gap-4"><span>{translate("reference")}</span><span className="max-w-[60%] break-words text-right">{result.transaction.reference}</span></div>
                        <div className="flex items-start justify-between gap-4"><span>{translate("merchant")}</span><span className="max-w-[60%] text-right">{detail?.merchant.business_name}</span></div>
                        <div className="flex items-start justify-between gap-4"><span>{translate("amount")}</span><span className="text-right">${result.transaction.amount.toFixed(2)}</span></div>
                        <div className="flex items-start justify-between gap-4"><span>{translate("trustScoreNow")}</span><span className="max-w-[60%] text-right">{result.trust_score.score} / {translate(tierKeyMap[result.trust_score.tier as keyof typeof tierKeyMap] ?? "starter")}</span></div>
                        <div className="flex items-start justify-between gap-4"><span>{translate("settlementStatus")}</span><span className="max-w-[60%] text-right">{receipt.evidence_source ? translate(settlementLabelKey(receipt.evidence_source)) : "-"}</span></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
