import { buildStressScenarios } from './scenarios.js';
import {
  initialiseBuckets,
  totalPortfolio,
  applyAssetReturns,
  withdrawFromBuckets,
  rebalanceBuckets,
  weightedAverageReturn
} from './cashflow.js';
import { sampleCorrelatedAnnualReturns } from './returns-generator.js';

const DEFAULT_CORRELATIONS = Object.freeze({
  equityBond: 0.20,
  equityCashlike: 0.05,
  bondCashlike: 0.35
});

export const DEFAULT_INPUTS = {
  years: 30,
  initialPortfolio: 1000000,
  initialSpending: 40000,
  equityAllocation: 60,
  bondAllocation: 20,
  cashlikeAllocation: 20,
  rebalanceToTarget: true,

  equityReturn: 7,
  equityVolatility: 16,
  bondReturn: 3,
  bondVolatility: 7,
  cashlikeReturn: 4,
  cashlikeVolatility: 1,
  inflation: 2.5,

  person1Name: 'Person 1',
  person1Age: 57,
  person1PensionAge: 67,
  statePensionToday: 12547,
  person1PensionToday: 12547,
  person2Name: 'Person 2',
  person2Age: 58,
  person2PensionAge: 67,
  person2PensionToday: 12547,

  person1OtherIncomeToday: 0,
  person1OtherIncomeYears: 0,
  person1WindfallAmount: 0,
  person1WindfallYear: 0,

  person2OtherIncomeToday: 0,
  person2OtherIncomeYears: 0,
  person2WindfallAmount: 0,
  person2WindfallYear: 0,

  upperGuardrail: 20,
  lowerGuardrail: 20,
  adjustmentSize: 10,

  monteCarloRuns: 1000,
  seed: null,
  skipInflationAfterNegative: true,
  enableGuardrails: true,
  showRealValues: true,
  showFullTable: true
};

export function validateInputs(rawInputs = {}) {
  const inputs = normaliseInputs(rawInputs);
  const errors = [];

  if (!Number.isFinite(inputs.years) || inputs.years < 1 || inputs.years > 80) {
    errors.push('Retirement years must be between 1 and 80.');
  }

  if (!Number.isFinite(inputs.initialPortfolio) || inputs.initialPortfolio <= 0) {
    errors.push('Initial portfolio must be greater than zero.');
  }

  if (!Number.isFinite(inputs.initialSpending) || inputs.initialSpending < 0) {
    errors.push('Initial household spending must be zero or greater.');
  }

  if (!Number.isFinite(inputs.person1OtherIncomeToday) || inputs.person1OtherIncomeToday < 0) {
    errors.push('Person 1 other income today must be zero or greater.');
  }

  if (!Number.isFinite(inputs.person2OtherIncomeToday) || inputs.person2OtherIncomeToday < 0) {
    errors.push('Person 2 other income today must be zero or greater.');
  }

  if (
    !Number.isFinite(inputs.person1OtherIncomeYears) ||
    inputs.person1OtherIncomeYears < 0 ||
    inputs.person1OtherIncomeYears > inputs.years
  ) {
    errors.push('Person 1 other income years must be between 0 and retirement years.');
  }

  if (
    !Number.isFinite(inputs.person2OtherIncomeYears) ||
    inputs.person2OtherIncomeYears < 0 ||
    inputs.person2OtherIncomeYears > inputs.years
  ) {
    errors.push('Person 2 other income years must be between 0 and retirement years.');
  }

  if (!Number.isFinite(inputs.person1WindfallAmount) || inputs.person1WindfallAmount < 0) {
    errors.push('Person 1 windfall amount must be zero or greater.');
  }

  if (!Number.isFinite(inputs.person2WindfallAmount) || inputs.person2WindfallAmount < 0) {
    errors.push('Person 2 windfall amount must be zero or greater.');
  }

  if (
    !Number.isFinite(inputs.person1WindfallYear) ||
    inputs.person1WindfallYear < 0 ||
    inputs.person1WindfallYear > inputs.years
  ) {
    errors.push('Person 1 windfall year must be between 0 (this year) and how many years from this year you will receive it.');
  }

  if (
    !Number.isFinite(inputs.person2WindfallYear) ||
    inputs.person2WindfallYear < 0 ||
    inputs.person2WindfallYear > inputs.years
  ) {
    errors.push('Person 2 windfall year must be between 0 (this year) and how many years from this year you will receive it.');
  }

  const allocationTotal =
    inputs.equityAllocation +
    inputs.bondAllocation +
    inputs.cashlikeAllocation;

  if (Math.abs(allocationTotal - 1) > 0.001) {
    errors.push('Equity, bond and cashlike allocations must total 100%.');
  }

  if (
    inputs.person1PensionAge < inputs.person1Age ||
    inputs.person2PensionAge < inputs.person2Age
  ) {
    errors.push('State pension age cannot be below current age.');
  }

  if (
    !Number.isFinite(inputs.monteCarloRuns) ||
    inputs.monteCarloRuns < 10 ||
    inputs.monteCarloRuns > 50000
  ) {
    errors.push('Monte Carlo runs must be between 10 and 50,000.');
  }

  return errors;
}

