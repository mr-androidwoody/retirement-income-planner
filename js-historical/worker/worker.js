import { runRetirementSimulation } from "/enhanced-retirement-simulator/js/model/simulator.js";

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

function normaliseHistoricalSeries(series) {
  return series.map((row) => ({
    year: Number(row.year),
    equities: Number(row?.returns?.equities),
    bonds: Number(row?.returns?.bonds),
    cashlike: Number(row?.returns?.cashlike),
    inflation: Number(row?.inflation)
  }));
}

function buildHistoricalReturnWindows(series, years) {
  const windowSize = Number(years);
  const windows = [];

  for (let i = 0; i <= series.length - windowSize; i++) {
    const slice = series.slice(i, i + windowSize);

    windows.push({
      startYear: slice[0].year,
      endYear: slice[slice.length - 1].year,
      annualReturns: slice
    });
  }

  return windows;
}

self.onmessage = async (event) => {
  const { type, inputs } = event.data || {};

  if (type !== "run") {
    return;
  }

  try {
    const historicalData = await loadHistoricalMarketData();
    const series = historicalData?.composites?.gdpWeighted?.series;

    if (!Array.isArray(series) || series.length === 0) {
      throw new Error("Historical market data is missing composites.gdpWeighted.series.");
    }

    const historicalReturnSeries = normaliseHistoricalSeries(series);

    const historicalWindows = buildHistoricalReturnWindows(
      historicalReturnSeries,
      Number(inputs?.years)
    );

    // keep engine unchanged for now
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