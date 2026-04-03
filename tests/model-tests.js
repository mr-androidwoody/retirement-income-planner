import { DEFAULT_INPUTS, normaliseInputs, simulatePath, runRetirementSimulation } from '../js/model/simulator.js';
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
import {
  toLogNormalParams,
  cholesky3,
  sampleCorrelatedAnnualReturns
} from '../js/model/returns-generator.js';

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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Minimal normalised inputs for simulatePath tests — no income, no guardrails. */
function baseInputs(overrides = {}) {
  return normaliseInputs({
    years: 3,
    initialPortfolio: 1000000,
    initialSpending: 40000,
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
    person1Age: 55, person1PensionAge: 99,
    person2Age: 55, person2PensionAge: 99,
    person1OtherIncomeToday: 0, person1OtherIncomeYears: 0,
    person1WindfallAmount: 0, person1WindfallYear: 0,
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0,
    person2WindfallAmount: 0, person2WindfallYear: 0,
    ...overrides
  });
}

/** Flat zero returns array for N years. */
function zeroReturns(years) {
  const z = Array(years).fill(0);
  return { equities: z, bonds: z, cashlike: z, cash: z, inflation: z };
}

/* =========================
   TEST 1 — Normalisation
========================= */

(function testNormalisation() {
  const a = normaliseInputs({ equityReturn: 7 });
  const b = normaliseInputs({ equityReturn: 0.07 });

  assertEqual(
    'equityReturn normalises correctly (7 → 0.07)',
    a.equityReturn,
    b.equityReturn
  );
})();

/* =========================
   TEST 2 — DEFAULT_INPUTS values
   Keeps the test suite honest when defaults change.
========================= */

(function testDefaultInputsValues() {
  assertEqual('DEFAULT_INPUTS bondReturn is 3.5',          DEFAULT_INPUTS.bondReturn,             3.5);
  assertEqual('DEFAULT_INPUTS bondVolatility is 6',        DEFAULT_INPUTS.bondVolatility,         6);
  assertEqual('DEFAULT_INPUTS cashlikeReturn is 3.8',      DEFAULT_INPUTS.cashlikeReturn,         3.8);
  assertEqual('DEFAULT_INPUTS cashlikeVolatility is 1',    DEFAULT_INPUTS.cashlikeVolatility,     1);
  assertEqual('DEFAULT_INPUTS equityReturn is 7',          DEFAULT_INPUTS.equityReturn,           7);
  assertEqual('DEFAULT_INPUTS equityVolatility is 16',     DEFAULT_INPUTS.equityVolatility,       16);
  assertEqual('DEFAULT_INPUTS inflation is 2.7',           DEFAULT_INPUTS.inflation,              2.7);
  assertEqual('DEFAULT_INPUTS initialWithdrawalRate is 4', DEFAULT_INPUTS.initialWithdrawalRate,  4);
  assertEqual('DEFAULT_INPUTS maxSpendingNominal is 0',    DEFAULT_INPUTS.maxSpendingNominal,     0);
})();

/* =========================
   TEST 3 — Withdrawal order
========================= */

(function testWithdrawalOrder() {
  const buckets = { cashlike: 100, bonds: 100, equities: 100 };
  const withdrawn = withdrawFromBuckets(buckets, 150);

  assertEqual('withdrawal amount correct', withdrawn,        150);
  assertEqual('cashlike used first',       buckets.cashlike, 0);
  assertEqual('bonds used second',         buckets.bonds,    50);
  assertEqual('equities used last',        buckets.equities, 100);
})();

/* =========================
   TEST 4 — Historical path shape
========================= */

(async function testHistorical() {
  try {
    const result = await runHistoricalScenario({ years: 5, historicalScenario: 1929 });
    assert('historical returns rows exist',  Array.isArray(result.yearlyRows));
    assert('historical has paths',           Array.isArray(result.pathNominal));
    assert('historical has terminal value',  typeof result.terminalNominal === 'number');
  } catch (e) {
    assert('historical run did not throw', false);
    console.error(e);
  }
})();

/* =========================
   TEST 5 — Guardrail: inflation skip after negative return
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
    person1Age: 55, person1PensionAge: 99,
    person2Age: 55, person2PensionAge: 99,
    person1OtherIncomeToday: 0, person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0,
    person1WindfallAmount: 0, person1WindfallYear: 0,
    person2WindfallAmount: 0, person2WindfallYear: 0,
  });

  const annualReturns = {
    equities:  [-0.50, 0],
    bonds:     [0, 0],
    cashlike:  [0, 0],
    cash:      [0, 0],
    inflation: [0.10, 0.10]
  };

  const result = simulatePath(inputs, annualReturns);
  const year1 = result.yearlyRows[0];
  const year2 = result.yearlyRows[1];

  assertEqual('year 1 target spending starts at 40000',           year1.targetSpendingNominal, 40000);
  assertEqual('year 2 target spending shows inflation uplift',     year2.targetSpendingNominal, 44000);
  assertEqual('year 2 actual spending skips inflation after -ve', year2.actualSpendingNominal, 40000);
})();

/* =========================
   TEST 6 — Depletion timing
========================= */

