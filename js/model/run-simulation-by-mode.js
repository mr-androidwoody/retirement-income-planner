import { runRetirementSimulation } from './simulator.js';
import { runHistoricalScenario } from './historical/historical-runner.js';

export async function runSimulationByMode({ mode, inputs }) {
  const normalisedMode = String(mode || 'monteCarlo').trim().toLowerCase();
  const isHistorical = normalisedMode === 'historical';
  const isDeterministic = normalisedMode === 'deterministic';
  const isMonteCarlo =
    normalisedMode === 'montecarlo' ||
    normalisedMode === 'monte-carlo' ||
    normalisedMode === 'monte_carlo';

  if (isHistorical) {
    const historicalResult = await runHistoricalScenario(inputs);

    return {
      inputs: { ...inputs },
      summary: {
        terminalNominal: historicalResult.terminalNominal ?? 0,
        terminalReal: historicalResult.terminalReal ?? 0,
        cashRunwayYears: historicalResult.summary?.cashRunwayYears ?? null,
        worstStressName: null,
        worstStressTerminalNominal: null,
        worstStressTerminalReal: null,
        historicalStartYear: historicalResult.startYear ?? null,
        historicalEndYear: historicalResult.endYear ?? null,
        depleted: Boolean(historicalResult.summary?.depleted),
        depletionYear: historicalResult.summary?.depletionYear ?? null,
        minimumWealth: historicalResult.summary?.minimumWealth ?? 0
      },
      monteCarlo: null,
      baseCase: {
        rows: historicalResult.rows || [],
        yearlyRows: historicalResult.yearlyRows || historicalResult.rows || [],
        pathNominal: historicalResult.pathNominal || [],
        pathReal: historicalResult.pathReal || [],
        terminalNominal: historicalResult.terminalNominal ?? 0,
        terminalReal: historicalResult.terminalReal ?? 0
      },
      mode: 'historical',
      tableViews: null,
      selectedPath: {
        key: `historical-${historicalResult.startYear ?? inputs?.historicalScenario ?? 'scenario'}`,
        label:
          historicalResult.label ||
          buildHistoricalLabel(historicalResult.startYear ?? inputs?.historicalScenario),
        rows: historicalResult.rows || [],
        yearlyRows: historicalResult.yearlyRows || historicalResult.rows || [],
        terminalNominal: historicalResult.terminalNominal ?? 0,
        terminalReal: historicalResult.terminalReal ?? 0
      }
    };
  }

  const result = runRetirementSimulation(inputs);
  const baseRows = result?.baseCase?.rows || [];
  const baseYearlyRows = result?.baseCase?.yearlyRows || baseRows;

  const selectedPath = {
    key: isDeterministic ? 'deterministic-base' : 'monte-carlo-median',
    label: isDeterministic ? 'Base plan' : 'Median',
    rows: baseRows,
    yearlyRows: baseYearlyRows,
    terminalNominal: result?.baseCase?.terminalNominal ?? 0,
    terminalReal: result?.baseCase?.terminalReal ?? 0
  };

    const mcPaths = result?.monteCarlo?.representativePaths;
    
    const p10 = mcPaths?.p10
      ? {
          key: 'monte-carlo-p10',
          label: 'P10 (downside)',
          rows: mcPaths.p10.rows,
          yearlyRows: mcPaths.p10.rows,
          terminalNominal: mcPaths.p10.pathNominal.at(-1),
          terminalReal: mcPaths.p10.pathReal.at(-1)
        }
      : null;
    
    const median = mcPaths?.p50
      ? {
          key: 'monte-carlo-median',
          label: 'Median',
          rows: mcPaths.p50.rows,
          yearlyRows: mcPaths.p50.rows,
          terminalNominal: mcPaths.p50.pathNominal.at(-1),
          terminalReal: mcPaths.p50.pathReal.at(-1)
        }
      : selectedPath;
    
    const p90 = mcPaths?.p90
      ? {
          key: 'monte-carlo-p90',
          label: 'P90 (upside)',
          rows: mcPaths.p90.rows,
          yearlyRows: mcPaths.p90.rows,
          terminalNominal: mcPaths.p90.pathNominal.at(-1),
          terminalReal: mcPaths.p90.pathReal.at(-1)
        }
      : null;
    
return {
  ...result,

  scenarioCount:
    result?.scenarioCount ??
    result?.monteCarlo?.scenarioCount ??
    result?.monteCarlo?.runs ??
    null,

  monteCarlo: result?.monteCarlo
    ? {
        ...result.monteCarlo,
        scenarioCount:
          result?.monteCarlo?.scenarioCount ??
          result?.scenarioCount ??
          result?.monteCarlo?.runs ??
          null
      }
    : result?.monteCarlo,

  mode: isDeterministic ? 'deterministic' : 'montecarlo',

  tableViews: isMonteCarlo
    ? {
        p10,
        median,
        p90
      }
    : null,

  selectedPath: median
};
}

function buildHistoricalLabel(scenario) {
  switch (String(scenario || '1929')) {
    case '1929':
      return '1929 — Great Depression';
    case '2008':
      return '2008 — Global Financial Crisis';
    case '2000':
      return '2000 — Dot-com bubble';
    case '1966':
      return '1966 — Inflation shock';
    case '1973':
      return '1973 — Stagflation';
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