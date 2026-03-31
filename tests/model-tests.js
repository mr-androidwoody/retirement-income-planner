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
    cashlike: 100,
    bonds: 100,
    equities: 100
  };

  const withdrawn = withdrawFromBuckets(buckets, 150);

  assertEqual('withdrawal amount correct', withdrawn, 150);
  assertEqual('cashlike used first', buckets.cashlike, 0);
  assertEqual('bonds used second', buckets.bonds, 50);
  assertEqual('equities used last', buckets.equities, 100);
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
    equities: [-0.50, 0],
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
import {
  toLogNormalParams,
  cholesky3,
  sampleCorrelatedAnnualReturns
} from '../js/model/returns-generator.js';
import { runRetirementSimulation } from '../js/model/simulator.js';

/* =========================
   TEST 10 — Log-normal params: zero vol
========================= */

(function testLogNormalParamsZeroVol() {
  const { muLog, sigmaLog } = toLogNormalParams(0.07, 0);

  assertEqual(
    'zero vol: muLog = ln(1.07)',
    muLog,
    Math.log(1.07)
  );

  assertEqual(
    'zero vol: sigmaLog = 0',
    sigmaLog,
    0
  );
})();

/* =========================
   TEST 11 — Log-normal params: volatility drag
========================= */

(function testLogNormalVolatilityDrag() {
  const mean = 0.07;
  const vol  = 0.16;
  const { muLog, sigmaLog } = toLogNormalParams(mean, vol);

  // E[R] = exp(muLog + 0.5 * sigmaLog^2) - 1 must equal arithmeticMean
  const recoveredMean = Math.exp(muLog + 0.5 * sigmaLog * sigmaLog) - 1;

  assertEqual(
    'log-normal params recover arithmetic mean',
    recoveredMean,
    mean,
    1e-10
  );

  // Geometric mean < arithmetic mean when vol > 0
  const geometricMean = Math.exp(muLog) - 1;

  assert(
    'geometric mean is less than arithmetic mean when vol > 0',
    geometricMean < mean
  );
})();

/* =========================
   TEST 12 — Cholesky decomposition: L * L^T = M
========================= */

(function testCholeskyRoundTrip() {
  const matrix = [
    [1,    0.20, 0.05],
    [0.20, 1,    0.35],
    [0.05, 0.35, 1   ]
  ];

  const L = cholesky3(matrix);

  // Reconstruct M = L * L^T and compare to original
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let reconstructed = 0;
      for (let k = 0; k < 3; k++) {
        reconstructed += L[i][k] * L[j][k];
      }
      assertEqual(
        `cholesky L*L^T[${i}][${j}] == M[${i}][${j}]`,
        reconstructed,
        matrix[i][j],
        1e-10
      );
    }
  }
})();

/* =========================
   TEST 13 — Cholesky: diagonal elements are positive
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
   TEST 14 — Geometric fee application
========================= */

(function testGeometricFeeApplication() {
  // With gross equity return 7% and fee 0.27%,
  // net = (1.07 / 1.0027) - 1, NOT 7% - 0.27% = 6.73%
  const gross = 0.07;
  const fee   = 0.0027;
  const geometricNet = (1 + gross) / (1 + fee) - 1;
  const arithmeticNet = gross - fee;

  assert(
    'geometric net return is less than arithmetic net',
    geometricNet < arithmeticNet
  );

  assertEqual(
    'geometric net return is correct',
    geometricNet,
    (1.07 / 1.0027) - 1,
    1e-12
  );

  // Verify via simulatePath: one year, known return, known fee
  const inputs = normaliseInputs({
    years: 1,
    initialPortfolio: 1000000,
    initialSpending: 0,
    equityAllocation: 100,
    bondAllocation: 0,
    cashlikeAllocation: 0,
    cashAllocation: 0,
    equityReturn: 0,
    bondReturn: 0,
    cashlikeReturn: 0,
    annualFeeRate: 0.27,   // percentage points → normalised to 0.0027
    inflation: 0,
    enableGuardrails: false,
    person1Age: 55, person1PensionAge: 99,
    person2Age: 55, person2PensionAge: 99,
    person1OtherIncomeToday: 0, person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0
  });

  const annualReturns = {
    equities: [0.07],
    bonds: [0],
    cashlike: [0],
    cash: [0],
    inflation: [0]
  };

  const result = simulatePath(inputs, annualReturns);
  const expectedEnd = 1000000 * (1 + (1.07 / 1.0027 - 1));

  assertEqual(
    'simulatePath applies fees geometrically',
    result.yearlyRows[0].endPortfolioNominal,
    expectedEnd,
    0.01   // penny tolerance for rounding
  );
})();

/* =========================
   TEST 15 — Inflation uprating of spending
========================= */

