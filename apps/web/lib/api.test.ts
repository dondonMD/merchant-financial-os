import { describe, expect, it } from "vitest";

import { normalizeCashSalePayload } from "./api";

describe("normalizeCashSalePayload", () => {
  it("drops blank optional text fields from cash-sale payloads", () => {
    expect(
      normalizeCashSalePayload({
        amount: 12.5,
        payer_name: "   ",
        payer_phone: "",
        category: "produce",
        note: " ",
        location: "Harare",
        device_id: "merchant-device-01",
        recorded_at: "2026-04-22T10:30",
      }),
    ).toEqual({
      amount: 12.5,
      payer_name: undefined,
      payer_phone: undefined,
      category: "produce",
      note: undefined,
      location: "Harare",
      device_id: "merchant-device-01",
      recorded_at: "2026-04-22T10:30",
    });
  });

  it("keeps populated optional text fields after trimming", () => {
    expect(
      normalizeCashSalePayload({
        amount: 12.5,
        payer_name: " Demo Customer ",
        payer_phone: " +263778000000 ",
        category: "produce",
        note: " cash sale ",
        location: "Harare",
        device_id: "merchant-device-01",
        recorded_at: "2026-04-22T10:30",
      }),
    ).toEqual({
      amount: 12.5,
      payer_name: "Demo Customer",
      payer_phone: "+263778000000",
      category: "produce",
      note: "cash sale",
      location: "Harare",
      device_id: "merchant-device-01",
      recorded_at: "2026-04-22T10:30",
    });
  });
});