(function testDepletionTiming() {
  const inputs = baseInputs({ years: 3, initialPortfolio: 100, initialSpending: 100 });
  const result = simulatePath(inputs, zeroReturns(3));

  assert('portfolio is depleted in first year',    result.yearlyRows[0].depleted === true);
  assertEqual('end portfolio is zero after year 1', result.yearlyRows[0].endPortfolioNominal, 0);
  assert('overall result marked depleted',          result.depleted === true);
})();

/* =========================
   TEST 7 — Upper guardrail cuts spending
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
    person1Age: 55, person1PensionAge: 99,
    person2Age: 55, person2PensionAge: 99,
    person1OtherIncomeToday: 0, person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0,
    person1WindfallAmount: 0, person1WindfallYear: 0,
    person2WindfallAmount: 0, person2WindfallYear: 0,
  });

  const annualReturns = {
    equities:  [-0.40, 0],
    bonds:     [0, 0],
    cashlike:  [0, 0],
    cash:      [0, 0],
    inflation: [0, 0]
  };

  const result = simulatePath(inputs, annualReturns);

  assertEqual(
    'year 2 actual spending is cut by upper guardrail',
    result.yearlyRows[1].actualSpendingNominal,
    36000
  );
})();

/* =========================
   TEST 8 — Rebalancing restores target allocations
========================= */

(function testRebalancingRestoresTargets() {
  const allocations = { equities: 0.6, bonds: 0.3, cashlike: 0.1, cash: 0 };
  let buckets = initialiseBuckets(1000, allocations);

  applyAssetReturns(buckets, { equities: 0.50, bonds: 0, cashlike: 0, cash: 0 });
  buckets = rebalanceBuckets(buckets, allocations);

  assertEqual('equities rebalanced to 60%', buckets.equities,  1300 * 0.6);
  assertEqual('bonds rebalanced to 30%',    buckets.bonds,     1300 * 0.3);
  assertEqual('cashlike rebalanced to 10%', buckets.cashlike,  1300 * 0.1);
  assertEqual('cash remains at 0%',         buckets.cash ?? 0, 0);
})();

/* =========================
   TEST 9 — Historical percent-to-decimal conversion
========================= */

(function testHistoricalToDecimal() {
  assertEqual('20 converts to 0.20',   toDecimal(20),    0.20);
  assertEqual('0.20 stays 0.20',       toDecimal(0.20),  0.20);
  assertEqual('-15 converts to -0.15', toDecimal(-15),   -0.15);
  assertEqual('-0.15 stays -0.15',     toDecimal(-0.15), -0.15);
})();

/* =========================
   TEST 10 — Surplus income is added to portfolio
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
    person1Age: 67, person1PensionAge: 67,
    person2Age: 55, person2PensionAge: 99,
    statePensionToday: 150,
    person1PensionToday: 150,
    person2PensionToday: 150,
    person1OtherIncomeToday: 0, person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0,
    person1WindfallAmount: 0, person1WindfallYear: 0,
    person2WindfallAmount: 0, person2WindfallYear: 0,
  });

  const result = simulatePath(inputs, zeroReturns(1));
  const year1 = result.yearlyRows[0];

  assertEqual('surplus income means no portfolio withdrawal', year1.withdrawalNominal,     0);
  assertEqual('actual spending is fully funded',              year1.actualSpendingNominal, 100);
  assertEqual('end portfolio increases by surplus income',    year1.endPortfolioNominal,   1050);
})();

/* =========================
   TEST 11 — Log-normal params: zero vol
========================= */

(function testLogNormalParamsZeroVol() {
  const { muLog, sigmaLog } = toLogNormalParams(0.07, 0);

  assertEqual('zero vol: muLog = ln(1.07)', muLog,    Math.log(1.07));
  assertEqual('zero vol: sigmaLog = 0',     sigmaLog, 0);
})();

/* =========================
   TEST 12 — Log-normal params: volatility drag
========================= */

(function testLogNormalVolatilityDrag() {
  const mean = 0.07;
  const vol  = 0.16;
  const { muLog, sigmaLog } = toLogNormalParams(mean, vol);

  const recoveredMean = Math.exp(muLog + 0.5 * sigmaLog * sigmaLog) - 1;
  assertEqual('log-normal params recover arithmetic mean', recoveredMean, mean, 1e-10);

  const geometricMean = Math.exp(muLog) - 1;
  assert('geometric mean is less than arithmetic mean when vol > 0', geometricMean < mean);
})();