export function runRetirementSimulation(rawInputs = {}) {
  const inputs = normaliseInputs(rawInputs);

  const baseCase = simulateDeterministicPath(inputs);
  const monteCarlo = runMonteCarlo(inputs);
  const summary = buildSummary(inputs, baseCase, monteCarlo);
  const stressSummary = runStressScenarios(inputs);

  return {
    inputs,
    summary: {
      ...summary,
      ...stressSummary
    },
    monteCarlo,
    baseCase
  };
}

function normaliseInputs(rawInputs = {}) {
  const merged = { ...DEFAULT_INPUTS, ...rawInputs };

  return {
    ...merged,
    years: toInt(merged.years),
    initialPortfolio: toNumber(merged.initialPortfolio),
    initialSpending: toNumber(merged.initialSpending),

    equityAllocation: toRatio(merged.equityAllocation),
    bondAllocation: toRatio(merged.bondAllocation),
    cashlikeAllocation: toRatio(merged.cashlikeAllocation),
    rebalanceToTarget: Boolean(merged.rebalanceToTarget),

    equityReturn: toRate(merged.equityReturn),
    equityVolatility: toRate(merged.equityVolatility),
    bondReturn: toRate(merged.bondReturn),
    bondVolatility: toRate(merged.bondVolatility),
    cashlikeReturn: toRate(merged.cashlikeReturn),
    cashlikeVolatility: toRate(merged.cashlikeVolatility),
    inflation: toRate(merged.inflation),

    person1Name:
      String(merged.person1Name ?? DEFAULT_INPUTS.person1Name).trim() ||
      DEFAULT_INPUTS.person1Name,
    person1Age: toInt(merged.person1Age),
    person1PensionAge: toInt(merged.person1PensionAge),
    statePensionToday: resolveSharedStatePensionToday(merged),
    person1PensionToday: resolvePersonPensionToday(merged, 'person1PensionToday'),

    person2Name:
      String(merged.person2Name ?? DEFAULT_INPUTS.person2Name).trim() ||
      DEFAULT_INPUTS.person2Name,
    person2Age: toInt(merged.person2Age),
    person2PensionAge: toInt(merged.person2PensionAge),
    person2PensionToday: resolvePersonPensionToday(merged, 'person2PensionToday'),

    person1OtherIncomeToday: toNumber(merged.person1OtherIncomeToday),
    person1OtherIncomeYears: toInt(merged.person1OtherIncomeYears),
    person1WindfallAmount: toNumber(merged.person1WindfallAmount),
    person1WindfallYear: toInt(merged.person1WindfallYear),

    person2OtherIncomeToday: toNumber(merged.person2OtherIncomeToday),
    person2OtherIncomeYears: toInt(merged.person2OtherIncomeYears),
    person2WindfallAmount: toNumber(merged.person2WindfallAmount),
    person2WindfallYear: toInt(merged.person2WindfallYear),

    upperGuardrail: toRatio(merged.upperGuardrail),
    lowerGuardrail: toRatio(merged.lowerGuardrail),
    adjustmentSize: toRatio(merged.adjustmentSize),

    monteCarloRuns: toInt(merged.monteCarloRuns),
    seed:
      merged.seed === null ||
      merged.seed === undefined ||
      merged.seed === ''
        ? null
        : toInt(merged.seed),
    skipInflationAfterNegative: Boolean(merged.skipInflationAfterNegative),
    enableGuardrails: Boolean(merged.enableGuardrails),
    showRealValues: Boolean(merged.showRealValues),
    showFullTable: Boolean(merged.showFullTable)
  };
}

function simulateDeterministicPath(inputs) {
  const annualReturns = {
    equities: Array.from({ length: inputs.years }, () => inputs.equityReturn),
    bonds: Array.from({ length: inputs.years }, () => inputs.bondReturn),
    cashlike: Array.from({ length: inputs.years }, () => inputs.cashlikeReturn),
    inflation: Array.from({ length: inputs.years }, () => inputs.inflation)
  };

  return simulatePath(inputs, annualReturns);
}

