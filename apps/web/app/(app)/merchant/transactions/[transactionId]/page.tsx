"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/shell";
import { EvidenceBadge } from "@/components/evidence-badge";
import { getReceipt } from "@/lib/api";
import { evidenceLabelKey, settlementLabelKey } from "@/lib/labels";
import { useAppContext } from "@/components/providers";

type ReceiptData = Awaited<ReturnType<typeof getReceipt>>;

export default function ReceiptPage() {
  const params = useParams<{ transactionId: string }>();
  const { session, translate } = useAppContext();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState("");
  const labelMap = {
    merchant_name: "merchant",
    payer_name: "customerName",
    payer_phone: "phone",
    amount: "amount",
    currency: "currency",
    reference: "reference",
    evidence_type: "evidenceType",
    evidence_source: "evidenceSource",
    evidence_confidence: "evidenceConfidence",
    settlement_status: "settlementStatus",
    category: "saleCategory",
    note: "noteOptional",
    location: "location",
    allocation: "allocationDistribution",
    timestamp: "timestamp"
  } as const;

  useEffect(() => {
    if (!session || !params.transactionId) {
      return;
    }
    getReceipt(Number(params.transactionId), session).then(setReceipt).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : translate("failedLoadReceipt"));
    });
  }, [params.transactionId, session, translate]);

  return (
    <AuthGuard role="merchant">
      <AppShell>
        <div className="panel mx-auto max-w-3xl p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("receiptView")}</p>
          {receipt ? (
            <div className="mt-6 rounded-[32px] border border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">{translate("digitalReceipt")}</p>
                  <h2 className="mt-2 break-words text-2xl font-semibold text-ink sm:text-3xl">{receipt.receipt_number}</h2>
                </div>
                {receipt.evidence_source ? <EvidenceBadge source={receipt.evidence_source} /> : null}
              </div>
              <div className="mt-6 space-y-3 text-sm text-slate-600">
                {Object.entries(receipt.payload).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                    <span>{translate(labelMap[key as keyof typeof labelMap] ?? "reference")}</span>
                    <span className="max-w-[58%] break-words text-right font-medium text-ink sm:max-w-[60%]">
                      {key === "evidence_type" && receipt.evidence_source ? translate(evidenceLabelKey(receipt.evidence_source)) : null}
                      {key === "evidence_source" && receipt.evidence_source ? translate(evidenceLabelKey(receipt.evidence_source)) : null}
                      {key === "settlement_status" && receipt.evidence_source ? translate(settlementLabelKey(receipt.evidence_source)) : null}
                      {!["evidence_type", "evidence_source", "settlement_status"].includes(key) ? (typeof value === "object" ? JSON.stringify(value) : String(value)) : null}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>{translate("created")}</span>
                  <span>{new Date(receipt.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">{error || translate("loadingReceipt")}</div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
