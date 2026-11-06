const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { calculateWastage } = require("../src/service/wastage.service");

function result(issued, returned, allowed) {
  return calculateWastage({
    issuedFineGold: issued,
    returnedFineGold: returned,
    allowedWastagePercent: allowed,
  });
}

describe("wastage calculation service", () => {
  it("calculates wastage within the configured limit", () => {
    const calculation = result("100.000", "98.000", "3.000");
    assert.equal(calculation.actualDifference.toFixed(3), "2.000");
    assert.equal(calculation.allowedWastage.toFixed(3), "3.000");
    assert.equal(calculation.excessWastage.toFixed(3), "0.000");
  });

  it("calculates exactly-at-limit wastage without an alert amount", () => {
    const calculation = result("100.000", "97.000", "3.000");
    assert.equal(calculation.actualDifference.toFixed(3), "3.000");
    assert.equal(calculation.excessWastage.toFixed(3), "0.000");
  });

  it("calculates excess wastage with Decimal arithmetic", () => {
    const calculation = result("100.000", "96.500", "3.000");
    assert.equal(calculation.allowedWastage.toFixed(3), "3.000");
    assert.equal(calculation.excessWastage.toFixed(3), "0.500");
  });

  it("supports partial returns as provisional calculations", () => {
    const calculation = result("109.920", "50.000", "2.750");
    assert.equal(calculation.actualDifference.toFixed(3), "59.920");
    assert.equal(calculation.allowedWastage.toFixed(3), "3.023");
    assert.equal(calculation.excessWastage.toFixed(3), "56.897");
  });

  it("calculates completed-job values from the final returned amount", () => {
    const calculation = result("112.450", "109.000", "2.000");
    assert.equal(calculation.actualDifference.toFixed(3), "3.450");
    assert.equal(calculation.allowedWastage.toFixed(3), "2.249");
    assert.equal(calculation.excessWastage.toFixed(3), "1.201");
  });
});
