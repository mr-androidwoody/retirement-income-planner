function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getMinimumWealth(scenario) {
  if (!scenario || typeof scenario !== 'object') {
    return 0;
  }

  const path =
    Array.isArray(scenario.pathReal) && scenario.pathReal.length > 0
      ? scenario.pathReal
      : scenario.pathNominal;

  if (!Array.isArray(path) || path.length === 0) {
    return 0;
  }

  return path.reduce((min, value) => {
    const num = toFiniteNumber(value);
    return num < min ? num : min;
  }, Number.POSITIVE_INFINITY);
}

function getDepletionYear(scenario) {
  if (!scenario || !Array.isArray(scenario.yearlyRows)) {
    return null;
  }

  const row = scenario.yearlyRows.find((r) => r.depleted === true);

  return row ? row.year : null;
}

function buildSingleScenarioSummary(scenario) {
  return {
    type: 'single',
    startYear: scenario.startYear ?? '',
    endYear: scenario.endYear ?? '',
    terminalNominal: toFiniteNumber(scenario.terminalNominal),
    depleted: Boolean(scenario.depleted),
    depletionYear: getDepletionYear(scenario),
    minimumWealth: getMinimumWealth(scenario)
  };
}

export function aggregateScenarioResults(scenarios) {
  const safe = Array.isArray(scenarios) ? scenarios : [];

  if (safe.length === 0) {
    return {
      type: 'single',
      startYear: '',
      endYear: '',
      terminalNominal: 0,
      depleted: false,
      depletionYear: null,
      minimumWealth: 0
    };
  }

  return buildSingleScenarioSummary(safe[0]);
}