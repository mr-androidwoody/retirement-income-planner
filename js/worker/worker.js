import { runSimulationByMode } from "../model/run-simulation-by-mode.js";

self.onmessage = (event) => {
  const { type, inputs } = event.data || {};

  if (type !== "run") {
    return;
  }

  try {
    const mode = inputs?.simulationMode || "monteCarlo";

    const result = runSimulationByMode({
      mode,
      inputs
    });

    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown worker error."
    });
  }
};