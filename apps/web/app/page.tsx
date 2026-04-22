"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAppContext } from "@/components/providers";
import { login, seedDemo } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const { translate, session, setSession } = useAppContext();
  const [email, setEmail] = useState("admin@zbvaka.co.zw");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace(session.role === "admin" ? "/admin/dashboard" : "/merchant/wallet");
    }
  }, [router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await seedDemo();
      const bundle = await login(email, password);
      setSession(bundle);
      toast.success(translate("signInSuccess"));
      router.push(bundle.role === "admin" ? "/admin/dashboard" : "/merchant/wallet");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : translate("loginFailed");
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-hero">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">{translate("appName")}</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
                {translate("landingHeadline")}
              </h1>
            </div>
            <LanguageSwitcher />
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {translate("landingBody")}
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">{translate("receiveNav")}</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{translate("landingCardOneTitle")}</p>
              <p className="mt-2 text-sm text-slate-500">{translate("landingCardOneBody")}</p>
            </div>
            <div className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{translate("evidenceMix")}</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{translate("landingCardTwoTitle")}</p>
              <p className="mt-2 text-sm text-slate-500">{translate("landingCardTwoBody")}</p>
            </div>
            <div className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">{translate("offers")}</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{translate("landingCardThreeTitle")}</p>
              <p className="mt-2 text-sm text-slate-500">{translate("landingCardThreeBody")}</p>
            </div>
          </div>
        </section>
        <section className="panel p-6 sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{translate("login")}</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">{translate("welcomeBack")}</h2>
            <p className="mt-3 text-sm text-slate-500">
              {translate("signInPrompt")}
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">{translate("email")}</span>
              <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-500 focus:ring" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">{translate("password")}</span>
              <input type="password" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-500 focus:ring" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            <button disabled={isLoading} className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {isLoading ? translate("signingIn") : translate("signInCta")}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
