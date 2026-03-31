// js/model/uk-tax-rules.js
// Pure UK tax rule functions — no DOM, no side effects.
// Baseline: 2026/27 England/Wales/NI rates (frozen until 2031).
// Covers: income tax, starting rate for savings, PSA, dividend tax, CGT.
//
// Income ordering per HMRC rules:
//   1. Non-savings income (wages, pension, other)
//   2. Savings interest
//   3. Dividends
//
// Starting Rate for Savings (SRS):
//   £5,000 band at 0% for interest only.
//   Reduced £1:£1 by non-savings taxable income (income above PA).
//   Fully eliminated if non-savings income > £17,570 (PA £12,570 + SRS £5,000).

// ---------------------------------------------------------------------------
// Threshold table — 2026/27 baseline
// ---------------------------------------------------------------------------

export const RATES_2026 = Object.freeze({
  // Income tax
  personalAllowance:            12570,
  basicRateLimit:               50270,  // PA + basic band (£37,700)
  higherRateLimit:             125140,
  paTaperThreshold:            100000,  // PA tapers £1 per £2 above this
  basicRate:                     0.20,
  higherRate:                    0.40,
  additionalRate:                0.45,

  // Starting Rate for Savings (0% band for interest only)
  startingRateForSavings:        5000,
  startingRateForSavingsCutoff: 17570,  // PA (12,570) + SRS (5,000)

  // Personal Savings Allowance
  savingsAllowanceBasic:         1000,
  savingsAllowanceHigher:         500,
  savingsAllowanceAdditional:       0,

  // Dividends — 2026/27 rates (increased from 2025/26)
  dividendAllowance:              500,
  dividendBasicRate:             0.1075, // 10.75%
  dividendHigherRate:            0.3575, // 35.75%
  dividendAdditionalRate:        0.3935, // 39.35%

  // CGT on investments (unchanged)
  cgtAnnualExempt:               3000,
  cgtBasicRate:                  0.18,
  cgtHigherRate:                 0.24,
});

// Legacy alias — tax-engine.js imports RATES_2025
export { RATES_2026 as RATES_2025 };

// ---------------------------------------------------------------------------
// Threshold uprating
// ---------------------------------------------------------------------------

/**
 * Uprate monetary thresholds by a cumulative factor.
 * Pass factor = 1.0 for frozen thresholds (government policy to 2031).
 * @param {object} base   typically RATES_2026
 * @param {number} factor e.g. Math.pow(1.027, yearIndex)
 * @returns {object}
 */
export function uprateThresholds(base, factor) {
  if (factor === 1) return base;
  const u = (v) => Math.round(v * factor);
  return {
    ...base,
    personalAllowance:            u(base.personalAllowance),
    basicRateLimit:               u(base.basicRateLimit),
    higherRateLimit:              u(base.higherRateLimit),
    paTaperThreshold:             u(base.paTaperThreshold),
    startingRateForSavings:       u(base.startingRateForSavings),
    startingRateForSavingsCutoff: u(base.startingRateForSavingsCutoff),
    savingsAllowanceBasic:        u(base.savingsAllowanceBasic),
    savingsAllowanceHigher:       u(base.savingsAllowanceHigher),
    dividendAllowance:            u(base.dividendAllowance),
    cgtAnnualExempt:              u(base.cgtAnnualExempt),
  };
}

// ---------------------------------------------------------------------------
// Effective personal allowance (PA taper above £100k)
// ---------------------------------------------------------------------------

/**
 * PA reduces £1 per £2 of adjusted net income above £100,000.
 * @param {number} grossNonSavingsIncome  wages + pension + other
 * @param {object} rates
 * @returns {number}
 */
export function effectivePersonalAllowance(grossNonSavingsIncome, rates) {
  const { personalAllowance, paTaperThreshold } = rates;
  if (grossNonSavingsIncome <= paTaperThreshold) return personalAllowance;
  const reduction = Math.floor((grossNonSavingsIncome - paTaperThreshold) / 2);
  return Math.max(0, personalAllowance - reduction);
}

// ---------------------------------------------------------------------------
// Starting Rate for Savings + PSA bands
// ---------------------------------------------------------------------------

/**
 * Compute the available Starting Rate for Savings and PSA,
 * given how much taxable non-savings income has already used up the band.
 *
 * Key rule: SRS is reduced £1:£1 by taxable non-savings income
 * (i.e. income ABOVE the personal allowance, not gross income).
 *
 * Example from spec:
 *   Wages £15,000 → taxable non-savings = £15,000 − £12,570 = £2,430
 *   SRS remaining = £5,000 − £2,430 = £2,570  ✓
 *
 * @param {number} nonSavingsTaxableIncome  taxable non-savings after PA deduction
 * @param {string} marginalBand             'none'|'basic'|'higher'|'additional'
 * @param {object} rates
 * @returns {{ startingRateRemaining: number, psa: number }}
 */
export function calcSavingsBands(nonSavingsTaxableIncome, marginalBand, rates) {
  const startingRateRemaining = Math.max(
    0,
    rates.startingRateForSavings - nonSavingsTaxableIncome
  );

  let psa;
  if (marginalBand === 'additional') psa = rates.savingsAllowanceAdditional; // £0
  else if (marginalBand === 'higher') psa = rates.savingsAllowanceHigher;    // £500
  else psa = rates.savingsAllowanceBasic;                                    // £1,000

  return { startingRateRemaining, psa };
}

