import { runDeterministicMode } from "./modes/deterministic.js";
import { runMonteCarloMode } from "./modes/montecarlo.js";
import { runHistoricalMode } from "./modes/historical.js";

export async function runSimulationByMode({ mode, inputs, context = {} }) {
  const selectedMode = String(mode ?? inputs?.mode ?? "deterministic").toLowerCase();

  switch (selectedMode) {
    case "deterministic":
      return runDeterministicMode({ inputs, context });

    case "montecarlo":
    case "monte-carlo":
      return runMonteCarloMode({ inputs, context });

    case "historical":
      return runHistoricalMode({ inputs, context });

    default:
      throw new Error(`Unsupported simulation mode: ${selectedMode}`);
  }
}