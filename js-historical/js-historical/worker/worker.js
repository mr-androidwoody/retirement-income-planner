import { runRetirementSimulation } from "../../js/model/simulator.js";

let historicalMarketDataPromise = null;

function loadHistoricalMarketData() {
  if (!historicalMarketDataPromise) {
    historicalMarketDataPromise = fetch("../../data/global-market-history.composite.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load historical market data: ${response.status}`);
        }
        return response.json();
      });
  }

  return historicalMarketDataPromise;
}

self.onmessage = async (event) => {
  const { type, inputs } = event.data || {};

  if (type !== "run") {
    return;
  }

  try {
    const historicalData = await loadHistoricalMarketData();
    const series = historicalData?.composites?.gdpWeighted?.series;

    if (!Array.isArray(series) || !series.length) {
      throw new Error("Historical market data is missing composites.gdpWeighted.series.");
    }

    const firstRow = series[0];
    const lastRow = series[series.length - 1];

    if (!firstRow || typeof firstRow !== "object") {
      throw new Error("Historical market series has no usable rows.");
    }

    console.log("Historical dataset loaded", {
      rows: series.length,
      firstRow,
      lastRow
    });

    const result = runRetirementSimulation(inputs);

    self.postMessage({
      ok: true,
      result
    });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown worker error."
    });
  }
};