/* =========================
   TEST 13 — Cholesky: L * L^T = M
========================= */

(function testCholeskyRoundTrip() {
  const matrix = [
    [1,    0.20, 0.05],
    [0.20, 1,    0.35],
    [0.05, 0.35, 1   ]
  ];
  const L = cholesky3(matrix);

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let reconstructed = 0;
      for (let k = 0; k < 3; k++) reconstructed += L[i][k] * L[j][k];
      assertEqual(
        `cholesky L*L^T[${i}][${j}] == M[${i}][${j}]`,
        reconstructed, matrix[i][j], 1e-10
      );
    }
  }
})();

/* =========================
   TEST 14 — Cholesky: diagonal elements are positive
========================= */

(function testCholeskyDiagonalPositive() {
  const matrix = [
    [1,    0.20, 0.05],
    [0.20, 1,    0.35],
    [0.05, 0.35, 1   ]
  ];
  const L = cholesky3(matrix);

  assert('L[0][0] > 0', L[0][0] > 0);
  assert('L[1][1] > 0', L[1][1] > 0);
  assert('L[2][2] > 0', L[2][2] > 0);
})();

/* =========================
   TEST 15 — Geometric fee application
========================= */

(function testGeometricFeeApplication() {
  const gross = 0.07;
  const fee   = 0.0027;
  const geometricNet  = (1 + gross) / (1 + fee) - 1;
  const arithmeticNet = gross - fee;

  assert('geometric net return is less than arithmetic net', geometricNet < arithmeticNet);
  assertEqual('geometric net return is correct', geometricNet, (1.07 / 1.0027) - 1, 1e-12);

  const inputs = baseInputs({
    years: 1,
    equityAllocation: 100,
    cashlikeAllocation: 0,
    initialSpending: 0,
    annualFeeRate: 0.27,   // percentage points → normalised to 0.0027
  });

  const annualReturns = { equities: [0.07], bonds: [0], cashlike: [0], cash: [0], inflation: [0] };
  const result = simulatePath(inputs, annualReturns);
  const expectedEnd = 1000000 * (1 + (1.07 / 1.0027 - 1));

  assertEqual(
    'simulatePath applies fees geometrically',
    result.yearlyRows[0].endPortfolioNominal,
    expectedEnd,
    0.01
  );
})();

/* =========================
   TEST 16 — Inflation uprating of spending
========================= */

(function testInflationUprating() {
  const inputs = baseInputs({ years: 3 });
  const inf = 0.03;
  const annualReturns = {
    equities: [0, 0, 0], bonds: [0, 0, 0], cashlike: [0, 0, 0], cash: [0, 0, 0],
    inflation: [inf, inf, inf]
  };

  const result = simulatePath(inputs, annualReturns);
  const rows = result.yearlyRows;

  assertEqual('year 1 target spending is initial spending',        rows[0].targetSpendingNominal, 40000,               0.01);
  assertEqual('year 2 target spending is uprated by inflation',    rows[1].targetSpendingNominal, 40000 * 1.03,        0.01);
  assertEqual('year 3 target spending is uprated by inflation^2',  rows[2].targetSpendingNominal, 40000 * 1.03 * 1.03, 0.01);
})();

/* =========================
   TEST 17 — p50 path selection: L2 distance
========================= */

(function testP50PathSelection() {
  const result = runRetirementSimulation({
    years: 10,
    initialPortfolio: 1000000,
    initialSpending: 40000,
    equityAllocation: 60,
    bondAllocation: 40,
    cashlikeAllocation: 0,
    cashAllocation: 0,
    equityReturn: 7,
    equityVolatility: 16,
    bondReturn: 3.5,
    bondVolatility: 6,
    cashlikeReturn: 3.8,
    cashlikeVolatility: 1,
    annualFeeRate: 0.27,
    inflation: 2.7,
    monteCarloRuns: 500,
    enableGuardrails: false,
    person1Age: 55, person1PensionAge: 99,
    person2Age: 55, person2PensionAge: 99,
    person1OtherIncomeToday: 0, person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0,
    person1WindfallAmount: 0, person1WindfallYear: 0,
    person2WindfallAmount: 0, person2WindfallYear: 0,
  });

  const p10 = result?.monteCarlo?.representativePaths?.p10;
  const p50 = result?.monteCarlo?.representativePaths?.p50;
  const p90 = result?.monteCarlo?.representativePaths?.p90;

  assert('p50 path exists',                    p50 !== null && p50 !== undefined);
  assert('p50 has pathNominal array',          Array.isArray(p50?.pathNominal));
  assert('p50 pathNominal has correct length', p50?.pathNominal?.length === 10);

  const p10Terminal = p10?.pathNominal?.at(-1) ?? 0;
  const p50Terminal = p50?.pathNominal?.at(-1) ?? 0;
  const p90Terminal = p90?.pathNominal?.at(-1) ?? 0;

  assert('p50 terminal is between p10 and p90', p10Terminal <= p50Terminal && p50Terminal <= p90Terminal);
})();

