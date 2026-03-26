import { normaliseInputs, simulatePath } from '../js/model/simulator.js';
import {
  initialiseBuckets,
  applyAssetReturns,
  withdrawFromBuckets,
  rebalanceBuckets
} from '../js/model/cashflow.js';
import { runHistoricalScenario } from '../js/model/historical/historical-runner.js';

const output = document.getElementById('output');

function log(message) {
  output.textContent += message + '\n';
}

function assert(name, condition) {
  if (condition) {
    log(`PASS: ${name}`);
  } else {
    log(`FAIL: ${name}`);
  }
}

/* =========================
   TEST 1 — Normalisation
========================= */

(function testNormalisation() {
  const a = normaliseInputs({ equityReturn: 7 });
  const b = normaliseInputs({ equityReturn: 0.07 });

  assert(
    'equityReturn normalises correctly',
    Math.abs(a.equityReturn - b.equityReturn) < 1e-9
  );
})();

/* =========================
   TEST 2 — Withdrawal order
========================= */

(function testWithdrawalOrder() {
  const buckets = {
    cashlike: 100,
    bonds: 100,
    equities: 100
  };

  const withdrawn = withdrawFromBuckets(buckets, 150);

  assert('withdrawal amount correct', withdrawn === 150);
  assert('cash used first', buckets.cashlike === 0);
  assert('bonds used second', buckets.bonds === 50);
  assert('equities untouched', buckets.equities === 100);
})();

/* =========================
   TEST 3 — Historical path shape
========================= */

(async function testHistorical() {
  try {
    const result = await runHistoricalScenario({
      years: 5,
      historicalScenario: 1929
    });

    assert('historical returns rows exist', Array.isArray(result.yearlyRows));
    assert('historical has paths', Array.isArray(result.pathNominal));
    assert(
      'historical has terminal value',
      typeof result.terminalNominal === 'number'
    );
  } catch (e) {
    assert('historical run did not throw', false);
    console.error(e);
  }
})();

/* =========================
   TEST 4 — Guardrail inflation skip after negative return
========================= */

(function testGuardrailInflationSkip() {
  const inputs = normaliseInputs({
    years: 2,
    initialPortfolio: 1000000,
    initialSpending: 40000,
    equityAllocation: 100,
    bondAllocation: 0,
    cashlikeAllocation: 0,
    equityReturn: 0,
    bondReturn: 0,
    cashlikeReturn: 0,
    annualFeeRate: 0,
    inflation: 0.1,
    skipInflationAfterNegative: true,
    enableGuardrails: true,
    upperGuardrail: 100000,
    lowerGuardrail: 100000,
    adjustmentSize: 10,
    person1Age: 55,
    person1PensionAge: 99,
    person2Age: 55,
    person2PensionAge: 99,
    person1OtherIncomeToday: 0,
    person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0,
    person2OtherIncomeYears: 0
  });

  const annualReturns = {
    equities: [-0.20, 0],
    bonds: [0, 0],
    cashlike: [0, 0],
    inflation: [0.10, 0.10]
  };

  const result = simulatePath(inputs, annualReturns);

  const year1 = result.yearlyRows[0];
  const year2 = result.yearlyRows[1];

  assert(
    'year 1 target spending starts at 40000',
    Math.abs(year1.targetSpendingNominal - 40000) < 1e-9
  );

  assert(
    'year 2 target spending still shows inflation uplift',
    Math.abs(year2.targetSpendingNominal - 44000) < 1e-9
  );

log(`DEBUG Test 4 year2 target=${year2.targetSpendingNominal} actual=${year2.actualSpendingNominal} marketReturn=${year1.marketReturn}`);

  assert(
    'year 2 actual spending skips inflation after negative return',
    Math.abs(year2.actualSpendingNominal - 40000) < 1e-9
  );
})();

/* =========================
   TEST 5 — Depletion timing
========================= */

(function testDepletionTiming() {
  const inputs = normaliseInputs({
    years: 3,
    initialPortfolio: 100,
    initialSpending: 100,
    equityAllocation: 0,
    bondAllocation: 0,
    cashlikeAllocation: 100,
    equityReturn: 0,
    bondReturn: 0,
    cashlikeReturn: 0,
    annualFeeRate: 0,
    inflation: 0,
    enableGuardrails: false,
    person1Age: 55,
    person1PensionAge: 99,
    person2Age: 55,
    person2PensionAge: 99,
    person1OtherIncomeToday: 0,
    person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0,
    person2OtherIncomeYears: 0
  });

  const annualReturns = {
    equities: [0, 0, 0],
    bonds: [0, 0, 0],
    cashlike: [0, 0, 0],
    inflation: [0, 0, 0]
  };

  const result = simulatePath(inputs, annualReturns);

  assert(
    'portfolio is depleted in first year',
    result.yearlyRows[0].depleted === true
  );

  assert(
    'end portfolio is zero after first year',
    Math.abs(result.yearlyRows[0].endPortfolioNominal) < 1e-9
  );

  assert(
    'overall result marked depleted',
    result.depleted === true
  );
})();

/* =========================
   TEST 6 — Upper guardrail cuts spending
========================= */

(function testUpperGuardrailCut() {
  const inputs = normaliseInputs({
    years: 2,
    initialPortfolio: 1000000,
    initialSpending: 40000,
    equityAllocation: 100,
    bondAllocation: 0,
    cashlikeAllocation: 0,
    equityReturn: 0,
    bondReturn: 0,
    cashlikeReturn: 0,
    annualFeeRate: 0,
    inflation: 0,
    skipInflationAfterNegative: false,
    enableGuardrails: true,
    upperGuardrail: 20,
    lowerGuardrail: 20,
    adjustmentSize: 10,
    person1Age: 55,
    person1PensionAge: 99,
    person2Age: 55,
    person2PensionAge: 99,
    person1OtherIncomeToday: 0,
    person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0,
    person2OtherIncomeYears: 0
  });

  const annualReturns = {
    equities: [-0.40, 0],
    bonds: [0, 0],
    cashlike: [0, 0],
    inflation: [0, 0]
  };

  const result = simulatePath(inputs, annualReturns);
  const year2 = result.yearlyRows[1];

  assert(
    'year 2 actual spending is cut by upper guardrail',
    Math.abs(year2.actualSpendingNominal - 36000) < 1e-9
  );
})();

/* =========================
   TEST 7 — Rebalancing restores target allocations
========================= */

(function testRebalancingRestoresTargets() {
  const allocations = {
    equities: 0.6,
    bonds: 0.3,
    cashlike: 0.1
  };

  let buckets = initialiseBuckets(1000, allocations);

  applyAssetReturns(buckets, {
    equities: 0.50,
    bonds: 0,
    cashlike: 0
  });

  buckets = rebalanceBuckets(buckets, allocations);

  assert(
    'equities rebalanced to 60%',
    Math.abs(buckets.equities - 1300 * 0.6) < 1e-9
  );

  assert(
    'bonds rebalanced to 30%',
    Math.abs(buckets.bonds - 1300 * 0.3) < 1e-9
  );

  assert(
    'cashlike rebalanced to 10%',
    Math.abs(buckets.cashlike - 1300 * 0.1) < 1e-9
  );
})();