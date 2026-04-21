export type Role = "merchant" | "admin";
export type EvidenceSource = "verified_qr" | "declared_cash";

export type Session = {
  accessToken: string;
  refreshToken: string;
  role: Role;
  merchantId: number | null;
};

export type TrustRawInputs = {
  verified_transaction_count: number;
  declared_cash_count: number;
  weighted_activity_count: number;
  average_payment_value: number;
  savings_ratio: number;
  active_fraud_count: number;
  known_device_present: boolean;
  verified_activity_value: number;
  declared_activity_value: number;
  total_activity_value: number;
};

export type TrustScore = {
  score: number;
  tier: string;
  breakdown: Record<string, number>;
  raw_inputs: TrustRawInputs;
  updated_at: string | null;
};

export type TransactionSummary = {
  id: number;
  amount: number;
  status: string;
  reference: string;
  external_reference: string;
  payer_name: string;
  payer_phone: string;
  category: string | null;
  note: string | null;
  evidence_source: EvidenceSource;
  evidence_confidence: number;
  evidence_label: string;
  created_at: string;
  recorded_at: string;
};

export type MerchantDetail = {
  merchant: {
    id: number;
    full_name: string;
    business_name: string;
    business_type: string;
    location: string;
    phone: string;
    language_preference: "en" | "sn" | "nd";
  };
  wallet: {
    operating_balance: number;
    savings_balance: number;
    growth_balance: number;
    currency: string;
    allocation_rule: {
      save_percent: number;
      growth_percent: number;
      round_up_enabled: boolean;
    };
  };
  trust_score: TrustScore;
  offers: Array<{
    id: number;
    offer_type: string;
    title: string;
    description: string;
    eligibility_reason: string;
    quote_amount: number;
    status: string;
  }>;
  fraud_alerts: Array<{
    id: number;
    severity: string;
    rule_code: string;
    message: string;
    status: string;
    created_at: string;
  }>;
  transactions: TransactionSummary[];
  ledger_entries: Array<{
    id: number;
    pocket: string;
    entry_type: string;
    amount: number;
    balance_after: number;
    narrative: string;
    created_at: string;
  }>;
  evidence_summary: {
    verified_transaction_count: number;
    declared_cash_count: number;
    verified_activity_value: number;
    declared_activity_value: number;
  };
  qr_profile: {
    merchant_id: number;
    business_name: string;
    qr_payload: string;
  };
};

export type PaymentResult = {
  transaction: {
    id: number;
    reference: string;
    amount: number;
    evidence_source: EvidenceSource;
    evidence_confidence: number;
    evidence_label: string;
    created_at: string;
  };
  receipt: { receipt_number: string; payload: Record<string, unknown> };
  allocation: Record<string, number>;
  trust_score: TrustScore;
  offers_count: number;
  fraud_alerts_count: number;
};

export type ReceiptDetail = {
  receipt_number: string;
  payload: Record<string, unknown>;
  created_at: string;
  evidence_source: EvidenceSource | null;
  evidence_confidence: number | null;
  evidence_label: string | null;
};

export type AdminDashboard = {
  metrics: {
    total_merchants: number;
    total_processed_payments: number;
    active_offers: number;
    open_fraud_alerts: number;
    verified_activity_value: number;
    declared_activity_value: number;
  };
  allocation_distribution: Record<string, number>;
  evidence_distribution: {
    amounts: Record<EvidenceSource, number>;
    counts: Record<EvidenceSource, number>;
  };
  trust_distribution: Record<string, number>;
  recent_transactions: Array<TransactionSummary & { merchant_id: number }>;
  fraud_alerts: Array<{
    id: number;
    merchant_id: number;
    rule_code: string;
    message: string;
    severity: string;
  }>;
  merchants: Array<{
    id: number;
    business_name: string;
    business_type: string;
    location: string;
  }>;
};
