const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { calculateFineGold } = require("../src/service/fine-gold.service");

describe("fine-gold calculation service", () => {
  it("calculates 120.000g at 91.60% as 109.920g", () => {
    assert.equal(
      calculateFineGold({ grossWeight: "120.000", purity: "91.60" }).fineWeight,
      "109.920",
    );
  });

  it("calculates 112.450g at 91.60% as 103.004g", () => {
    assert.equal(
      calculateFineGold({ grossWeight: "112.450", purity: "91.60" }).fineWeight,
      "103.004",
    );
  });

  it("calculates 3.300g at 91.60% as 3.023g", () => {
    assert.equal(
      calculateFineGold({ grossWeight: "3.300", purity: "91.60" }).fineWeight,
      "3.023",
    );
  });

  it("rejects zero and negative gross weights", () => {
    assert.throws(
      () => calculateFineGold({ grossWeight: "0", purity: "91.60" }),
      /grossWeight must be greater than 0/,
    );
    assert.throws(
      () => calculateFineGold({ grossWeight: "-0.001", purity: "91.60" }),
      /grossWeight must be greater than 0/,
    );
  });

  it("rejects purity outside 0 through 100", () => {
    assert.throws(
      () => calculateFineGold({ grossWeight: "1", purity: "-0.01" }),
      /purity must be between 0 and 100/,
    );
    assert.throws(
      () => calculateFineGold({ grossWeight: "1", purity: "100.01" }),
      /purity must be between 0 and 100/,
    );
  });

  it("rounds decimal precision edges half up and preserves three places", () => {
    assert.equal(
      calculateFineGold({ grossWeight: "1.000", purity: "0.15005" }).fineWeight,
      "0.002",
    );
    assert.equal(
      calculateFineGold({ grossWeight: "0.001", purity: "100" }).fineWeight,
      "0.001",
    );
    assert.equal(
      calculateFineGold({ grossWeight: "0.0004", purity: "100" }).fineWeight,
      "0.000",
    );
    assert.equal(
      calculateFineGold({ grossWeight: "100000000000.123456789", purity: "99.999999" }).fineWeight,
      "99999999000.123",
    );
  });

  it("requires decimal strings", () => {
    assert.throws(
      () => calculateFineGold({ grossWeight: 120, purity: "91.60" }),
      /grossWeight must be a decimal string/,
    );
    assert.throws(
      () => calculateFineGold({ grossWeight: "1", purity: "not-a-number" }),
      /purity must be a valid decimal string/,
    );
  });
});
