"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { languages, t, type SupportedLanguage } from "@zb-vaka/i18n";
import { Toaster } from "sonner";
import { getStoredSession, setStoredSession } from "@/lib/session";
import type { Session } from "@/lib/types";

type AppContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  session: Session | null;
  setSession: (session: Session | null) => void;
  translate: (key: Parameters<typeof t>[1]) => string;
  languages: typeof languages;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("zb-vaka-language") as SupportedLanguage | null;
    if (storedLanguage) {
      setLanguageState(storedLanguage);
    }
    setSessionState(getStoredSession());
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    language,
    setLanguage: (nextLanguage) => {
      setLanguageState(nextLanguage);
      window.localStorage.setItem("zb-vaka-language", nextLanguage);
    },
    session,
    setSession: (nextSession) => {
      setSessionState(nextSession);
      setStoredSession(nextSession);
    },
    translate: (key) => t(language, key),
    languages
  }), [language, session]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <Toaster position="top-right" richColors />
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("App context unavailable");
  }
  return context;
}