function runMonteCarlo(inputs) {
  const rng = createRng(inputs.seed ?? 123456789);
  const nominalPaths = [];
  const realPaths = [];
  let successCount = 0;

  for (let run = 0; run < inputs.monteCarloRuns; run += 1) {
    const annualReturns = {
      equities: [],
      bonds: [],
      cashlike: [],
      inflation: []
    };

    for (let year = 0; year < inputs.years; year += 1) {
      const sampled = sampleCorrelatedAnnualReturns({
        rng,
        means: {
          equities: inputs.equityReturn,
          bonds: inputs.bondReturn,
          cashlike: inputs.cashlikeReturn
        },
        volatilities: {
          equities: inputs.equityVolatility,
          bonds: inputs.bondVolatility,
          cashlike: inputs.cashlikeVolatility
        },
        correlations: DEFAULT_CORRELATIONS,
        inflationMean: inputs.inflation,
        inflationVolatility: 0,
        minInflation: -0.02
      });

      annualReturns.equities.push(sampled.equities);
      annualReturns.bonds.push(sampled.bonds);
      annualReturns.cashlike.push(sampled.cashlike);
      annualReturns.inflation.push(sampled.inflation);
    }

    const path = simulatePath(inputs, annualReturns);
    nominalPaths.push(path.pathNominal);
    realPaths.push(path.pathReal);

    if (!path.depleted) {
      successCount += 1;
    }
  }

  return {
    successRate: inputs.monteCarloRuns > 0 ? successCount / inputs.monteCarloRuns : 0,
    nominalPercentiles: buildPercentileSeries(nominalPaths),
    realPercentiles: buildPercentileSeries(realPaths)
  };
}

function runStressScenarios(inputs) {
  const scenarios = buildStressScenarios(inputs.years, {
    equityReturn: inputs.equityReturn,
    bondReturn: inputs.bondReturn,
    cashlikeReturn: inputs.cashlikeReturn,
    inflation: inputs.inflation
  });

  let worst = null;

  scenarios.forEach((scenario) => {
    const result = simulatePath(inputs, {
      equities: scenario.equityReturns,
      bonds: scenario.bondReturns,
      cashlike: scenario.cashlikeReturns,
      inflation: scenario.inflationRates
    });

    const terminalNominal = result.pathNominal[result.pathNominal.length - 1];
    const terminalReal = result.pathReal[result.pathReal.length - 1];

    if (!worst || terminalReal < worst.worstStressTerminalReal) {
      worst = {
        worstStressName: scenario.name,
        worstStressTerminalNominal: terminalNominal,
        worstStressTerminalReal: terminalReal
      };
    }
  });

  return (
    worst ?? {
      worstStressName: null,
      worstStressTerminalNominal: null,
      worstStressTerminalReal: null
    }
  );
}

