"use client";

import { useEffect, useState } from "react";
import { AllocationChart, EvidenceMixChart, TrustBarChart } from "@/components/charts";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/shell";
import { StatCard } from "@/components/stat-card";
import { EvidenceBadge } from "@/components/evidence-badge";
import { getAdminDashboard, getMerchantDetail } from "@/lib/api";
import { tierKeyMap } from "@/lib/labels";
import type { AdminDashboard, MerchantDetail } from "@/lib/types";
import { useAppContext } from "@/components/providers";

export default function AdminDashboardPage() {
  const { session, translate } = useAppContext();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) {
      return;
    }
    getAdminDashboard(session).then((data) => {
      setDashboard(data);
      if (data.merchants[0]) {
        getMerchantDetail(data.merchants[0].id, session).then(setSelectedMerchant).catch(() => undefined);
      }
    }).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : translate("failedLoadDashboard"));
    });
  }, [session, translate]);

  const allocationData = dashboard ? Object.entries(dashboard.allocation_distribution).map(([name, value]) => ({ name: translate(name as "operating" | "savings" | "growth"), value })) : [];
  const trustData = dashboard ? Object.entries(dashboard.trust_distribution).map(([tier, merchants]) => ({
    tier: translate(tierKeyMap[tier as keyof typeof tierKeyMap] ?? "starter"),
    merchants
  })) : [];
  const evidenceData = dashboard ? [
    { name: translate("verifiedQr"), value: dashboard.evidence_distribution.amounts.verified_qr },
    { name: translate("declaredCash"), value: dashboard.evidence_distribution.amounts.declared_cash }
  ] : [];

  return (
    <AuthGuard role="admin">
      <AppShell>
        {dashboard ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <StatCard label={translate("totalMerchants")} value={String(dashboard.metrics.total_merchants)} />
              <StatCard label={translate("totalProcessed")} value={`$${dashboard.metrics.total_processed_payments.toFixed(2)}`} accent="text-brand-600" />
              <StatCard label={translate("activeOffers")} value={String(dashboard.metrics.active_offers)} accent="text-gold" />
              <StatCard label={translate("fraudAlerts")} value={String(dashboard.metrics.open_fraud_alerts)} />
              <StatCard label={translate("verifiedActivity")} value={`$${dashboard.metrics.verified_activity_value.toFixed(2)}`} accent="text-emerald-700" />
              <StatCard label={translate("declaredActivity")} value={`$${dashboard.metrics.declared_activity_value.toFixed(2)}`} accent="text-amber-700" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
              <section className="panel p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("allocationDistribution")}</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">{translate("walletPocketDistribution")}</h2>
                <AllocationChart data={allocationData} />
              </section>
              <section className="panel p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("trustDistribution")}</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">{translate("trustLadder")}</h2>
                <TrustBarChart data={trustData} />
              </section>
              <section className="panel p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("evidenceMix")}</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">{translate("verifiedVsDeclaredActivity")}</h2>
                <EvidenceMixChart data={evidenceData} />
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="panel p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("recentTransactions")}</p>
                <div className="mt-4 space-y-3">
                  {dashboard.recent_transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium text-ink">{transaction.reference}</p>
                          <EvidenceBadge source={transaction.evidence_source} />
                        </div>
                        <p className="text-xs text-slate-500">{new Date(transaction.recorded_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">${transaction.amount.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{translate("merchant")} {transaction.merchant_id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <div className="panel p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("fraudConsole")}</p>
                  <div className="mt-4 space-y-3">
                    {dashboard.fraud_alerts.map((alert) => (
                      <div key={alert.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-ink">{alert.rule_code}</p>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${alert.severity === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("merchantEvidenceMap")}</p>
                  <div className="mt-4 space-y-3">
                    {dashboard.merchants.map((merchant) => (
                      <button
                        key={merchant.id}
                        className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left"
                        onClick={() => {
                          if (!session) {
                            return;
                          }
                          getMerchantDetail(merchant.id, session).then(setSelectedMerchant).catch(() => undefined);
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium text-ink">{merchant.business_name}</p>
                          <p className="text-xs text-slate-500">{merchant.business_type}</p>
                        </div>
                        <span className="text-sm text-slate-600">{merchant.location}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {selectedMerchant ? (
              <section className="panel p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("merchantDetailView")}</p>
                <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    <h3 className="text-2xl font-semibold text-ink">{selectedMerchant.merchant.business_name}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedMerchant.merchant.business_type} · {selectedMerchant.merchant.location}
                    </p>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{translate("operating")}</p>
                        <p className="mt-2 text-xl font-semibold text-ink">${selectedMerchant.wallet.operating_balance.toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl bg-brand-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-brand-700">{translate("savings")}</p>
                        <p className="mt-2 text-xl font-semibold text-brand-700">${selectedMerchant.wallet.savings_balance.toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl bg-amber-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-amber-700">{translate("growth")}</p>
                        <p className="mt-2 text-xl font-semibold text-amber-700">${selectedMerchant.wallet.growth_balance.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">{translate("verifiedActivity")}</p>
                        <p className="mt-2 text-xl font-semibold text-emerald-800">${selectedMerchant.evidence_summary.verified_activity_value.toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl bg-amber-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-amber-700">{translate("declaredActivity")}</p>
                        <p className="mt-2 text-xl font-semibold text-amber-800">${selectedMerchant.evidence_summary.declared_activity_value.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[28px] bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("financeReadiness")}</p>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-5xl font-semibold text-ink">{selectedMerchant.trust_score.score}</p>
                        <p className="mt-1 text-sm font-medium text-brand-600">{translate(tierKeyMap[selectedMerchant.trust_score.tier as keyof typeof tierKeyMap] ?? "starter")}</p>
                      </div>
                      <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {selectedMerchant.offers.length} {translate("offers")}
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {selectedMerchant.transactions.slice(0, 4).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-ink">{transaction.reference}</p>
                              <EvidenceBadge source={transaction.evidence_source} />
                            </div>
                            <p className="text-xs text-slate-500">{transaction.payer_name}</p>
                          </div>
                          <span className="text-sm font-semibold text-ink">${transaction.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="panel p-6 text-sm text-slate-500">{error || translate("loadingDashboard")}</div>
        )}
      </AppShell>
    </AuthGuard>
  );
}
