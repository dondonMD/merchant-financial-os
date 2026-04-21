"use client";

import Link from "next/link";
import { useState } from "react";
import { onboardMerchant } from "@/lib/api";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAppContext } from "@/components/providers";

export default function MerchantOnboardingPage() {
  const { translate } = useAppContext();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setMessage("");
    setError("");
    try {
      const payload = Object.fromEntries(formData.entries()) as Record<string, string>;
      const result = await onboardMerchant(payload);
      setMessage(`${translate("merchantCreated")} ${result.merchant_id}. ${translate("loginWith")} ${result.user_email}.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : translate("failedOnboardMerchant"));
    }
  }

  return (
    <main className="min-h-screen bg-hero px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">{translate("appName")}</p>
            <h1 className="mt-2 text-4xl font-semibold text-ink">{translate("merchantOnboarding")}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
              {translate("backToLogin")}
            </Link>
          </div>
        </div>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("merchantOnboarding")}</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">{translate("createMerchantProfile")}</h2>
          <form action={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
            <input name="full_name" placeholder={translate("fullName")} className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="phone" placeholder={translate("phone")} className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="business_name" placeholder={translate("businessName")} className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="business_type" placeholder={translate("businessType")} className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="national_id" placeholder={translate("nationalId")} className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="location" placeholder={translate("location")} className="rounded-2xl border border-slate-200 px-4 py-3" />
            <select name="language_preference" defaultValue="en" className="rounded-2xl border border-slate-200 px-4 py-3">
              <option value="en">{translate("languageEnglish")}</option>
              <option value="sn">{translate("languageShona")}</option>
              <option value="nd">{translate("languageNdebele")}</option>
            </select>
            <input name="device_id" placeholder={translate("deviceId")} className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="email" placeholder={translate("loginEmail")} className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="password" type="password" placeholder={translate("password")} className="rounded-2xl border border-slate-200 px-4 py-3" />
            <button className="col-span-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">{translate("createMerchant")}</button>
          </form>
          {message ? <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        </div>
      </div>
    </main>
  );
}
