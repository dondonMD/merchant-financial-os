"use client";

import { useAppContext } from "./providers";

export function LanguageSwitcher() {
  const { language, setLanguage, languages, translate } = useAppContext();

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{translate("language")}</span>
      <select
        aria-label="Language"
        className="min-w-0 bg-transparent text-sm font-medium text-slate-700 outline-none"
        value={language}
        onChange={(event) => setLanguage(event.target.value as keyof typeof languages)}
      >
        {Object.entries(languages).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
