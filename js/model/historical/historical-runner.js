import {
  loadHistoricalSeries,
  generateRollingHistoricalWindows,
  createHistoricalReturnsProvider
} from './historical-returns-provider.js';

import { simulateScenario } from './historical-engine.js';
import { aggregateScenarioResults } from './historical-aggregator.js';
import { adaptHistoricalRows } from './historical-adapter.js';

export async function runHistoricalScenario(inputs) {
  const years = Number(inputs.years || inputs.simulationYears || 0);
  const selectedYear = Number(inputs.historicalScenario || 1929);

  const series = await loadHistoricalSeries();
  const windows = generateRollingHistoricalWindows(series, years);
  const window = windows.find((w) => w.startYear === selectedYear);

  if (!window) {
    throw new Error(`No historical window found for start year ${selectedYear}`);
  }

  const rawProvider = createHistoricalReturnsProvider(window.rows);
  const mappedInputs = mapInputs(inputs);

  const returnsProvider = {
    getYearReturns(yearIndex) {
      const raw = rawProvider.getYearReturns(yearIndex);

      const equityAllocation = Number(mappedInputs.equityAllocation || 0) / 100;
      const bondAllocation = Number(mappedInputs.bondAllocation || 0) / 100;
      const cashAllocation = Number(mappedInputs.cashAllocation || 0) / 100;

      const portfolioReturn =
        (raw.equities * equityAllocation) +
        (raw.bonds * bondAllocation) +
        (raw.cashlike * cashAllocation);

      return {
        portfolioReturn,
        inflation: raw.inflation
      };
    }
  };

  const scenario = simulateScenario({
    inputs: mappedInputs,
    returnsProvider
  });

  const summary = aggregateScenarioResults([
    {
      ...scenario,
      startYear: window.startYear,
      endYear: window.endYear
    }
  ]);

  const rows = adaptHistoricalRows(scenario.yearlyRows);

  return {
    inputs,
    summary,
    rows,
    yearlyRows: rows,
    pathNominal: scenario.pathNominal || [],
    pathReal: scenario.pathReal || [],
    terminalNominal: scenario.terminalNominal,
    terminalReal: scenario.terminalReal,
    startYear: window.startYear,
    endYear: window.endYear,
    label: `${window.startYear} — ${window.endYear}`
  };
}

function mapInputs(inputs) {
  return {
    startingPortfolio: inputs.initialPortfolio,
    annualSpending: inputs.initialSpending,
    years: inputs.years,

    equityAllocation: inputs.equityAllocation,
    bondAllocation: inputs.bondAllocation,
    cashAllocation: inputs.cashlikeAllocation,

    fees: inputs.annualFees,

    useGuardrails: inputs.enableGuardrails,

    guardrailFloor: inputs.lowerGuardrail,
    guardrailCeiling: inputs.upperGuardrail,
    guardrailCut: inputs.adjustmentSize,
    guardrailRaise: inputs.adjustmentSize,

    includeStatePension: true,
    statePensionToday: inputs.statePensionToday,

    people: [
      {
        include: true,
        currentAge: inputs.person1Age,
        statePensionAge: inputs.person1PensionAge,
        receivesFullStatePension: inputs.person1GetsFullPension,
        otherIncome: inputs.person1OtherIncomeToday,
        incomeYears: inputs.person1OtherIncomeYears,
        windfallAmount: inputs.person1WindfallAmount,
        windfallYear: inputs.person1WindfallYear
      },
      {
        include: inputs.includePerson2,
        currentAge: inputs.person2Age,
        statePensionAge: inputs.person2PensionAge,
        receivesFullStatePension: inputs.person2GetsFullPension,
        otherIncome: inputs.person2OtherIncomeToday,
        incomeYears: inputs.person2OtherIncomeYears,
        windfallAmount: inputs.person2WindfallAmount,
        windfallYear: inputs.person2WindfallYear
      }
    ]
  };
}