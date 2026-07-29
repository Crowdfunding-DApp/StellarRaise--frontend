import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  NotificationService,
  __setNotificationServiceForTests,
  getNotificationService,
} from "../service";
import { loadPreferences } from "../storage";

import type {
  NotificationChannel,
  NotificationChannelId,
  NotificationDeliveryRecord,
  NotificationEvent,
  NotificationPreferences,
} from "../types";

function makePrefs(
  walletAddress: string,
  overrides: Partial<NotificationPreferences> = {}
): NotificationPreferences {
  return {
    walletAddress,
    email: "user@example.com",
    consent: true,
    consentTimestamp: 1700000000000,
    channels: ["email", "push"],
    updatedAt: 1700000000000,
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<NotificationEvent> = {}
): NotificationEvent {
  return {
    type: "campaign.deadline_approaching",
    walletAddress: "WALLET-A",
    campaignId: "campaign-1",
    campaignTitle: "Test Campaign",
    campaignDeadline: "2030-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function stubChannel(
  id: NotificationChannelId,
  options: {
    impl?: (
      event: NotificationEvent,
      prefs: NotificationPreferences
    ) => Promise<NotificationDeliveryRecord>;
  } = {}
): NotificationChannel {
  return {
    id,
    async send(event, prefs) {
      if (options.impl) return options.impl(event, prefs);
      return {
        eventType: event.type,
        channel: id,
        status: "sent",
        timestamp: Date.now(),
      };
    },
  };
}

function throwingChannel(id: NotificationChannelId): NotificationChannel {
  return {
    id,
    async send() {
      throw new Error("boom");
    },
  };
}

describe("NotificationService – register", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __setNotificationServiceForTests(null);
  });

  it("rejects without wallet", () => {
    const svc = new NotificationService();
    const r = svc.register(null, "user@example.com", true);
    expect(r.ok).toBe(false);
  });

  it("rejects invalid email", () => {
    const svc = new NotificationService();
    const r = svc.register("WALLET-A", "not-an-email", true);
    expect(r.ok).toBe(false);
  });

  it("rejects when consent is false", () => {
    const svc = new NotificationService();
    const r = svc.register("WALLET-A", "user@example.com", false);
    expect(r.ok).toBe(false);
  });

  it("persists preferences on success", () => {
    const svc = new NotificationService();
    const r = svc.register("WALLET-A", "User@Example.COM", true);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.prefs.email).toBe("user@example.com");
      expect(r.prefs.consent).toBe(true);
      expect(r.prefs.consentTimestamp).toBeGreaterThan(0);
    }
    expect(loadPreferences("WALLET-A")?.email).toBe("user@example.com");
  });

  it("duplicate registration updates email but preserves consent timestamp", async () => {
    const svc = new NotificationService();
    const first = svc.register("WALLET-A", "first@example.com", true);
    expect(first.ok).toBe(true);
    const firstTs = first.ok ? first.prefs.consentTimestamp : 0;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = svc.register("WALLET-A", "second@example.com", true);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.prefs.email).toBe("second@example.com");
      expect(second.prefs.consentTimestamp).toBe(firstTs);
      expect(second.prefs.updatedAt).toBeGreaterThanOrEqual(firstTs);
    }
  });

  it("logs nothing when storage is missing the raw email", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const setSpy = vi
      .spyOn(window.localStorage.__proto__, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    const svc = new NotificationService();
    svc.register("WALLET-A", "secret@private.io", true);
    const messages = warn.mock.calls.map((c) => String(c[0] ?? ""));
    for (const m of messages) {
      expect(m).not.toContain("secret@private.io");
    }
    setSpy.mockRestore();
    warn.mockRestore();
  });
});

describe("NotificationService – update", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __setNotificationServiceForTests(null);
  });

  it("rejects when no existing record", () => {
    const svc = new NotificationService();
    const r = svc.update("WALLET-A", { email: "x@example.com" });
    expect(r.ok).toBe(false);
  });

  it("updates a single field", () => {
    const svc = new NotificationService();
    svc.register("WALLET-A", "user@example.com", true);
    const r = svc.update("WALLET-A", { email: "Updated@Example.COM" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.prefs.email).toBe("updated@example.com");
  });

  it("rejects invalid patched email", () => {
    const svc = new NotificationService();
    svc.register("WALLET-A", "user@example.com", true);
    const r = svc.update("WALLET-A", { email: "bad" });
    expect(r.ok).toBe(false);
  });

  it("filters channels to valid ids only", () => {
    const svc = new NotificationService();
    svc.register("WALLET-A", "user@example.com", true);
    const r = svc.update("WALLET-A", {
      // @ts-expect-error – testing runtime defense against bad input
      channels: ["email", "sms"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.prefs.channels).toEqual(["email"]);
  });

  it("rejects consent=false to prevent silent data deletion", () => {
    const svc = new NotificationService();
    svc.register("WALLET-A", "user@example.com", true);
    const r = svc.update("WALLET-A", { consent: false });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/optOut/i);
    }
    // Preferences are still intact.
    expect(loadPreferences("WALLET-A")).not.toBeNull();
  });
});

