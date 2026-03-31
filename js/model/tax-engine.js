// js/model/tax-engine.js
// Deterministic year-by-year two-person UK tax engine.
// Runs on the main thread — no Worker needed.
//
// Withdrawal sequencing: ISA → GIA → Pension (default, user-configurable).
// Two people: wrapper need split evenly; each person taxed independently.
// GIA uses Section 104 pool (average cost basis).

import {
  RATES_2025,
  uprateThresholds,
  calcIncomeTax,
  calcCgt,
} from './uk-tax-rules.js';

export const WRAPPER_ORDER_DEFAULT = ['ISA', 'GIA', 'Pension'];

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run the deterministic tax simulation.
 *
 * @param {object} inputs — see buildTaxInputs() in tax-form.js for shape
 * @returns {{ rows: object[], summary: object }}
 */
export function runTaxEngine(inputs) {
  const {
    years,
    growthRate,               // nominal decimal, e.g. 0.05
    inflation,                // decimal, e.g. 0.027
    spendingTarget,           // today's nominal £
    wrapperOrder,             // ['ISA','GIA','Pension']
    p1IsaBalance,
    p1GiaBalance,
    p1PensionBalance,
    p2IsaBalance,
    p2GiaBalance,
    p2PensionBalance,
    p1GiaCostBasis,
    p2GiaCostBasis,
    p1StatePensionAmount,     // today's £
    p1StatePensionYear,       // 1-indexed year it starts (0 = never)
    p2StatePensionAmount,
    p2StatePensionYear,
    p1OtherIncomeAmount,      // today's £
    p1OtherIncomeYears,       // how many years from year 1 (0 = none)
    p2OtherIncomeAmount,
    p2OtherIncomeYears,
    p1StartAge,
    p2StartAge,
    thresholdInflationRate,   // 0 = frozen thresholds
  } = inputs;

  // Mutable per-person state
  const st = {
    p1: { isa: p1IsaBalance, gia: p1GiaBalance, pension: p1PensionBalance, giaCost: p1GiaCostBasis },
    p2: { isa: p2IsaBalance, gia: p2GiaBalance, pension: p2PensionBalance, giaCost: p2GiaCostBasis },
  };

  const rows = [];

  for (let y = 1; y <= years; y++) {
    // 1. Grow all wrappers (cost basis does not grow)
    for (const p of ['p1', 'p2']) {
      st[p].isa     *= (1 + growthRate);
      st[p].gia     *= (1 + growthRate);
      st[p].pension *= (1 + growthRate);
    }

    // 2. Inflation & threshold factors for this year
    const inflFactor  = Math.pow(1 + inflation, y - 1);
    const threshFactor = Math.pow(1 + (thresholdInflationRate || 0), y - 1);
    const rates = uprateThresholds(RATES_2025, threshFactor);

    // 3. Nominal spending target
    const nominalSpending = spendingTarget * inflFactor;

    // 4. Per-person passive income (nominal)
    const p1SP    = (p1StatePensionYear > 0 && y >= p1StatePensionYear) ? p1StatePensionAmount * inflFactor : 0;
    const p2SP    = (p2StatePensionYear > 0 && y >= p2StatePensionYear) ? p2StatePensionAmount * inflFactor : 0;
    const p1Other = (p1OtherIncomeYears > 0 && y <= p1OtherIncomeYears) ? p1OtherIncomeAmount * inflFactor : 0;
    const p2Other = (p2OtherIncomeYears > 0 && y <= p2OtherIncomeYears) ? p2OtherIncomeAmount * inflFactor : 0;

    const totalPassiveIncome = p1SP + p2SP + p1Other + p2Other;

    // 5. Split withdrawal need evenly
    const totalNeeded = Math.max(0, nominalSpending - totalPassiveIncome);
    const neededEach  = totalNeeded / 2;

    // 6. Draw from each person's wrappers
    const p1Draw = drawFromWrappers(st.p1, neededEach, wrapperOrder, rates, p1SP, p1Other);
    const p2Draw = drawFromWrappers(st.p2, neededEach, wrapperOrder, rates, p2SP, p2Other);

    // 7. Update state
    st.p1.giaCost = p1Draw.newGiaCost;
    st.p2.giaCost = p2Draw.newGiaCost;
    st.p1.isa     = Math.max(0, st.p1.isa     - p1Draw.isaDrawn);
    st.p1.gia     = Math.max(0, st.p1.gia     - p1Draw.giaDrawn);
    st.p1.pension = Math.max(0, st.p1.pension - p1Draw.pensionDrawn);
    st.p2.isa     = Math.max(0, st.p2.isa     - p2Draw.isaDrawn);
    st.p2.gia     = Math.max(0, st.p2.gia     - p2Draw.giaDrawn);
    st.p2.pension = Math.max(0, st.p2.pension - p2Draw.pensionDrawn);
    st.p1.giaCost = Math.max(0, st.p1.giaCost);
    st.p2.giaCost = Math.max(0, st.p2.giaCost);

    // 8. Aggregate totals
    const isaDrawn     = p1Draw.isaDrawn     + p2Draw.isaDrawn;
    const giaDrawn     = p1Draw.giaDrawn     + p2Draw.giaDrawn;
    const pensionDrawn = p1Draw.pensionDrawn + p2Draw.pensionDrawn;
    const incomeTax    = p1Draw.incomeTax    + p2Draw.incomeTax;
    const cgt          = p1Draw.cgt          + p2Draw.cgt;
    const totalTax     = incomeTax + cgt;
    const totalDrawn   = isaDrawn + giaDrawn + pensionDrawn;
    const netSpending  = totalPassiveIncome + totalDrawn - totalTax;

    const isaBalance     = st.p1.isa     + st.p2.isa;
    const giaBalance     = st.p1.gia     + st.p2.gia;
    const pensionBalance = st.p1.pension + st.p2.pension;
    const totalPortfolio = isaBalance + giaBalance + pensionBalance;

    const real = (v) => v / inflFactor;

    rows.push({
      year: y,
      p1Age: p1StartAge + y,
      p2Age: p2StartAge + y,

      // Nominal
      nominalSpending,
      p1StatePension: p1SP,
      p2StatePension: p2SP,
      p1OtherIncome:  p1Other,
      p2OtherIncome:  p2Other,
      totalPassiveIncome,
      totalNeeded,
      isaDrawn,
      giaDrawn,
      pensionDrawn,
      incomeTax,
      cgt,
      totalTax,
      netSpending,
      isaBalance,
      giaBalance,
      pensionBalance,
      totalPortfolio,

      // Real (today's £)
      realSpending:        real(nominalSpending),
      realNetSpending:     real(netSpending),
      realTotalTax:        real(totalTax),
      realIsaBalance:      real(isaBalance),
      realGiaBalance:      real(giaBalance),
      realPensionBalance:  real(pensionBalance),
      realTotalPortfolio:  real(totalPortfolio),

      // Per-person detail
      p1: { ...p1Draw, statePension: p1SP, otherIncome: p1Other },
      p2: { ...p2Draw, statePension: p2SP, otherIncome: p2Other },
    });
  }

  return { rows, summary: buildSummary(rows) };
}

