import { normaliseInputs, simulatePath } from '../js/model/simulator.js';
import {
  initialiseBuckets,
  applyAssetReturns,
  withdrawFromBuckets,
  rebalanceBuckets
} from '../js/model/cashflow.js';
import {
  runHistoricalScenario,
  toDecimal
} from '../js/model/historical/historical-runner.js';

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

function assertEqual(name, actual, expected, tolerance = 1e-9) {
  const pass = Math.abs(actual - expected) <= tolerance;

  if (pass) {
    log(`PASS: ${name}`);
  } else {
    log(`FAIL: ${name} (expected ${expected}, got ${actual})`);
  }
}

/* =========================
   TEST 1 — Normalisation
========================= */

(function testNormalisation() {
  const a = normaliseInputs({ equityReturn: 7 });
  const b = normaliseInputs({ equityReturn: 0.07 });

  assertEqual(
    'equityReturn normalises correctly',
    a.equityReturn,
    b.equityReturn
  );
})();

/* =========================
   TEST 2 — Withdrawal order
========================= */

(function testWithdrawalOrder() {
  const buckets = {
    cash: 25,
    cashlike: 100,
    bonds: 100,
    equities: 100
  };

  const withdrawn = withdrawFromBuckets(buckets, 150);

  assertEqual('withdrawal amount correct', withdrawn, 150);
  assertEqual('cash used first', buckets.cash, 0);
  assertEqual('cashlike used second', buckets.cashlike, 0);
  assertEqual('bonds used third', buckets.bonds, 75);
  assertEqual('equities untouched', buckets.equities, 100);
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
    cashAllocation: 0,
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
    cash: [0, 0],
    inflation: [0.10, 0.10]
  };

  const result = simulatePath(inputs, annualReturns);

  const year1 = result.yearlyRows[0];
  const year2 = result.yearlyRows[1];

  assertEqual(
    'year 1 target spending starts at 40000',
    year1.targetSpendingNominal,
    40000
  );

  assertEqual(
    'year 2 target spending still shows inflation uplift',
    year2.targetSpendingNominal,
    44000
  );

  assertEqual(
    'year 2 actual spending skips inflation after negative return',
    year2.actualSpendingNominal,
    40000
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
    cashAllocation: 0,
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
    cash: [0, 0, 0],
    inflation: [0, 0, 0]
  };

  const result = simulatePath(inputs, annualReturns);

  assert(
    'portfolio is depleted in first year',
    result.yearlyRows[0].depleted === true
  );

  assertEqual(
    'end portfolio is zero after first year',
    result.yearlyRows[0].endPortfolioNominal,
    0
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
    cashAllocation: 0,
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
    cash: [0, 0],
    inflation: [0, 0]
  };

  const result = simulatePath(inputs, annualReturns);
  const year2 = result.yearlyRows[1];

  assertEqual(
    'year 2 actual spending is cut by upper guardrail',
    year2.actualSpendingNominal,
    36000
  );
})();

/* =========================
   TEST 7 — Rebalancing restores target allocations
========================= */

(function testRebalancingRestoresTargets() {
  const allocations = {
    equities: 0.6,
    bonds: 0.3,
    cashlike: 0.1,
    cash: 0
  };

  let buckets = initialiseBuckets(1000, allocations);

  applyAssetReturns(buckets, {
    equities: 0.50,
    bonds: 0,
    cashlike: 0,
    cash: 0
  });

  buckets = rebalanceBuckets(buckets, allocations);

  assertEqual(
    'equities rebalanced to 60%',
    buckets.equities,
    1300 * 0.6
  );

  assertEqual(
    'bonds rebalanced to 30%',
    buckets.bonds,
    1300 * 0.3
  );

  assertEqual(
    'cashlike rebalanced to 10%',
    buckets.cashlike,
    1300 * 0.1
  );

  assertEqual(
    'cash remains at 0%',
    buckets.cash ?? 0,
    0
  );
})();

/* =========================
   TEST 8 — Historical percent-to-decimal conversion
========================= */

(function testHistoricalToDecimal() {
  assertEqual(
    '20 converts to 0.20',
    toDecimal(20),
    0.20
  );

  assertEqual(
    '0.20 stays 0.20',
    toDecimal(0.20),
    0.20
  );

  assertEqual(
    '-15 converts to -0.15',
    toDecimal(-15),
    -0.15
  );

  assertEqual(
    '-0.15 stays -0.15',
    toDecimal(-0.15),
    -0.15
  );
})();

/* =========================
   TEST 9 — Surplus income is added to cashlike
========================= */

(function testSurplusIncomeAddedToCashlike() {
  const inputs = normaliseInputs({
    years: 1,
    initialPortfolio: 1000,
    initialSpending: 100,
    equityAllocation: 0,
    bondAllocation: 0,
    cashlikeAllocation: 100,
    cashAllocation: 0,
    equityReturn: 0,
    bondReturn: 0,
    cashlikeReturn: 0,
    annualFeeRate: 0,
    inflation: 0,
    enableGuardrails: false,

    person1Age: 67,
    person1PensionAge: 67,
    person2Age: 55,
    person2PensionAge: 99,

    statePensionToday: 150,
    person1PensionToday: 150,
    person2PensionToday: 150,

    person1OtherIncomeToday: 0,
    person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0,
    person2OtherIncomeYears: 0,

    person1WindfallAmount: 0,
    person1WindfallYear: 0,
    person2WindfallAmount: 0,
    person2WindfallYear: 0
  });

  const annualReturns = {
    equities: [0],
    bonds: [0],
    cashlike: [0],
    cash: [0],
    inflation: [0]
  };

  const result = simulatePath(inputs, annualReturns);
  const year1 = result.yearlyRows[0];

  assertEqual(
    'surplus income means no portfolio withdrawal',
    year1.withdrawalNominal,
    0
  );

  assertEqual(
    'actual spending is fully funded',
    year1.actualSpendingNominal,
    100
  );

  assertEqual(
    'end portfolio increases by surplus income',
    year1.endPortfolioNominal,
    1050
  );
})();