import { runRetirementSimulation } from './simulator.js';

export function runSimulationByMode({ mode, inputs }) {
  const normalisedMode = String(mode || 'monteCarlo').toLowerCase();

  if (normalisedMode === 'historical') {
    return buildHistoricalStubResult(inputs);
  }

  const result = runRetirementSimulation(inputs);

  return {
    ...result,
    mode: normalisedMode,
    tableViews: null,
    selectedPath: {
      key: normalisedMode === 'deterministic' ? 'deterministic-base' : 'monte-carlo-base',
      label: normalisedMode === 'deterministic' ? 'Base plan' : 'Selected yearly path',
      rows: result?.baseCase?.rows || [],
      yearlyRows: result?.baseCase?.rows || [],
      terminalNominal: result?.baseCase?.terminalNominal ?? 0,
      terminalReal: result?.baseCase?.terminalReal ?? 0
    }
  };
}

function buildHistoricalStubResult(inputs) {
  const safeInputs = { ...inputs };

  return {
    inputs: safeInputs,
    summary: {
      terminalNominal: 0,
      terminalReal: 0,
      cashRunwayYears: null
    },
    monteCarlo: null,
    baseCase: {
      rows: [],
      terminalNominal: 0,
      terminalReal: 0
    },
    mode: 'historical',
    tableViews: null,
    selectedPath: {
      key: `historical-${safeInputs.historicalScenario || '1929'}`,
      label: buildHistoricalLabel(safeInputs.historicalScenario),
      rows: [],
      yearlyRows: [],
      terminalNominal: 0,
      terminalReal: 0
    }
  };
}

function buildHistoricalLabel(scenario) {
  switch (String(scenario || '1929')) {
    case '1929':
      return '1929 — Great Depression';
    case '1966':
      return '1966 — Inflation shock';
    case '1973':
      return '1973 — Stagflation';
    case '2000':
      return '2000 — Dot-com bubble';
    case '2008':
      return '2008 — Global Financial Crisis';
    default:
      return `${scenario} — Historical scenario`;
  }
}