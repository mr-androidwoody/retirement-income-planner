import {
  loadHistoricalSeries,
  generateRollingHistoricalWindows
} from './historical-returns-provider.js';

import { aggregateScenarioResults } from './historical-aggregator.js';
import { adaptHistoricalRows } from './historical-adapter.js';
import { simulatePath, normaliseInputs } from '../simulator.js';

function toDecimal(value) {
  return Math.abs(value) > 1 ? value / 100 : value;
}

export async function runHistoricalScenario(inputs) {
  const normalisedInputs = normaliseInputs(inputs);
  const years = Number(normalisedInputs.years || 0);
  const selectedYear = Number(normalisedInputs.historicalScenario || 1929);

  const series = await loadHistoricalSeries();
  const windows = generateRollingHistoricalWindows(series, years);
  const window = windows.find((w) => w.startYear === selectedYear);

  if (!window) {
    throw new Error(`No historical window found for start year ${selectedYear}`);
  }

  const annualReturns = {
    equities: window.rows.map((row) =>
      toDecimal(Number(row.returns?.equities ?? 0))
    ),
    bonds: window.rows.map((row) =>
      toDecimal(Number(row.returns?.bonds ?? 0))
    ),
    cashlike: window.rows.map((row) =>
      toDecimal(Number(row.returns?.cashlike ?? 0))
    ),
    inflation: window.rows.map((row) =>
      toDecimal(Number(row.inflation ?? 0))
    )
  };

  const scenario = simulatePath(normalisedInputs, annualReturns);

  const rows = adaptHistoricalRows(
    scenario.yearlyRows || scenario.rows || [],
    normalisedInputs
  );

  const summary = aggregateScenarioResults([
    {
      ...scenario,
      yearlyRows: rows,
      rows,
      terminalNominal:
        scenario.pathNominal?.at(-1) ?? scenario.terminalNominal ?? 0,
      terminalReal:
        scenario.pathReal?.at(-1) ?? scenario.terminalReal ?? 0,
      startYear: window.startYear,
      endYear: window.endYear
    }
  ]);

  const cashRunwayYears = calculateCashRunwayYears(normalisedInputs);

  return {
    inputs: normalisedInputs,
    summary: {
      ...summary,
      cashRunwayYears
    },
    rows,
    yearlyRows: rows,
    pathNominal: scenario.pathNominal || [],
    pathReal: scenario.pathReal || [],
    terminalNominal:
      scenario.pathNominal?.at(-1) ?? scenario.terminalNominal ?? 0,
    terminalReal:
      scenario.pathReal?.at(-1) ?? scenario.terminalReal ?? 0,
    startYear: window.startYear,
    endYear: window.endYear,
    label: `${window.startYear} — ${window.endYear}`
  };
}

function calculateCashRunwayYears(inputs) {
  const openingCash = inputs.initialPortfolio * inputs.cashlikeAllocation;
  const firstYearPension = getStatePensionNominal(inputs, 0, 1);
  const firstYearOtherIncome = getOtherIncomeNominal(inputs, 0, 1);
  const firstYearWindfall = getWindfallNominal(inputs, 0);

  const openingNetWithdrawal = Math.max(
    0,
    inputs.initialSpending - firstYearPension - firstYearOtherIncome - firstYearWindfall
  );

  return openingNetWithdrawal > 0
    ? openingCash / openingNetWithdrawal
    : Number.POSITIVE_INFINITY;
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