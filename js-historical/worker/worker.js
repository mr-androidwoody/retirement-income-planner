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
  return series.map((row) => {
    const year = Number(row?.year);
    const equities = Number(row?.returns?.equities);
    const bonds = Number(row?.returns?.bonds);
    const cashlike = Number(row?.returns?.cashlike);
    const inflation = Number(row?.inflation);

    if (!Number.isFinite(year)) {
      throw new Error("Historical series row is missing a valid year.");
    }

    if (!Number.isFinite(equities)) {
      throw new Error(`Historical series row ${year} is missing returns.equities.`);
    }

    if (!Number.isFinite(bonds)) {
      throw new Error(`Historical series row ${year} is missing returns.bonds.`);
    }

    if (!Number.isFinite(cashlike)) {
      throw new Error(`Historical series row ${year} is missing returns.cashlike.`);
    }

    if (!Number.isFinite(inflation)) {
      throw new Error(`Historical series row ${year} is missing inflation.`);
    }

    return {
      year,
      equities,
      bonds,
      cashlike,
      inflation
    };
  });
}

function buildHistoricalReturnWindows(historicalReturnSeries, years) {
  const windowSize = Number(years);

  if (!Number.isInteger(windowSize) || windowSize <= 0) {
    throw new Error("Historical return window size must be a positive integer.");
  }

  if (historicalReturnSeries.length < windowSize) {
    throw new Error("Historical series is shorter than the requested plan length.");
  }

  const windows = [];

  for (let startIndex = 0; startIndex <= historicalReturnSeries.length - windowSize; startIndex++) {
    const slice = historicalReturnSeries.slice(startIndex, startIndex + windowSize);

    windows.push({
      startYear: slice[0].year,
      endYear: slice[slice.length - 1].year,
      annualReturns: slice.map((row) => ({
        equities: row.equities,
        bonds: row.bonds,
        cashlike: row.cashlike,
        inflation: row.inflation
      }))
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

    const scenarioResults = historicalWindows.map((window) => {
      return runRetirementSimulation({
        ...inputs,
        historicalReturns: window.annualReturns
      });
    });

    self.postMessage({
      ok: true,
      result: scenarioResults[0]
    });

  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown worker error."
    });
  }
};