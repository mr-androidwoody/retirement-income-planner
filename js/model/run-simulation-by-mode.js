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
      cashRunwayYears: null,
      worstStressName: null,
      worstStressTerminalNominal: null,
      worstStressTerminalReal: null
    },
    monteCarlo: null,
    baseCase: {
      rows: [],
      yearlyRows: [],
      pathNominal: [],
      pathReal: [],
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
      return '1929 — Severe crash (Great Depression)';
    case '2008':
      return '2008 — Severe crash (GFC)';
    case '2000':
      return '2000 — Crash + stagnation (Dot-com)';
    case '1966':
      return '1966 — Inflation shock';
    case '1973':
      return '1973 — Stagflation shock';
    case '1979':
      return '1979 — High inflation peak';
    case '1914':
      return '1914 — War disruption (WWI)';
    case '1939':
      return '1939 — War disruption (WWII)';
    case '1906':
      return '1906 — Early instability';
    case '1965':
      return '1965 — Pre-inflation peak';
    case '2001':
      return '2001 — Post dot-com stagnation';
    case '1982':
      return '1982 — Strong bull market start';
    case '1991':
      return '1991 — Long expansion';
    case '2010':
      return '2010 — Recovery bull market';
    default:
      return `${scenario} — Historical scenario`;
  }
}