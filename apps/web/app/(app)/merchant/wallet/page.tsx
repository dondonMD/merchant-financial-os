"use client";

import { useEffect, useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/shell";
import { StatCard } from "@/components/stat-card";
import { getMerchantDetail, updateAllocation } from "@/lib/api";
import { tierKeyMap, trustFactorKeyMap } from "@/lib/labels";
import type { MerchantDetail } from "@/lib/types";
import { useAppContext } from "@/components/providers";

export default function MerchantWalletPage() {
  const { session, translate } = useAppContext();
  const [detail, setDetail] = useState<MerchantDetail | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const projectionData = useMemo(() => detail ? Array.from({ length: 15 }).map((_, index) => ({
    day: index + 1,
    savings: detail.wallet.savings_balance + (index * (detail.wallet.savings_balance * 0.1)),
    projected: detail.wallet.savings_balance + (index * (detail.wallet.savings_balance * 0.15))
  })) : [], [detail]);

  useEffect(() => {
    if (!session?.merchantId) {
      return;
    }
    getMerchantDetail(session.merchantId, session).then(setDetail).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : translate("failedLoadWallet"));
    });
  }, [session, translate]);

  async function handleAllocationUpdate(formData: FormData) {
    if (!session?.merchantId) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateAllocation(session.merchantId, session, {
        save_percent: Number(formData.get("save_percent")),
        growth_percent: Number(formData.get("growth_percent")),
        round_up_enabled: formData.get("round_up_enabled") === "on"
      });
      const nextDetail = await getMerchantDetail(session.merchantId, session);
      setDetail(nextDetail);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : translate("failedUpdateAllocation"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard role="merchant">
      <AppShell>
        {detail ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label={translate("operating")} value={`$${detail.wallet.operating_balance.toFixed(2)}`} />
              <StatCard label={translate("savings")} value={`$${detail.wallet.savings_balance.toFixed(2)}`} accent="text-brand-600" />
              <StatCard label={translate("growth")} value={`$${detail.wallet.growth_balance.toFixed(2)}`} accent="text-gold" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="panel p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("smartSplit")}</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">{translate("makeEveryPaymentWorkTwice")}</h2>
                <p className="mt-3 text-sm text-slate-500">{translate("incomingSalesExplain")}</p>
                <form action={handleAllocationUpdate} className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">{translate("savePercent")}</span>
                    <input name="save_percent" type="number" min="0" max="100" step="0.01" defaultValue={detail.wallet.allocation_rule.save_percent} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">{translate("growthPercent")}</span>
                    <input name="growth_percent" type="number" min="0" max="100" step="0.01" defaultValue={detail.wallet.allocation_rule.growth_percent} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                  </label>
                  <label className="col-span-full flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                    <input name="round_up_enabled" type="checkbox" defaultChecked={detail.wallet.allocation_rule.round_up_enabled} />
                    {translate("roundUpEnabled")}
                  </label>
                  <button disabled={saving} className="col-span-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {saving ? translate("saving") : translate("saveAllocationRules")}
                  </button>
                </form>
                {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
              </section>

              <section className="panel p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("trustScore")}</p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-5xl font-semibold text-ink">{detail.trust_score.score}</p>
                    <p className="mt-2 text-lg text-brand-600">{translate(tierKeyMap[detail.trust_score.tier as keyof typeof tierKeyMap] ?? "starter")}</p>
                  </div>
                  <div className="rounded-3xl bg-brand-50 px-5 py-4 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">{translate("whyItMatters")}</p>
                    <p className="mt-2 max-w-xs text-sm text-slate-600">{translate("trustWhyItMattersCopy")}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {Object.entries(detail.trust_score.breakdown).map(([factor, score]) => (
                    <div key={factor}>
                      <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                        <span>{translate(trustFactorKeyMap[factor as keyof typeof trustFactorKeyMap] ?? "paymentFrequency")}</span>
                        <span>{score}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min(score * 5, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <details className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {translate("howScoreWorks")}
                  </summary>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <p>{translate("internalReadinessScore")}</p>
                    <p>{translate("rulesBasedExplainable")}</p>
                    <p>{translate("recalculatedAfterSales")}</p>
                    <p>{translate("notBureauCredit")}</p>
                    <p>{translate("notTaxScore")}</p>
                    <p>{translate("verifiedCountsMore")}</p>
                    <p>{translate("scoreBuiltFrom")}</p>
                    <p>{translate("scoreFormula")}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{translate("verifiedTransactionCount")}</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{detail.trust_score.raw_inputs.verified_transaction_count}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{translate("declaredCashCount")}</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{detail.trust_score.raw_inputs.declared_cash_count}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{translate("weightedActivityCount")}</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{detail.trust_score.raw_inputs.weighted_activity_count.toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{translate("averagePaymentValue")}</p>
                        <p className="mt-1 text-lg font-semibold text-ink">${detail.trust_score.raw_inputs.average_payment_value.toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{translate("savingsRatio")}</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{detail.trust_score.raw_inputs.savings_ratio.toFixed(2)}%</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{translate("activeFraudCount")}</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{detail.trust_score.raw_inputs.active_fraud_count}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{translate("knownDevicePresent")}</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{detail.trust_score.raw_inputs.known_device_present ? translate("yes") : translate("no")}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{translate("lastUpdated")}</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{detail.trust_score.updated_at ? new Date(detail.trust_score.updated_at).toLocaleString() : "-"}</p>
                      </div>
                    </div>
                  </div>
                </details>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <section className="panel p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("offers")}</p>
                    <p className="mt-2 text-sm text-slate-500">{translate("hybridEvidenceHint")}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{translate("evidenceMix")}</p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {detail.evidence_summary.verified_transaction_count} / {detail.evidence_summary.declared_cash_count}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  {detail.offers.length ? detail.offers.map((offer) => (
                    <div key={offer.id} className="rounded-3xl border border-slate-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-ink">{offer.title}</h3>
                          <p className="mt-2 text-sm text-slate-600">{offer.description}</p>
                        </div>
                        <div className="rounded-full bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
                          {offer.quote_amount > 0 ? `$${offer.quote_amount.toFixed(2)}/mo` : translate("nudge")}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-500">{offer.eligibility_reason}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">{translate("noOffersYet")}</p>}
                </div>
              </section>

              <section className="panel p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("recentLedger")}</p>
                <div className="mt-4 space-y-3">
                  {detail.ledger_entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink">{entry.narrative}</p>
                        <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">${entry.amount.toFixed(2)}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{translate(entry.pocket as "operating" | "savings" | "growth")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("growthProjection")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">{translate("pathToFinancialFreedom")}</h2>
              <p className="mt-3 text-sm text-slate-500">{translate("projectedGrowthExplain")}</p>
              <div className="mt-8 h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData}>
                    <defs>
                      <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                    <Tooltip contentStyle={{ borderRadius: "20px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                    <Area type="monotone" dataKey="savings" stroke="#059669" fillOpacity={1} fill="url(#colorSavings)" strokeWidth={2} />
                    <Area type="monotone" dataKey="projected" stroke="#fbbf24" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProjected)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 rounded-3xl bg-slate-900 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">{translate("projectionLogic")}</p>
                    <p className="mt-2 text-lg font-semibold">{translate("bankableMilestone")}</p>
                    <p className="mt-1 text-sm text-slate-400">{translate("creditLimitHint")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">12 {translate("days")}</p>
                    <p className="text-xs uppercase tracking-widest text-slate-400">{translate("daysLeftToLevelUp")}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="panel p-6 text-sm text-slate-500">{error || translate("loadingWallet")}</div>
        )}
      </AppShell>
    </AuthGuard>
  );
}
