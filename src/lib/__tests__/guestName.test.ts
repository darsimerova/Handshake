import { describe, it, expect, beforeEach } from "bun:test";

// Minimal localStorage mock (bun:test runs in Node/Bun without DOM)
const store: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
} as Storage;

// Import after mock is set up
import { getGuestName, setGuestName } from "../session";

beforeEach(() => {
  for (const k in store) delete store[k];
});

describe("guest name helpers", () => {
  it("returns null when no name has been set", () => {
    expect(getGuestName()).toBeNull();
  });

  it("returns the stored name after setGuestName", () => {
    setGuestName("Alice");
    expect(getGuestName()).toBe("Alice");
  });

  it("stores empty string for skip", () => {
    setGuestName("");
    expect(getGuestName()).toBe("");
  });

  it("overwrites a previous name", () => {
    setGuestName("Bob");
    setGuestName("Robert");
    expect(getGuestName()).toBe("Robert");
  });
});
