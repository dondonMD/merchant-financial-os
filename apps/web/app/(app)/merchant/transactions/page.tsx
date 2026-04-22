"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/shell";
import { EvidenceBadge } from "@/components/evidence-badge";
import { getMerchantDetail } from "@/lib/api";
import type { MerchantDetail } from "@/lib/types";
import { useAppContext } from "@/components/providers";

export default function MerchantTransactionsPage() {
  const { session, translate } = useAppContext();
  const [detail, setDetail] = useState<MerchantDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.merchantId) {
      return;
    }
    getMerchantDetail(session.merchantId, session).then(setDetail).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : translate("failedLoadTransactions"));
    });
  }, [session, translate]);

  return (
    <AuthGuard role="merchant">
      <AppShell>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("transactionsNav")}</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">{translate("evidenceHistory")}</h2>
          {detail ? (
            <div className="mt-6 space-y-4">
              {detail.transactions.length ? detail.transactions.map((transaction) => (
                <div key={transaction.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-ink">{transaction.reference}</p>
                      <EvidenceBadge source={transaction.evidence_source} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {transaction.payer_name} · {new Date(transaction.recorded_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm font-semibold text-ink">${transaction.amount.toFixed(2)}</p>
                    <Link
                      href={`/merchant/transactions/${transaction.id}`}
                      className="mt-2 inline-block w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700"
                    >
                      {translate("viewReceipt")}
                    </Link>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  {translate("noTransactionsYet")}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">{error || translate("loadingTransactions")}</div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
