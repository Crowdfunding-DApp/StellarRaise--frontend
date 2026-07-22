import { describe, expect, it } from "vitest";

import { DEADLINE_APPROACHING_WINDOW_MS } from "../hooks";
import { isDeadlineApproaching, isRefundEligible } from "../predicates";
import type { Campaign } from "@/lib/soroban";

function makeCampaign(
  overrides: Partial<Campaign> = {}
): Campaign {
  return {
    id: "c1",
    title: "Test",
    description: "",
    raised: 0,
    goal: 1000,
    deadline: new Date(Date.now() + 60_000).toISOString(),
    image: "",
    ...overrides,
  };
}

describe("isDeadlineApproaching", () => {
  const now = 1_700_000_000_000;

  it("is true when deadline is within the approaching window", () => {
    const c = makeCampaign({
      deadline: new Date(now + DEADLINE_APPROACHING_WINDOW_MS - 1000).toISOString(),
    });
    expect(isDeadlineApproaching(c, now)).toBe(true);
  });

  it("is false when deadline is far in the future", () => {
    const c = makeCampaign({
      deadline: new Date(now + DEADLINE_APPROACHING_WINDOW_MS + 60_000).toISOString(),
    });
    expect(isDeadlineApproaching(c, now)).toBe(false);
  });

  it("is false when deadline has already passed", () => {
    const c = makeCampaign({
      deadline: new Date(now - 1000).toISOString(),
    });
    expect(isDeadlineApproaching(c, now)).toBe(false);
  });

  it("is false for invalid deadline strings", () => {
    const c = makeCampaign({ deadline: "not-a-date" });
    expect(isDeadlineApproaching(c, now)).toBe(false);
  });

  it("rejects falsy input defensively", () => {
    // @ts-expect-error – runtime guard
    expect(isDeadlineApproaching(null, now)).toBe(false);
  });
});

describe("isRefundEligible", () => {
  const now = 1_700_000_000_000;

  it("is true when deadline passed and goal not met", () => {
    const c = makeCampaign({
      deadline: new Date(now - 1000).toISOString(),
      raised: 100,
      goal: 1000,
    });
    expect(isRefundEligible(c, now)).toBe(true);
  });

  it("is false when deadline passed but goal was met", () => {
    const c = makeCampaign({
      deadline: new Date(now - 1000).toISOString(),
      raised: 1000,
      goal: 1000,
    });
    expect(isRefundEligible(c, now)).toBe(false);
  });

  it("is false when deadline is still in the future", () => {
    const c = makeCampaign({
      deadline: new Date(now + 60_000).toISOString(),
      raised: 0,
      goal: 1000,
    });
    expect(isRefundEligible(c, now)).toBe(false);
  });

  it("is false for campaigns with zero / negative goal", () => {
    const c = makeCampaign({
      deadline: new Date(now - 1000).toISOString(),
      goal: 0,
    });
    expect(isRefundEligible(c, now)).toBe(false);
  });

  it("is false for invalid deadlines", () => {
    const c = makeCampaign({ deadline: "not-a-date" });
    expect(isRefundEligible(c, now)).toBe(false);
  });

  it("rejects falsy input defensively", () => {
    // @ts-expect-error – runtime guard
    expect(isRefundEligible(undefined, now)).toBe(false);
  });
});
