const { Prisma } = require("@prisma/client");

const FINE_GOLD_SCALE = 3;

/**
 * Calculates fine gold using decimal arithmetic only.
 *
 * The final value is rounded to three decimal places with ROUND_HALF_UP:
 * a fourth decimal digit of 5 or greater rounds the third decimal digit up.
 * Inputs and outputs are decimal strings so binary floating-point arithmetic
 * is never involved in accounting calculations.
 */
function calculateFineGold({ grossWeight, purity }) {
  const grossWeightDecimal = parseDecimalString(grossWeight, "grossWeight");
  const purityDecimal = parseDecimalString(purity, "purity");

  if (!grossWeightDecimal.gt(0)) {
    throw new RangeError("grossWeight must be greater than 0");
  }

  if (purityDecimal.lt(0) || purityDecimal.gt(100)) {
    throw new RangeError("purity must be between 0 and 100");
  }

  const fineWeight = grossWeightDecimal
    .mul(purityDecimal)
    .div(100)
    .toDecimalPlaces(FINE_GOLD_SCALE, Prisma.Decimal.ROUND_HALF_UP);

  return {
    grossWeight: grossWeightDecimal.toString(),
    purity: purityDecimal.toString(),
    fineWeight: fineWeight.toFixed(FINE_GOLD_SCALE),
  };
}

function parseDecimalString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a decimal string`);
  }

  try {
    return new Prisma.Decimal(value.trim());
  } catch {
    throw new TypeError(`${fieldName} must be a valid decimal string`);
  }
}

module.exports = {
  calculateFineGold,
  FINE_GOLD_SCALE,
};