// ---------------------------------------------------------------------------
// Per-person withdrawal logic
// ---------------------------------------------------------------------------

function drawFromWrappers(personState, needed, wrapperOrder, rates, statePension, otherIncome) {
  let remaining    = needed;
  let isaDrawn     = 0;
  let giaDrawn     = 0;
  let pensionDrawn = 0;
  let cgt          = 0;
  let newGiaCost   = personState.giaCost;

  for (const wrapper of wrapperOrder) {
    if (remaining <= 0) break;

    if (wrapper === 'ISA') {
      const draw = Math.min(remaining, personState.isa);
      isaDrawn  += draw;
      remaining -= draw;

    } else if (wrapper === 'GIA') {
      const draw = Math.min(remaining, personState.gia);
      if (draw > 0) {
        // Use provisional marginal band (before pension drawdown) for CGT rate
        const provisional = calcIncomeTax({
          statePension,
          pensionDrawdown: 0,
          otherIncome,
          rates,
        });
        const cgtResult = calcCgt({
          proceeds:    draw,
          poolValue:   personState.gia,
          poolCost:    newGiaCost,
          marginalBand: provisional.marginalBand,
          rates,
        });
        giaDrawn   += draw;
        cgt        += cgtResult.cgt;
        newGiaCost  = cgtResult.newPoolCost;
        remaining  -= draw;
      }

    } else if (wrapper === 'Pension') {
      const draw = Math.min(remaining, personState.pension);
      pensionDrawn += draw;
      remaining    -= draw;
    }
  }

  // Final income tax: state pension + other income + pension drawdown
  const itResult = calcIncomeTax({
    statePension,
    pensionDrawdown: pensionDrawn,
    otherIncome,
    rates,
  });

  return {
    isaDrawn,
    giaDrawn,
    pensionDrawn,
    incomeTax:   itResult.incomeTax,
    cgt,
    newGiaCost,
    marginalBand: itResult.marginalBand,
    effectivePA:  itResult.effectivePA,
    grossIncome:  itResult.grossIncome,
    shortfall:    Math.max(0, remaining),
  };
}

// ---------------------------------------------------------------------------
// Summary statistics
// ---------------------------------------------------------------------------

function buildSummary(rows) {
  let lifetimeTax      = 0;
  let lifetimeIncomeTax = 0;
  let lifetimeCgt      = 0;
  let peakTaxYear      = null;
  let peakTaxAmount    = 0;
  let isaExhaustedYear     = null;
  let giaExhaustedYear     = null;
  let pensionExhaustedYear = null;

  for (const row of rows) {
    lifetimeTax       += row.totalTax;
    lifetimeIncomeTax += row.incomeTax;
    lifetimeCgt       += row.cgt;

    if (row.totalTax > peakTaxAmount) {
      peakTaxAmount = row.totalTax;
      peakTaxYear   = row.year;
    }

    if (isaExhaustedYear     === null && row.isaBalance     < 1) isaExhaustedYear     = row.year;
    if (giaExhaustedYear     === null && row.giaBalance     < 1) giaExhaustedYear     = row.year;
    if (pensionExhaustedYear === null && row.pensionBalance < 1) pensionExhaustedYear = row.year;
  }

  // Effective rate: tax / (net spending + tax) = tax / gross needed
  const totalGrossNeeded = rows.reduce((s, r) => s + r.netSpending + r.totalTax, 0);
  const effectiveRate = totalGrossNeeded > 0 ? lifetimeTax / totalGrossNeeded : 0;

  const last = rows[rows.length - 1] || {};

  return {
    lifetimeTax,
    lifetimeIncomeTax,
    lifetimeCgt,
    peakTaxYear,
    peakTaxAmount,
    effectiveRate,
    isaExhaustedYear,
    giaExhaustedYear,
    pensionExhaustedYear,
    finalIsaBalance:      last.isaBalance     || 0,
    finalGiaBalance:      last.giaBalance     || 0,
    finalPensionBalance:  last.pensionBalance || 0,
    finalTotalPortfolio:  last.totalPortfolio || 0,
    years: rows.length,
  };
}
