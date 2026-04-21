import type { EvidenceSource } from "./types";

export const trustFactorKeyMap = {
  payment_frequency: "paymentFrequency",
  average_ticket_strength: "averageTicketStrength",
  repeat_activity: "repeatActivity",
  savings_discipline: "savingsDiscipline",
  risk_signal_score: "riskSignalScore",
  account_maturity: "accountMaturity",
  device_continuity: "deviceContinuity"
} as const;

export const tierKeyMap = {
  Starter: "starter",
  Growing: "growing",
  Trusted: "trusted",
  Bankable: "bankable"
} as const;

export function evidenceLabelKey(source: EvidenceSource) {
  return source === "verified_qr" ? "verifiedQr" : "declaredCash";
}

export function settlementLabelKey(source: EvidenceSource) {
  return source === "verified_qr" ? "verifiedSettlement" : "merchantDeclaredRecord";
}

export function evidenceBadgeClassName(source: EvidenceSource) {
  return source === "verified_qr"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800";
}