/**
 * Compute tax on savings interest.
 * Order: SRS (0%) → PSA (0%) → marginal rate.
 *
 * @param {number} interest
 * @param {number} nonSavingsTaxableIncome
 * @param {string} marginalBand
 * @param {object} rates
 * @returns {{ savingsTax, startingRateUsed, psaUsed }}
 */
export function calcSavingsTax(interest, nonSavingsTaxableIncome, marginalBand, rates) {
  if (interest <= 0) return { savingsTax: 0, startingRateUsed: 0, psaUsed: 0 };

  const { startingRateRemaining, psa } = calcSavingsBands(nonSavingsTaxableIncome, marginalBand, rates);

  let remaining = interest;

  const startingRateUsed = Math.min(remaining, startingRateRemaining);
  remaining -= startingRateUsed;

  const psaUsed = Math.min(remaining, psa);
  remaining -= psaUsed;

  let rate;
  if (marginalBand === 'additional') rate = rates.additionalRate;
  else if (marginalBand === 'higher') rate = rates.higherRate;
  else rate = rates.basicRate;

  return {
    savingsTax: Math.max(0, remaining * rate),
    startingRateUsed,
    psaUsed,
  };
}

// ---------------------------------------------------------------------------
// Non-savings income tax (pension drawdown, wages, other income)
// ---------------------------------------------------------------------------

/**
 * Compute income tax on non-savings income.
 * State pension counts as income and consumes personal allowance first.
 *
 * @param {object} p
 * @param {number} p.statePension
 * @param {number} p.pensionDrawdown
 * @param {number} p.otherIncome
 * @param {object} p.rates
 * @returns {{ incomeTax, effectivePA, taxableIncome, marginalBand, grossIncome }}
 */
export function calcIncomeTax({ statePension, pensionDrawdown, otherIncome, rates }) {
  const grossIncome = statePension + pensionDrawdown + otherIncome;
  const pa = effectivePersonalAllowance(grossIncome, rates);
  const taxable = Math.max(0, grossIncome - pa);

  const basicBandWidth  = rates.basicRateLimit  - rates.personalAllowance;
  const higherBandWidth = rates.higherRateLimit - rates.basicRateLimit;

  let tax = 0;
  let remaining = taxable;

  const inBasic = Math.min(remaining, basicBandWidth);
  tax += inBasic * rates.basicRate;
  remaining -= inBasic;

  const inHigher = Math.min(remaining, higherBandWidth);
  tax += inHigher * rates.higherRate;
  remaining -= inHigher;

  tax += remaining * rates.additionalRate;

  let marginalBand = 'none';
  if (taxable > 0) {
    if (taxable <= basicBandWidth) marginalBand = 'basic';
    else if (taxable <= basicBandWidth + higherBandWidth) marginalBand = 'higher';
    else marginalBand = 'additional';
  }

  return {
    incomeTax: Math.max(0, tax),
    effectivePA: pa,
    taxableIncome: taxable,
    marginalBand,
    grossIncome,
  };
}

// ---------------------------------------------------------------------------
// Dividend tax (applied last, after non-savings and savings)
// ---------------------------------------------------------------------------

/**
 * Compute dividend tax using 2026/27 rates.
 *
 * @param {number} dividends
 * @param {string} marginalBand  from non-savings income calculation
 * @param {object} rates
 * @returns {{ dividendTax, taxableDividends }}
 */
export function calcDividendTax(dividends, marginalBand, rates) {
  if (dividends <= 0) return { dividendTax: 0, taxableDividends: 0 };
  const taxableDividends = Math.max(0, dividends - rates.dividendAllowance);
  if (taxableDividends <= 0) return { dividendTax: 0, taxableDividends: 0 };

  let rate;
  if (marginalBand === 'additional') rate = rates.dividendAdditionalRate;
  else if (marginalBand === 'higher') rate = rates.dividendHigherRate;
  else rate = rates.dividendBasicRate;

  return { dividendTax: taxableDividends * rate, taxableDividends };
}

// ---------------------------------------------------------------------------
// CGT — Section 104 pool (average cost basis)
// ---------------------------------------------------------------------------

/**
 * Compute CGT on a GIA disposal using the Section 104 pool.
 *
 * @param {object} p
 * @param {number} p.proceeds
 * @param {number} p.poolValue    current market value of pool
 * @param {number} p.poolCost     current cost basis of pool
 * @param {string} p.marginalBand 'none'|'basic'|'higher'|'additional'
 * @param {object} p.rates
 * @returns {{ cgt, gain, taxableGain, costOfSale, newPoolCost }}
 */
export function calcCgt({ proceeds, poolValue, poolCost, marginalBand, rates }) {
  if (proceeds <= 0 || poolValue <= 0) {
    return { cgt: 0, gain: 0, taxableGain: 0, costOfSale: 0, newPoolCost: poolCost };
  }

  const fraction    = Math.min(1, proceeds / poolValue);
  const costOfSale  = poolCost * fraction;
  const grossGain   = Math.max(0, proceeds - costOfSale);
  const taxableGain = Math.max(0, grossGain - rates.cgtAnnualExempt);
  const cgtRate     = (marginalBand === 'basic') ? rates.cgtBasicRate : rates.cgtHigherRate;

  return {
    cgt: Math.max(0, taxableGain * cgtRate),
    gain: grossGain,
    taxableGain,
    costOfSale,
    newPoolCost: Math.max(0, poolCost - costOfSale),
  };
}