function simulatePath(inputs, annualReturns) {
  const allocations = {
    equities: inputs.equityAllocation,
    bonds: inputs.bondAllocation,
    cashlike: inputs.cashlikeAllocation
  };

  let buckets = initialiseBuckets(inputs.initialPortfolio, allocations);
  let spendingNominal = inputs.initialSpending;
  let targetSpendingNominal = inputs.initialSpending;
  let inflationIndex = 1;
  let depleted = false;

  const rows = [];
  const pathNominal = [inputs.initialPortfolio];
  const pathReal = [inputs.initialPortfolio];

  const initialWithdrawalRate =
    inputs.initialPortfolio > 0
      ? inputs.initialSpending / inputs.initialPortfolio
      : 0;

  let previousMarketReturn = null;

  for (let yearIndex = 0; yearIndex < inputs.years; yearIndex += 1) {
    const year = yearIndex + 1;
    const startPortfolioNominal = totalPortfolio(buckets);
    const startPortfolioReal = startPortfolioNominal / inflationIndex;

    const pensionNominal = getStatePensionNominal(inputs, yearIndex, inflationIndex);
    const otherIncomeNominal = getOtherIncomeNominal(inputs, yearIndex, inflationIndex);
    const windfallNominal = getWindfallNominal(inputs, yearIndex);
    const totalNonPortfolioIncomeNominal =
      pensionNominal + otherIncomeNominal + windfallNominal;

    const requestedWithdrawalNominal = Math.max(
      0,
      spendingNominal - totalNonPortfolioIncomeNominal
    );
    const actualWithdrawalNominal = withdrawFromBuckets(
      buckets,
      requestedWithdrawalNominal
    );

    const actualSpendingNominal = Math.min(
      spendingNominal,
      totalNonPortfolioIncomeNominal + actualWithdrawalNominal
    );

    const surplusIncomeNominal = Math.max(
      0,
      totalNonPortfolioIncomeNominal - spendingNominal
    );

    if (surplusIncomeNominal > 0) {
      buckets.cashlike += surplusIncomeNominal;
    }

    const eqReturn = annualReturns.equities[yearIndex] ?? inputs.equityReturn;
    const bondReturn = annualReturns.bonds[yearIndex] ?? inputs.bondReturn;
    const cashReturn = annualReturns.cashlike[yearIndex] ?? inputs.cashlikeReturn;
    const inflationRate = annualReturns.inflation[yearIndex] ?? inputs.inflation;

    applyAssetReturns(buckets, {
      equities: eqReturn,
      bonds: bondReturn,
      cashlike: cashReturn
    });

    const realisedReturn = weightedAverageReturn({
      allocations,
      returns: {
        equities: eqReturn,
        bonds: bondReturn,
        cashlike: cashReturn
      }
    });

    if (inputs.rebalanceToTarget) {
      buckets = rebalanceBuckets(buckets, allocations);
    }

    inflationIndex *= 1 + inflationRate;

    const endPortfolioNominal = totalPortfolio(buckets);
    const endPortfolioReal = endPortfolioNominal / inflationIndex;

    const targetSpendingReal = targetSpendingNominal / inflationIndex;
    const actualSpendingReal = actualSpendingNominal / inflationIndex;
    const pensionReal = pensionNominal / inflationIndex;
    const otherIncomeReal = otherIncomeNominal / inflationIndex;
    const windfallReal = windfallNominal / inflationIndex;
    const withdrawalReal = actualWithdrawalNominal / inflationIndex;

    rows.push({
      year,
      age1: inputs.person1Age + yearIndex,
      age2: inputs.person2Age + yearIndex,
      startPortfolioNominal,
      startPortfolioReal,
      targetSpendingNominal,
      targetSpendingReal,
      actualSpendingNominal,
      actualSpendingReal,
      spendingNominal: actualSpendingNominal,
      spendingReal: actualSpendingReal,
      statePensionNominal: pensionNominal,
      statePensionReal: pensionReal,
      otherIncomeNominal,
      otherIncomeReal,
      windfallNominal,
      windfallReal,
      requestedWithdrawalNominal,
      requestedWithdrawalReal: requestedWithdrawalNominal / inflationIndex,
      withdrawalNominal: actualWithdrawalNominal,
      withdrawalReal,
      spendingCutNominal: Math.max(0, targetSpendingNominal - actualSpendingNominal),
      spendingCutReal: Math.max(0, targetSpendingReal - actualSpendingReal),
      spendingCutPercent:
        targetSpendingNominal > 0
          ? Math.max(0, 1 - actualSpendingNominal / targetSpendingNominal)
          : 0,
      endPortfolioNominal,
      endPortfolioReal
    });

    pathNominal.push(endPortfolioNominal);
    pathReal.push(endPortfolioReal);

    if (endPortfolioNominal <= 0.01) {
      depleted = true;
    }

    const shouldSkipInflation =
      inputs.skipInflationAfterNegative &&
      previousMarketReturn !== null &&
      previousMarketReturn < 0;

    const nextTargetSpendingNominal = targetSpendingNominal * (1 + inflationRate);
    let nextActualSpendingNominal = actualSpendingNominal;

    if (!shouldSkipInflation) {
      nextActualSpendingNominal *= 1 + inflationRate;
    }

    const nextWithdrawalRate =
      endPortfolioNominal > 0
        ? nextActualSpendingNominal / endPortfolioNominal
        : Number.POSITIVE_INFINITY;

    const upperLimit = initialWithdrawalRate * (1 + inputs.upperGuardrail);
    const lowerLimit = initialWithdrawalRate * Math.max(0, 1 - inputs.lowerGuardrail);

    if (
      inputs.enableGuardrails &&
      Number.isFinite(nextWithdrawalRate) &&
      initialWithdrawalRate > 0
    ) {
      if (nextWithdrawalRate > upperLimit) {
        nextActualSpendingNominal *= 1 - inputs.adjustmentSize;
      } else if (nextWithdrawalRate < lowerLimit) {
        nextActualSpendingNominal *= 1 + inputs.adjustmentSize;
      }
    }

    targetSpendingNominal = Math.max(0, nextTargetSpendingNominal);

    const nextIncomeOnly =
      getStatePensionNominal(inputs, yearIndex + 1, inflationIndex) +
      getOtherIncomeNominal(inputs, yearIndex + 1, inflationIndex);

    spendingNominal = Math.max(
      0,
      Math.min(nextActualSpendingNominal, nextIncomeOnly + endPortfolioNominal)
    );

    previousMarketReturn = realisedReturn;
  }

  return {
    rows,
    pathNominal,
    pathReal,
    depleted
  };
}

