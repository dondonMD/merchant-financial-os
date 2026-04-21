import { describe, it, expect, beforeEach, vi } from "vitest";
import { getStoredSession, setStoredSession } from "./session";
import type { Session } from "./types";

describe("session utility", () => {
  const mockSession: Session = {
    accessToken: "test-token",
    refreshToken: "test-refresh",
    role: "merchant",
    merchantId: 123
  };

  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it("returns null if no session is stored", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    expect(getStoredSession()).toBeNull();
  });

  it("returns parsed session if stored", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockSession));
    expect(getStoredSession()).toEqual(mockSession);
  });

  it("stores session correctly", () => {
    setStoredSession(mockSession);
    expect(localStorage.setItem).toHaveBeenCalledWith("zb-vaka-session", JSON.stringify(mockSession));
  });

  it("removes session correctly", () => {
    setStoredSession(null);
    expect(localStorage.removeItem).toHaveBeenCalledWith("zb-vaka-session");
  });
});
