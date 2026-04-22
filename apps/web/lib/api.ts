import type { AdminDashboard, MerchantDetail, PaymentResult, ReceiptDetail, Session } from "./types";

type CashSalePayload = {
  amount: number;
  payer_name?: string;
  payer_phone?: string;
  category: string;
  note?: string;
  location: string;
  device_id: string;
  recorded_at: string;
};

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";
    return `http://${host}:8000/api/v1`;
  }
  return "http://localhost:8000/api/v1";
}

async function request<T>(path: string, init?: RequestInit, accessToken?: string): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const payload = (await response.json()) as { success: boolean; data: T; error?: string; detail?: string };
  if (!response.ok || !payload.success) {
    throw new Error(payload.detail ?? payload.error ?? "Request failed");
  }
  return payload.data;
}

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeCashSalePayload(payload: CashSalePayload): CashSalePayload {
  return {
    ...payload,
    payer_name: normalizeOptionalText(payload.payer_name),
    payer_phone: normalizeOptionalText(payload.payer_phone),
    note: normalizeOptionalText(payload.note),
  };
}

export async function seedDemo() {
  return request<{ seeded: boolean }>("/seed", { method: "POST" });
}

export async function login(email: string, password: string) {
  const data = await request<{
    access_token: string;
    refresh_token: string;
    role: Session["role"];
    merchant_id: number | null;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    role: data.role,
    merchantId: data.merchant_id
  } satisfies Session;
}

export async function refresh(refreshToken: string) {
  const data = await request<{
    access_token: string;
    role: Session["role"];
    merchant_id: number | null;
  }>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  return {
    accessToken: data.access_token,
    role: data.role,
    merchantId: data.merchant_id
  };
}

export async function logout(refreshToken: string) {
  return request<{ logged_out: boolean }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });
}

export async function onboardMerchant(payload: Record<string, string>) {
  return request<{ merchant_id: number; user_email: string }>("/merchants/onboard", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getMerchantDetail(merchantId: number, session: Session) {
  return request<MerchantDetail>(`/merchants/${merchantId}`, undefined, session.accessToken);
}

export async function updateAllocation(merchantId: number, session: Session, payload: { save_percent: number; growth_percent: number; round_up_enabled: boolean }) {
  return request<{ updated: boolean }>(`/merchants/${merchantId}/allocation`, {
    method: "PUT",
    body: JSON.stringify(payload)
  }, session.accessToken);
}

export async function simulatePayment(session: Session, payload: Record<string, string | number>) {
  return request<PaymentResult>("/payments/mock", {
    method: "POST",
    body: JSON.stringify(payload)
  }, session.accessToken);
}

export async function recordCashSale(
  session: Session,
  payload: CashSalePayload
) {
  return request<PaymentResult>("/payments/cash", {
    method: "POST",
    body: JSON.stringify(normalizeCashSalePayload(payload))
  }, session.accessToken);
}

export async function getReceipt(transactionId: number, session: Session) {
  return request<ReceiptDetail>(`/receipts/${transactionId}`, undefined, session.accessToken);
}

export async function getAdminDashboard(session: Session) {
  return request<AdminDashboard>("/admin/dashboard", undefined, session.accessToken);
}
