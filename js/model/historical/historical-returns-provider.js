const DATA_URL = new URL('../../../data/global-market-history-composite.json', import.meta.url);

let historicalDatasetPromise = null;

/**
 * Load and cache the historical market dataset.
 */
export async function loadHistoricalDataset() {
  if (!historicalDatasetPromise) {
    historicalDatasetPromise = fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load historical dataset: ${response.status} ${response.statusText}`
          );
        }

        return response.json();
      })
      .then((data) => {
        validateHistoricalDataset(data);
        return data;
      });
  }

  return historicalDatasetPromise;
}

/**
 * Return the GDP-weighted composite series.
 */
export async function loadHistoricalSeries() {
  const data = await loadHistoricalDataset();
  return data.composites.gdpWeighted.series;
}

/**
 * Create rolling historical windows.
 */
export function generateRollingHistoricalWindows(series, windowLength) {
  if (!Array.isArray(series)) {
    throw new Error('Historical series must be an array.');
  }

  if (!Number.isInteger(windowLength) || windowLength <= 0) {
    throw new Error('Window length must be a positive integer.');
  }

  if (series.length < windowLength) {
    throw new Error(
      `Not enough historical data to create ${windowLength}-year windows. ` +
      `Series length is ${series.length}.`
    );
  }

  const windows = [];

  for (let startIndex = 0; startIndex <= series.length - windowLength; startIndex += 1) {
    const rows = series.slice(startIndex, startIndex + windowLength);

    windows.push({
      startIndex,
      endIndex: startIndex + windowLength - 1,
      startYear: rows[0].year,
      endYear: rows[rows.length - 1].year,
      rows
    });
  }

  return windows;
}

/**
 * Lightweight helper for later use by providers / engine.
 */
export function createHistoricalWindowLookup(windows) {
  return windows.map((window, scenarioIndex) => ({
    scenarioIndex,
    startYear: window.startYear,
    endYear: window.endYear,
    length: window.rows.length
  }));
}

function validateHistoricalDataset(data) {
  const series = data?.composites?.gdpWeighted?.series;

  if (!Array.isArray(series)) {
    throw new Error('Dataset is missing composites.gdpWeighted.series.');
  }

  if (series.length === 0) {
    throw new Error('Historical series is empty.');
  }

  for (const row of series) {
    const year = row?.year;
    const equities = row?.returns?.equities;
    const bonds = row?.returns?.bonds;
    const cashlike = row?.returns?.cashlike;
    const inflation = row?.inflation;

    if (!Number.isFinite(year)) {
      throw new Error('Historical dataset contains a row with an invalid year.');
    }

    if (!Number.isFinite(equities) || !Number.isFinite(bonds) || !Number.isFinite(cashlike)) {
      throw new Error(`Historical dataset contains invalid returns for year ${year}.`);
    }

    if (!Number.isFinite(inflation)) {
      throw new Error(`Historical dataset contains invalid inflation for year ${year}.`);
    }
  }
}

function toDecimal(value) {
  if (!Number.isFinite(value)) {
    throw new Error('Historical returns provider received a non-numeric value.');
  }

  return value > 1 || value < -1 ? value / 100 : value;
}

export function createHistoricalReturnsProvider(windowRows) {
  return {
    getYearReturns(yearIndex) {
      const row = windowRows[yearIndex];

      if (!row) {
        throw new Error(`Missing historical return row for year index ${yearIndex}.`);
      }

      return {
        equities: toDecimal(row.returns.equities),
        bonds: toDecimal(row.returns.bonds),
        cashlike: toDecimal(row.returns.cashlike),
        inflation: toDecimal(row.inflation)
      };
    }
  };
}