/* =========================
   TEST 18 — sampleCorrelatedAnnualReturns: deterministic path
========================= */

(function testDeterministicReturns() {
  // When all vols are zero, returns should equal the means exactly (after clamping)
  const result = sampleCorrelatedAnnualReturns({
    rng: Math.random,
    means: { equities: 0.07, bonds: 0.035, cashlike: 0.038 },
    volatilities: { equities: 0, bonds: 0, cashlike: 0 },
    correlations: {},
    inflationMean: 0.027,
    inflationVolatility: 0
  });

  assertEqual('deterministic equities return', result.equities,  0.07,  1e-10);
  assertEqual('deterministic bonds return',    result.bonds,     0.035, 1e-10);
  assertEqual('deterministic cashlike return', result.cashlike,  0.038, 1e-10);
  assertEqual('deterministic inflation',       result.inflation, 0.027, 1e-10);
})();

/* =========================
   TEST 19 — Windfall is added in correct year
========================= */

(function testWindfallYear() {
  const inputs = baseInputs({
    years: 3,
    initialSpending: 0,
    person1WindfallAmount: 50000,
    person1WindfallYear: 2,
  });

  const result = simulatePath(inputs, zeroReturns(3));
  const rows = result.yearlyRows;

  assertEqual('year 1 portfolio unchanged (no windfall)',              rows[0].endPortfolioNominal, 1000000);
  assertEqual('year 2 portfolio includes windfall',                    rows[1].endPortfolioNominal, 1050000);
  assertEqual('year 3 portfolio unchanged (windfall already applied)', rows[2].endPortfolioNominal, 1050000);
})();

/* =========================
   TEST 20 — maxSpendingNominal cap prevents guardrail raise
========================= */

(function testMaxSpendingNominalCap() {
  // Strong positive return → withdrawal rate falls → guardrail tries to raise spending.
  // The cap should prevent any increase above initialSpending.
  const cap = 40000;
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
    maxSpendingNominal: cap,
    person1Age: 55, person1PensionAge: 99,
    person2Age: 55, person2PensionAge: 99,
    person1OtherIncomeToday: 0, person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0,
    person1WindfallAmount: 0, person1WindfallYear: 0,
    person2WindfallAmount: 0, person2WindfallYear: 0,
  });

  const annualReturns = {
    equities:  [0.50, 0],
    bonds:     [0, 0],
    cashlike:  [0, 0],
    cash:      [0, 0],
    inflation: [0, 0]
  };

  const result = simulatePath(inputs, annualReturns);

  assert(
    'year 2 spending does not exceed maxSpendingNominal cap',
    result.yearlyRows[1].actualSpendingNominal <= cap
  );
})();

/* =========================
   TEST 21 — maxSpendingNominal=0 means no cap applied
========================= */

(function testMaxSpendingNominalZeroMeansNoCap() {
  // Same setup as TEST 20 but no cap — guardrail should successfully raise spending
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
    maxSpendingNominal: 0,
    person1Age: 55, person1PensionAge: 99,
    person2Age: 55, person2PensionAge: 99,
    person1OtherIncomeToday: 0, person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0,
    person1WindfallAmount: 0, person1WindfallYear: 0,
    person2WindfallAmount: 0, person2WindfallYear: 0,
  });

  const annualReturns = {
    equities:  [0.50, 0],
    bonds:     [0, 0],
    cashlike:  [0, 0],
    cash:      [0, 0],
    inflation: [0, 0]
  };

  const result = simulatePath(inputs, annualReturns);

  assert(
    'year 2 spending is raised above initial when no cap',
    result.yearlyRows[1].actualSpendingNominal > 40000
  );
})();

/* =========================
   TEST 22 — initialWithdrawalRate present in DEFAULT_INPUTS
   Guards against the blank-field regression where applyDefaults
   received undefined and fell back to '' instead of 4.
========================= */

(function testInitialWithdrawalRateDefault() {
  assert(
    'DEFAULT_INPUTS.initialWithdrawalRate is a positive finite number',
    Number.isFinite(DEFAULT_INPUTS.initialWithdrawalRate) && DEFAULT_INPUTS.initialWithdrawalRate > 0
  );

  // An explicit value should survive normaliseInputs (it's UI-only, not transformed)
  const inputs = normaliseInputs({ initialWithdrawalRate: 3.5 });
  assertEqual(
    'explicit initialWithdrawalRate survives normaliseInputs',
    inputs.initialWithdrawalRate ?? DEFAULT_INPUTS.initialWithdrawalRate,
    3.5
  );
})();
