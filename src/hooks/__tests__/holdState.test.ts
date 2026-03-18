import { describe, it, expect } from "bun:test";

type HoldState = "idle" | "oneHolding" | "bothHolding" | "sealed";

function deriveHoldState(
  status: "negotiating" | "sealed",
  myHoldStart: number | null,
  otherHoldStart: number | null
): HoldState {
  if (status === "sealed") return "sealed";
  if (myHoldStart !== null && otherHoldStart !== null) return "bothHolding";
  if (myHoldStart !== null || otherHoldStart !== null) return "oneHolding";
  return "idle";
}

describe("deriveHoldState", () => {
  it("returns idle when nothing is held", () => {
    expect(deriveHoldState("negotiating", null, null)).toBe("idle");
  });
  it("returns oneHolding when only self is holding", () => {
    expect(deriveHoldState("negotiating", 1000, null)).toBe("oneHolding");
  });
  it("returns oneHolding when only other is holding", () => {
    expect(deriveHoldState("negotiating", null, 1000)).toBe("oneHolding");
  });
  it("returns bothHolding when both are holding", () => {
    expect(deriveHoldState("negotiating", 1000, 2000)).toBe("bothHolding");
  });
  it("returns sealed regardless of hold state when contract is sealed", () => {
    expect(deriveHoldState("sealed", 1000, 2000)).toBe("sealed");
  });
});
