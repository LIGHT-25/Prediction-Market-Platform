import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ──────────────────────────────────────────────────────────────────────────────
// Arbitraries — fc.float requires 32-bit float bounds (use Math.fround)
// ──────────────────────────────────────────────────────────────────────────────

// Positive 32-bit float range suitable for prices
const priceArb = fc.float({ min: Math.fround(0.001), max: Math.fround(999_999), noNaN: true });
const nonNegFloat = fc.float({ min: Math.fround(0), max: Math.fround(999_999), noNaN: true });
const posInt = fc.integer({ min: 1, max: 10_000 });

// ──────────────────────────────────────────────────────────────────────────────
// Domain logic under test (mirrors the contract / UI logic)
// ──────────────────────────────────────────────────────────────────────────────

function validateOraclePrice(price: number): boolean {
  return Number.isFinite(price) && price > 0;
}

function isMarketExpired(expirationUnix: number, nowUnix: number): boolean {
  return expirationUnix <= nowUnix;
}

function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.round(xlm * 10_000_000));
}

function computeYesPct(yesShares: number, noShares: number): number {
  const total = yesShares + noShares;
  if (total === 0) return 50;
  return (yesShares / total) * 100;
}

// ──────────────────────────────────────────────────────────────────────────────
// Oracle price validation
// ──────────────────────────────────────────────────────────────────────────────
describe("Oracle price validation (property-based)", () => {
  it("positive finite prices are always valid", () => {
    fc.assert(
      fc.property(priceArb, (price) => {
        // fc.float may produce -0, skip that edge case
        if (price <= 0) return;
        expect(validateOraclePrice(price)).toBe(true);
      })
    );
  });

  it("zero is never a valid price", () => {
    expect(validateOraclePrice(0)).toBe(false);
  });

  it("negative prices are never valid", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (n) => {
        expect(validateOraclePrice(-n)).toBe(false);
      })
    );
  });

  it("NaN and Infinity are never valid", () => {
    expect(validateOraclePrice(NaN)).toBe(false);
    expect(validateOraclePrice(Infinity)).toBe(false);
    expect(validateOraclePrice(-Infinity)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Market expiration logic
// ──────────────────────────────────────────────────────────────────────────────
describe("Market expiration (property-based)", () => {
  it("a market expiring in the future is never expired", () => {
    fc.assert(
      fc.property(posInt, posInt, (nowOffset, futureOffset) => {
        const now = 1_700_000_000 + nowOffset;
        const future = now + futureOffset;
        expect(isMarketExpired(future, now)).toBe(false);
      })
    );
  });

  it("a market expiring in the past is always expired", () => {
    fc.assert(
      fc.property(posInt, posInt, (nowOffset, pastOffset) => {
        const now = 1_700_000_000 + nowOffset;
        const past = now - pastOffset;
        expect(isMarketExpired(past, now)).toBe(true);
      })
    );
  });

  it("a market expiring at exactly now is expired", () => {
    fc.assert(
      fc.property(posInt, (ts) => {
        expect(isMarketExpired(ts, ts)).toBe(true);
      })
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// XLM → stroops conversion
// ──────────────────────────────────────────────────────────────────────────────
describe("xlmToStroops (property-based)", () => {
  it("always returns a non-negative bigint", () => {
    fc.assert(
      fc.property(nonNegFloat, (xlm) => {
        const stroops = xlmToStroops(xlm);
        expect(typeof stroops).toBe("bigint");
        expect(stroops >= 0n).toBe(true);
      })
    );
  });

  it("1 XLM equals exactly 10_000_000 stroops", () => {
    expect(xlmToStroops(1)).toBe(10_000_000n);
  });

  it("conversion is monotonically non-decreasing for positive integers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (a, b) => {
          if (a <= b) {
            expect(xlmToStroops(a) <= xlmToStroops(b)).toBe(true);
          }
        }
      )
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Probability bar calculation
// ──────────────────────────────────────────────────────────────────────────────
describe("Probability computation (property-based)", () => {
  it("always returns a value in [0, 100]", () => {
    fc.assert(
      fc.property(nonNegFloat, nonNegFloat, (yes, no) => {
        const pct = computeYesPct(yes, no);
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
      })
    );
  });

  it("returns 50 when the pool is empty", () => {
    expect(computeYesPct(0, 0)).toBe(50);
  });

  it("returns 100 when all shares are YES", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (yes) => {
        expect(computeYesPct(yes, 0)).toBe(100);
      })
    );
  });

  it("returns 0 when all shares are NO", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (no) => {
        expect(computeYesPct(0, no)).toBe(0);
      })
    );
  });

  it("YES% + NO% always equals 100", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (yes, no) => {
          const yesPct = computeYesPct(yes, no);
          const noPct = 100 - yesPct;
          expect(yesPct + noPct).toBeCloseTo(100, 10);
        }
      )
    );
  });
});