function buildSummary(inputs, baseCase, monteCarlo) {
  const openingCash = inputs.initialPortfolio * inputs.cashlikeAllocation;
  const firstYearPension = getStatePensionNominal(inputs, 0, 1);
  const firstYearOtherIncome = getOtherIncomeNominal(inputs, 0, 1);
  const firstYearWindfall = getWindfallNominal(inputs, 0);

  const openingNetWithdrawal = Math.max(
    0,
    inputs.initialSpending - firstYearPension - firstYearOtherIncome - firstYearWindfall
  );

  const cashRunwayYears =
    openingNetWithdrawal > 0
      ? openingCash / openingNetWithdrawal
      : Number.POSITIVE_INFINITY;

  return {
    cashRunwayYears,
    medianTerminalNominal: monteCarlo.nominalPercentiles.p50.at(-1),
    medianTerminalReal: monteCarlo.realPercentiles.p50.at(-1),
    baseTerminalNominal: baseCase.pathNominal.at(-1),
    baseTerminalReal: baseCase.pathReal.at(-1)
  };
}

function getStatePensionNominal(inputs, yearIndex, inflationIndex) {
  const person1Eligible = inputs.person1Age + yearIndex >= inputs.person1PensionAge;
  const person2Eligible = inputs.person2Age + yearIndex >= inputs.person2PensionAge;

  let total = 0;

  if (person1Eligible) {
    total += inputs.person1PensionToday * inflationIndex;
  }

  if (person2Eligible) {
    total += inputs.person2PensionToday * inflationIndex;
  }

  return total;
}

function getOtherIncomeNominal(inputs, yearIndex, inflationIndex) {
  let total = 0;

  if (yearIndex >= 0 && yearIndex < inputs.person1OtherIncomeYears) {
    total += inputs.person1OtherIncomeToday * inflationIndex;
  }

  if (yearIndex >= 0 && yearIndex < inputs.person2OtherIncomeYears) {
    total += inputs.person2OtherIncomeToday * inflationIndex;
  }

  return total;
}

function getWindfallNominal(inputs, yearIndex) {
  let total = 0;

  if (
    inputs.person1WindfallYear > 0 &&
    yearIndex + 1 === inputs.person1WindfallYear
  ) {
    total += inputs.person1WindfallAmount;
  }

  if (
    inputs.person2WindfallYear > 0 &&
    yearIndex + 1 === inputs.person2WindfallYear
  ) {
    total += inputs.person2WindfallAmount;
  }

  return total;
}

function buildPercentileSeries(paths) {
  if (!paths.length) {
    return { p10: [], p50: [], p90: [] };
  }

  const length = paths[0].length;
  const p10 = [];
  const p50 = [];
  const p90 = [];

  for (let index = 0; index < length; index += 1) {
    const values = paths.map((path) => path[index]).sort((a, b) => a - b);

    p10.push(percentile(values, 0.10));
    p50.push(percentile(values, 0.50));
    p90.push(percentile(values, 0.90));
  }

  return { p10, p50, p90 };
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;

  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function createRng(seed) {
  let state = (seed >>> 0) || 1;

  return function next() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function resolveSharedStatePensionToday(inputs) {
  if (hasMeaningfulValue(inputs?.statePensionToday)) {
    return toNumber(inputs.statePensionToday);
  }

  if (hasMeaningfulValue(inputs?.person1PensionToday)) {
    return toNumber(inputs.person1PensionToday);
  }

  if (hasMeaningfulValue(inputs?.person2PensionToday)) {
    return toNumber(inputs.person2PensionToday);
  }

  return toNumber(DEFAULT_INPUTS.statePensionToday);
}

function resolvePersonPensionToday(inputs, key) {
  if (hasMeaningfulValue(inputs?.[key])) {
    return toNumber(inputs[key]);
  }

  return resolveSharedStatePensionToday(inputs);
}

function hasMeaningfulValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toInt(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

function toRate(value) {
  const numeric = toNumber(value);
  return Math.abs(numeric) > 1 ? numeric / 100 : numeric;
}

function toRatio(value) {
  const numeric = toNumber(value);
  return Math.abs(numeric) > 1 ? numeric / 100 : numeric;
}