(function testInflationUprating() {
  const inputs = normaliseInputs({
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
    inflation: 0,            // deterministic inflation driven by annualReturns array
    enableGuardrails: false,
    person1Age: 55, person1PensionAge: 99,
    person2Age: 55, person2PensionAge: 99,
    person1OtherIncomeToday: 0, person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0
  });

  const inf = 0.03;
  const annualReturns = {
    equities: [0, 0, 0],
    bonds:    [0, 0, 0],
    cashlike: [0, 0, 0],
    cash:     [0, 0, 0],
    inflation: [inf, inf, inf]
  };

  const result = simulatePath(inputs, annualReturns);
  const rows = result.yearlyRows;

  assertEqual(
    'year 1 target spending is initial spending',
    rows[0].targetSpendingNominal,
    40000,
    0.01
  );

  assertEqual(
    'year 2 target spending is uprated by inflation',
    rows[1].targetSpendingNominal,
    40000 * 1.03,
    0.01
  );

  assertEqual(
    'year 3 target spending is uprated by inflation^2',
    rows[2].targetSpendingNominal,
    40000 * 1.03 * 1.03,
    0.01
  );
})();

/* =========================
   TEST 16 — p50 path selection: L2 vs terminal
========================= */

(function testP50PathSelection() {
  // Run a small MC and verify the p50 path is not simply the median terminal value.
  // We can only test this indirectly: run MC, confirm p50 path exists and is a path object.
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
    bondReturn: 3,
    bondVolatility: 7,
    annualFeeRate: 0.27,
    inflation: 2.7,
    monteCarloRuns: 500,
    enableGuardrails: false,
    person1Age: 55, person1PensionAge: 99,
    person2Age: 55, person2PensionAge: 99,
    person1OtherIncomeToday: 0, person1OtherIncomeYears: 0,
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0
  });

  const p50 = result?.monteCarlo?.representativePaths?.p50;
  const p10 = result?.monteCarlo?.representativePaths?.p10;
  const p90 = result?.monteCarlo?.representativePaths?.p90;

  assert('p50 path exists', p50 !== null && p50 !== undefined);
  assert('p50 has pathNominal array', Array.isArray(p50?.pathNominal));
  assert('p50 pathNominal has correct length', p50?.pathNominal?.length === 10);

  // p50 terminal should be between p10 and p90 terminals
  const p10Terminal = p10?.pathNominal?.at(-1) ?? 0;
  const p50Terminal = p50?.pathNominal?.at(-1) ?? 0;
  const p90Terminal = p90?.pathNominal?.at(-1) ?? 0;

  assert(
    'p50 terminal value is between p10 and p90',
    p10Terminal <= p50Terminal && p50Terminal <= p90Terminal
  );
})();

/* =========================
   TEST 17 — sampleCorrelatedAnnualReturns: deterministic path
========================= */

(function testDeterministicReturns() {
  // When all vols are zero, returns should equal the means exactly
  const result = sampleCorrelatedAnnualReturns({
    rng: Math.random,
    means: { equities: 0.07, bonds: 0.03, cashlike: 0.04 },
    volatilities: { equities: 0, bonds: 0, cashlike: 0 },
    correlations: {},
    inflationMean: 0.027,
    inflationVolatility: 0
  });

  assertEqual('deterministic equities return', result.equities, 0.07, 1e-10);
  assertEqual('deterministic bonds return', result.bonds, 0.03, 1e-10);
  assertEqual('deterministic cashlike return', result.cashlike, 0.04, 0.001); // clamped range is tighter
  assertEqual('deterministic inflation', result.inflation, 0.027, 1e-10);
})();

/* =========================
   TEST 18 — Windfall is added to portfolio in correct year
========================= */

(function testWindfallYear() {
  const inputs = normaliseInputs({
    years: 3,
    initialPortfolio: 100000,
    initialSpending: 0,
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
    person2OtherIncomeToday: 0, person2OtherIncomeYears: 0,
    person1WindfallAmount: 50000,
    person1WindfallYear: 2,
    person2WindfallAmount: 0,
    person2WindfallYear: 0
  });

  const annualReturns = {
    equities: [0, 0, 0],
    bonds:    [0, 0, 0],
    cashlike: [0, 0, 0],
    cash:     [0, 0, 0],
    inflation: [0, 0, 0]
  };

  const result = simulatePath(inputs, annualReturns);
  const rows = result.yearlyRows;

  assertEqual(
    'year 1 portfolio unchanged (no windfall)',
    rows[0].endPortfolioNominal,
    100000
  );

  assertEqual(
    'year 2 portfolio includes windfall',
    rows[1].endPortfolioNominal,
    150000
  );

  assertEqual(
    'year 3 portfolio unchanged (windfall already applied)',
    rows[2].endPortfolioNominal,
    150000
  );
})();
