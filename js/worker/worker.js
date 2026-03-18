import { runSimulationByMode } from "../model/run-simulation-by-mode.js";

self.onmessage = async (event) => {
  const { type, inputs } = event.data || {};

  if (type !== "run") {
    return;
  }

  try {
    const mode = inputs?.simulationMode || "monteCarlo";

    const result = await runSimulationByMode({
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