"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { useAppContext } from "./providers";
import { LanguageSwitcher } from "./language-switcher";
import { PulseFeed } from "./pulse-feed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, setSession, translate } = useAppContext();

  const merchantLinks = [
    { href: "/merchant/wallet", label: translate("walletNav") },
    { href: "/merchant/receive", label: translate("receiveNav") },
    { href: "/merchant/transactions", label: translate("transactionsNav") },
    { href: "/merchant/onboarding", label: translate("onboardNav") }
  ];

  async function handleLogout() {
    if (session) {
      try {
        await logout(session.refreshToken);
      } catch {
        // Keep local state clean even if the API call fails.
      }
    }
    setSession(null);
    router.replace("/");
  }

  const links = session?.role === "admin"
    ? [{ href: "/admin/dashboard", label: translate("judgeDashboard") }]
    : merchantLinks;

  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">{translate("appName")}</p>
            <h1 className="text-lg font-semibold text-ink">{translate("merchantOperatingSystem")}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white" onClick={handleLogout}>
              {translate("logout")}
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-6 overflow-y-auto">
          <div className="panel p-4">
            <nav className="space-y-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium ${pathname === link.href ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <PulseFeed />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