describe("NotificationService – optOut", () => {
  beforeEach(() => window.localStorage.clear());

  it("removes preferences", () => {
    const svc = new NotificationService();
    svc.register("WALLET-A", "user@example.com", true);
    const r = svc.optOut("WALLET-A");
    expect(r.ok).toBe(true);
    expect(loadPreferences("WALLET-A")).toBeNull();
  });

  it("fails without wallet", () => {
    const svc = new NotificationService();
    const r = svc.optOut(null);
    expect(r.ok).toBe(false);
  });
});

describe("NotificationService – dispatch", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __setNotificationServiceForTests(null);
  });

  it("returns no records when no preferences exist", async () => {
    const svc = new NotificationService([stubChannel("email")]);
    const records = await svc.dispatch(makeEvent());
    expect(records).toEqual([]);
  });

  it("returns no records when consent is false", async () => {
    new NotificationService().register("WALLET-A", "user@example.com", true);
    window.localStorage.setItem(
      "stellarraise:notifications:prefs:WALLET-A",
      JSON.stringify(makePrefs("WALLET-A", { consent: false }))
    );
    const svc = new NotificationService([stubChannel("email")]);
    const records = await svc.dispatch(makeEvent());
    expect(records).toEqual([]);
  });

  it("dispatches to every enabled channel", async () => {
    new NotificationService().register("WALLET-A", "user@example.com", true);
    // Default register only enables email; explicitly add push for this test.
    new NotificationService().update("WALLET-A", {
      channels: ["email", "push"],
    });
    const svc = new NotificationService([
      stubChannel("email"),
      stubChannel("push"),
    ]);
    const records = await svc.dispatch(makeEvent());
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.channel).sort()).toEqual(["email", "push"]);
  });

  it("skips channels the user has not enabled", async () => {
    new NotificationService().register("WALLET-A", "user@example.com", true);
    window.localStorage.setItem(
      "stellarraise:notifications:prefs:WALLET-A",
      JSON.stringify(makePrefs("WALLET-A", { channels: ["email"] }))
    );
    const svc = new NotificationService([
      stubChannel("email"),
      stubChannel("push"),
    ]);
    const records = await svc.dispatch(makeEvent());
    expect(records).toHaveLength(1);
    expect(records[0].channel).toBe("email");
  });

  it("records a failed delivery when a channel throws", async () => {
    new NotificationService().register("WALLET-A", "user@example.com", true);
    const svc = new NotificationService([throwingChannel("email")]);
    const records = await svc.dispatch(makeEvent());
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("failed");
    expect(records[0].errorCode).toBe("CHANNEL_EXCEPTION");
  });

  it("deadline + refund events each dispatch once", async () => {
    new NotificationService().register("WALLET-A", "user@example.com", true);
    new NotificationService().update("WALLET-A", {
      channels: ["email", "push"],
    });
    const svc = new NotificationService([stubChannel("email"), stubChannel("push")]);
    const deadlineEvent = makeEvent({ type: "campaign.deadline_approaching" });
    const refundEvent = makeEvent({ type: "campaign.refund_eligible" });
    const a = await svc.dispatch(deadlineEvent);
    const b = await svc.dispatch(refundEvent);
    expect(a[0].status).toBe("sent");
    expect(b[0].status).toBe("sent");
    expect(a[0].eventType).toBe("campaign.deadline_approaching");
    expect(b[0].eventType).toBe("campaign.refund_eligible");
  });
});

describe("NotificationService – singleton", () => {
  it("returns the same instance on repeated calls", () => {
    __setNotificationServiceForTests(null);
    const a = getNotificationService();
    const b = getNotificationService();
    expect(a).toBe(b);
    __setNotificationServiceForTests(null);
  });
});
