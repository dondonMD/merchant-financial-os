"use client";

import { evidenceBadgeClassName, evidenceLabelKey } from "@/lib/labels";
import type { EvidenceSource } from "@/lib/types";
import { useAppContext } from "./providers";

export function EvidenceBadge({ source }: { source: EvidenceSource }) {
  const { translate } = useAppContext();

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${evidenceBadgeClassName(source)}`}>
      {translate(evidenceLabelKey(source))}
    </span>
  );
}
