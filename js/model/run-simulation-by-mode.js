import { runRetirementSimulation } from "./simulator.js";
import { runHistoricalMode } from "./modes/run-historical.js";

export function runSimulationByMode({ mode, inputs }) {
  const normalisedMode = (mode || "monteCarlo").toLowerCase();

  if (normalisedMode === "historical") {
    return runHistoricalSingle(inputs);
  }

  // Monte Carlo + deterministic both use existing simulator
  const baseResult = runRetirementSimulation(inputs);

  return {
    ...baseResult,
    mode: normalisedMode,
    tableViews: null,
    selectedPath: {
      key: "base",
      label: "Base plan",
      yearlyRows: baseResult?.baseCase?.yearlyRows ?? []
    }
  };
}

function runHistoricalSingle(inputs) {
  const result = runHistoricalMode({
    ...inputs,
    historicalScope: "single",
    selectedHistoricalStartYear: Number(inputs.historicalScenario)
  });

  const scenario = result?.scenarios?.[0];

  return {
    inputs,
    summary: result.summary,

    mode: "historical",
    monteCarlo: null,
    baseCase: scenario,

    tableViews: null,

    selectedPath: {
      key: `historical-${scenario?.startYear}`,
      label: `${scenario?.startYear} — Historical`,
      yearlyRows: scenario?.yearlyRows ?? []
    }
  };
}