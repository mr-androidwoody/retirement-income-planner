import {
  loadHistoricalSeries,
  generateRollingHistoricalWindows
} from './historical-returns-provider.js';

import { simulatePath } from '../simulator.js';

export async function runHistoricalScenario(inputs) {
  const years = Number(inputs.years || inputs.simulationYears || 0);
  const selectedYear = Number(inputs.historicalScenario || 1929);

  const series = await loadHistoricalSeries();
  const windows = generateRollingHistoricalWindows(series, years);
  const window = windows.find((w) => w.startYear === selectedYear);

  if (!window) {
    throw new Error(`No historical window found for start year ${selectedYear}`);
  }

  const annualReturns = {
    equities: [],
    bonds: [],
    cashlike: [],
    inflation: []
  };

  for (let i = 0; i < years; i += 1) {
    const row = window.rows[i];

    annualReturns.equities.push(Number(row?.equities) || 0);
    annualReturns.bonds.push(Number(row?.bonds) || 0);
    annualReturns.cashlike.push(Number(row?.cashlike) || 0);
    annualReturns.inflation.push(Number(row?.inflation) || 0);
  }

  const scenario = simulatePath(inputs, annualReturns);

  const terminalNominal = scenario.pathNominal.at(-1) ?? 0;
  const terminalReal = scenario.pathReal.at(-1) ?? 0;

  const minimumWealth = scenario.pathReal.length
    ? Math.min(...scenario.pathReal)
    : 0;

  const depletionYear = scenario.rows.find(
    (row) => (Number(row?.endPortfolioNominal) || 0) <= 0.01
  )?.year ?? null;

  const cashRunwayYears = calculateCashRunwayYears(inputs);

  return {
    inputs,
    summary: {
      depleted: Boolean(scenario.depleted),
      depletionYear,
      minimumWealth,
      cashRunwayYears
    },
    rows: scenario.rows || [],
    yearlyRows: scenario.rows || [],
    pathNominal: scenario.pathNominal || [],
    pathReal: scenario.pathReal || [],
    terminalNominal,
    terminalReal,
    startYear: window.startYear,
    endYear: window.endYear,
    label: `${window.startYear} — ${window.endYear}`
  };
}

function calculateCashRunwayYears(inputs) {
  const initialPortfolio = Number(inputs.initialPortfolio || 0);
  const cashlikeAllocation = toRatio(inputs.cashlikeAllocation);
  const initialSpending = Number(inputs.initialSpending || 0);

  const sharedPensionToday = Number(
    inputs.statePensionToday ??
      inputs.person1PensionToday ??
      inputs.person2PensionToday ??
      0
  );

  const openingCash = initialPortfolio * cashlikeAllocation;

  const firstYearPension =
    (Number(inputs.person1Age) >= Number(inputs.person1PensionAge)
      ? Number(inputs.person1PensionToday ?? sharedPensionToday)
      : 0) +
    (inputs.includePerson2 &&
    Number(inputs.person2Age) >= Number(inputs.person2PensionAge)
      ? Number(inputs.person2PensionToday ?? sharedPensionToday)
      : 0);

  const firstYearOtherIncome =
    (Number(inputs.person1OtherIncomeYears) > 0
      ? Number(inputs.person1OtherIncomeToday || 0)
      : 0) +
    (inputs.includePerson2 && Number(inputs.person2OtherIncomeYears) > 0
      ? Number(inputs.person2OtherIncomeToday || 0)
      : 0);

  const firstYearWindfall =
    (Number(inputs.person1WindfallYear) === 1
      ? Number(inputs.person1WindfallAmount || 0)
      : 0) +
    (inputs.includePerson2 && Number(inputs.person2WindfallYear) === 1
      ? Number(inputs.person2WindfallAmount || 0)
      : 0);

  const openingNetWithdrawal = Math.max(
    0,
    initialSpending - firstYearPension - firstYearOtherIncome - firstYearWindfall
  );

  return openingNetWithdrawal > 0
    ? openingCash / openingNetWithdrawal
    : Number.POSITIVE_INFINITY;
}

function toRatio(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.abs(numeric) > 1 ? numeric / 100 : numeric;
}