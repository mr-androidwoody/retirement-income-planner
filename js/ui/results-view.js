import { renderPortfolioChart, renderSpendingChart } from './charts.js';
import { renderYearlyTable } from './yearly-table.js';

function resolveActivePath(result, tableView) {
  if (result?.tableViews && tableView && result.tableViews[tableView]) {
    return result.tableViews[tableView];
  }

  if (result?.selectedPath) {
    return result.selectedPath;
  }

  if (result?.baseCase) {
    return {
      rows: result.baseCase.yearlyRows || result.baseCase.rows || [],
      yearlyRows: result.baseCase.yearlyRows || result.baseCase.rows || [],
      terminalNominal: result.baseCase.terminalNominal,
      terminalReal: result.baseCase.terminalReal,
      pathNominal: result.baseCase.pathNominal || [],
      pathReal: result.baseCase.pathReal || []
    };
  }

  return null;
}

/* ADD THIS BLOCK */

function escapeHtmlAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMetricHeading(label, tooltip) {
  return `
    <span
      class="metric-heading-with-tooltip"
      tabindex="0"
      aria-label="${escapeHtmlAttribute(`${label}: ${tooltip}`)}"
      data-tooltip="${escapeHtmlAttribute(tooltip)}"
    >
      ${label}
    </span>
  `;
}

/* END BLOCK */

export function renderResultsView({
  result,
  elements,
  useReal,
  showFullTable,
  tableView,
  formatters
}) {
  if (!result) return;

  const { formatCurrency, formatPercent, formatYears } = formatters;

  const activePath = resolveActivePath(result, tableView);
  const rows = activePath?.yearlyRows || [];

  const hasMonteCarlo =
    Boolean(result?.monteCarlo?.realPercentiles) &&
    Boolean(result?.monteCarlo?.nominalPercentiles);

  const hasStressSummary = result.summary && result.summary.worstStressName;
  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';

  let firstCutYear = null;
  let worstCutYear = null;
  let worstCut = 0;
  let firstShortfallYear = null;
  let worstShortfallYear = null;
  let worstShortfall = 0;
  let shortfallYears = 0;

  rows.forEach((row, index) => {
    const planYear = getRowPlanYear(row, index);
    const cut = Number(row.spendingCutPercent) || 0;

    if (cut > 0 && firstCutYear === null) {
      firstCutYear = planYear;
    }

    if (cut > worstCut) {
      worstCut = cut;
      worstCutYear = planYear;
    }

    const shortfall = getRowShortfall(
      row,
      useReal,
      result.inputs?.initialSpending || 0
    );

    if (shortfall > 0) {
      shortfallYears += 1;

      if (firstShortfallYear === null) {
        firstShortfallYear = planYear;
      }

      if (shortfall > worstShortfall) {
        worstShortfall = shortfall;
        worstShortfallYear = planYear;
      }
    }
  });

  const cutDiagnostics = {
    firstCutYear,
    worstCutYear,
    worstCut,
    firstShortfallYear,
    worstShortfallYear,
    worstShortfall,
    shortfallYears
  };

  renderResultsContextAndPathSummary({
    result,
    elements,
    tableView,
    activePath,
    useReal,
    formatters
  });

  renderSummaryCardLabels(elements, result, activePath, tableView);

  if (elements.summarySuccessRate) {
    if (isHistorical) {
      elements.summarySuccessRate.textContent = result?.summary?.depleted
        ? 'Depleted'
        : 'Sustained';
    } else {
      elements.summarySuccessRate.textContent = hasMonteCarlo
        ? formatPercent(result.monteCarlo.successRate)
        : '—';
    }
  }

  if (elements.summaryMedianEnd) {
    const selectedPathValue = getSelectedPathEndValue(activePath, rows, useReal);
    elements.summaryMedianEnd.textContent = formatCurrency(selectedPathValue);
  }

  if (isHistorical) {
    if (elements.summaryWorstStress) {
      elements.summaryWorstStress.textContent = result?.summary?.depleted
        ? `Year ${result?.summary?.depletionYear ?? '—'}`
        : 'Not depleted';
    }

    if (elements.summaryWorstStressDesc) {
      elements.summaryWorstStressDesc.textContent = `Minimum portfolio reached during this historical path: ${formatCurrency(
        result?.summary?.minimumWealth ?? 0
      )}.`;
    }
  } else if (hasStressSummary) {
    if (elements.summaryWorstStress) {
      elements.summaryWorstStress.textContent = result.summary.worstStressName;
    }

    if (elements.summaryWorstStressDesc) {
      elements.summaryWorstStressDesc.textContent = `Lowest ending portfolio across the deterministic stress paths: ${formatCurrency(
        useReal
          ? result.summary.worstStressTerminalReal
          : result.summary.worstStressTerminalNominal
      )}.`;
    }
  } else {
    if (elements.summaryWorstStress) {
      elements.summaryWorstStress.textContent = 'Removed';
    }

    if (elements.summaryWorstStressDesc) {
      elements.summaryWorstStressDesc.textContent =
        'Deterministic stress scenarios are no longer shown in the UI.';
    }
  }

  const runway = result.summary?.cashRunwayYears;
  if (elements.summaryCashRunway) {
    if (isHistorical) {
      elements.summaryCashRunway.textContent = activePath?.label || 'Selected path';
    } else {
      elements.summaryCashRunway.textContent =
        runway === Number.POSITIVE_INFINITY
          ? 'No draw'
          : Number.isFinite(runway)
            ? formatYears(runway)
            : '—';
    }
  }

  if (isHistorical) {
    renderPortfolioChart(elements.portfolioChart, result, useReal, formatCurrency);

    renderSpendingChart(
      elements.spendingChart,
      result,
      useReal,
      formatCurrency,
      cutDiagnostics
    );
  } else if (hasMonteCarlo) {
    renderPortfolioChart(elements.portfolioChart, result, useReal, formatCurrency);

    renderSpendingChart(
      elements.spendingChart,
      result,
      useReal,
      formatCurrency,
      cutDiagnostics
    );
  }

  if (elements.tableCard && showFullTable) {
    let header = elements.tableCard.querySelector('.results-header-row');

    if (!header) {
      header = document.createElement('div');
      header.className = 'results-header-row';

      header.innerHTML = `
        <div class="results-header-text">
          <h3>Yearly results</h3>
          <p>
            Shows the year-by-year base-case path including spending, pension income,
            withdrawals and portfolio value.
          </p>
        </div>

        <div class="table-view-selector">
          <button data-view="median">Median</button>
          <button data-view="p10">Downside</button>
          <button data-view="p90">Upside</button>
        </div>
      `;

      elements.tableCard.prepend(header);
    }

    const selectorButtons = header.querySelectorAll('.table-view-selector button');

    selectorButtons.forEach((button) => {
      const isActive = button.dataset.view === tableView;
      button.classList.toggle('active', isActive);
    });
  }

  renderDeterministicNote(elements, result, activePath);

  renderYearlyTable(elements.resultsTable, rows, useReal, formatCurrency, {
    person1Name: result.inputs?.person1Name,
    person2Name: result.inputs?.person2Name,
    includePerson2: result.inputs?.includePerson2,
    cutDiagnostics
  });
}

function getSelectedPathEndValue(activePath, rows, useReal) {
  const toFiniteNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const firstFinite = (values) => {
    for (const value of values) {
      const n = toFiniteNumber(value);
      if (n !== null) return n;
    }
    return null;
  };

  let selectedPathSeries = useReal
    ? (activePath?.pathReal || [])
    : (activePath?.pathNominal || []);

  if (!selectedPathSeries || selectedPathSeries.length <= 1) {
    selectedPathSeries = (rows || [])
      .map((row) => {
        return useReal
          ? firstFinite([
              row.portfolioReal,
              row.endPortfolioReal,
              row.endingPortfolioReal,
              row.endReal,
              row.endPortfolio
            ])
          : firstFinite([
              row.portfolioNominal,
              row.endPortfolioNominal,
              row.endingPortfolioNominal,
              row.endPortfolio,
              row.endNominal
            ]);
      })
      .filter((v) => v !== null);
  } else {
    selectedPathSeries = selectedPathSeries
      .map((value) => toFiniteNumber(value))
      .filter((v) => v !== null);
  }

  const fallbackEndValue = toFiniteNumber(
    useReal ? activePath?.terminalReal : activePath?.terminalNominal
  ) ?? 0;

  return selectedPathSeries.length > 0
    ? selectedPathSeries[selectedPathSeries.length - 1]
    : fallbackEndValue;
}

function safePositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getResolvedSpendingFloors(inputs = {}) {
  const targetSpending = safePositiveNumber(inputs.initialSpending) ?? 0;

  const derivedComfort = Math.round(targetSpending * 0.9);
  const derivedMinimum = Math.round(targetSpending * 0.75);

  let comfortFloor =
    safePositiveNumber(inputs.comfortSpending) ?? derivedComfort;
  let minimumFloor =
    safePositiveNumber(inputs.minimumSpending) ?? derivedMinimum;

  if (targetSpending > 0) {
    comfortFloor = Math.min(comfortFloor, targetSpending);
  }

  minimumFloor = Math.min(minimumFloor, comfortFloor);

  return {
    targetSpending,
    comfortFloor,
    minimumFloor
  };
}

function getRowActualSpending(row, useReal) {
  const value = Number(useReal ? row.spendingReal : row.spendingNominal);
  return Number.isFinite(value) ? value : 0;
}

function getRowTargetSpending(row, useReal, fallbackTarget = 0) {
  const explicit = Number(
    useReal ? row.targetSpendingReal : row.targetSpendingNominal
  );

  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  const actual = getRowActualSpending(row, useReal);
  const cut = Number(row.spendingCutPercent);

  if (Number.isFinite(cut) && cut > 0 && cut < 0.95 && actual > 0) {
    return actual / (1 - cut);
  }

  return Math.max(actual, fallbackTarget);
}

function getRowPlanYear(row, index) {
  if (Number.isFinite(Number(row?.year)) && Number(row.year) > 0) {
    return Number(row.year);
  }

  return index + 1;
}

function getPlanWarningsData(result, useReal, formatters, activePath) {
  const { formatPercent } = formatters;
  const inputs = result.inputs || {};
  const percentiles = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;
  const p10 = percentiles.p10 || [];
  const planYears = inputs.years || 0;

  const inputWarnings = [];
  const modelWarnings = [];

  const startWithdrawalRate =
    inputs.initialPortfolio > 0
      ? inputs.initialSpending / inputs.initialPortfolio
      : 0;

  if (startWithdrawalRate > 0.055) {
    inputWarnings.push(
      `High starting withdrawal rate (${formatPercent(
        startWithdrawalRate
      )}), which may reduce resilience if returns are weaker than expected.`
    );
  }

  for (let i = 0; i < p10.length; i += 1) {
    if (p10[i] <= 0 && i < planYears * 0.5) {
      modelWarnings.push(
        `Weaker simulated outcomes deplete the portfolio by year ${i + 1}.`
      );
      break;
    }
  }

  return {
    inputWarnings,
    modelWarnings,
    hasWarnings: inputWarnings.length > 0 || modelWarnings.length > 0
  };
}

function getThresholdSignal(value, greenMax, amberMax) {
  if (!Number.isFinite(value)) return null;
  if (value <= greenMax) return 'green';
  if (value <= amberMax) return 'amber';
  return 'red';
}

function getYearsSignal(years) {
  if (!Number.isFinite(years)) return null;
  if (years === 0) return 'green';
  if (years <= 5) return 'amber';
  return 'red';
}

function getWorstCutSignal(cutPercent) {
  if (!Number.isFinite(cutPercent)) return null;
  if (cutPercent < 0.10) return 'green';
  if (cutPercent <= 0.25) return 'amber';
  return 'red';
}

function getInitialWithdrawalSignal(rate) {
  return getThresholdSignal(rate, 0.04, 0.06);
}

function getStatePensionRelianceSignal(rate) {
  if (!Number.isFinite(rate)) return null;
  if (rate >= 0.35) return 'green';
  if (rate >= 0.15) return 'amber';
  return 'red';
}

function getPortfolioDependenceSignal(rate) {
  return getThresholdSignal(rate, 0.40, 0.70);
}

function getWeakCaseDepletionSignal(yearValue) {
  if (yearValue === 'Not depleted') return 'green';

  const year = Number(yearValue);
  if (!Number.isFinite(year)) return null;
  if (year > 25) return 'amber';
  return 'red';
}

function getP10EndingSignal(p10End, startingPortfolio) {
  if (
    !Number.isFinite(p10End) ||
    !Number.isFinite(startingPortfolio) ||
    startingPortfolio <= 0
  ) {
    return null;
  }

  if (p10End <= 0) return 'red';

  const ratio = p10End / startingPortfolio;
  if (ratio > 0.5) return 'green';
  return 'amber';
}

function getP90EndingSignal(p90End, startingPortfolio) {
  if (
    !Number.isFinite(p90End) ||
    !Number.isFinite(startingPortfolio) ||
    startingPortfolio <= 0
  ) {
    return null;
  }

  const ratio = p90End / startingPortfolio;
  if (ratio > 2) return 'green';
  if (ratio >= 1) return 'amber';
  return 'red';
}

function getWorstShortfallSignal(amount, targetSpending) {
  if (!Number.isFinite(amount) || amount <= 0) return 'green';
  if (!Number.isFinite(targetSpending) || targetSpending <= 0) return null;

  const ratio = amount / targetSpending;
  if (ratio < 0.10) return 'amber';
  return 'red';
}

function getPlanSuccessSignal(rate) {
  if (!Number.isFinite(rate)) return null;
  if (rate >= 0.9) return 'green';
  if (rate >= 0.75) return 'amber';
  return 'red';
}

function getMedianEndingSignal(medianEnd, startingPortfolio) {
  if (
    !Number.isFinite(medianEnd) ||
    !Number.isFinite(startingPortfolio) ||
    startingPortfolio <= 0
  ) {
    return null;
  }

  const ratio = medianEnd / startingPortfolio;
  if (ratio >= 1) return 'green';
  if (ratio >= 0.25) return 'amber';
  return 'red';
}

function getBaseCaseTimingSignal(firstShortfallYear) {
  if (firstShortfallYear === null || firstShortfallYear === undefined) {
    return 'green';
  }

  if (!Number.isFinite(Number(firstShortfallYear))) {
    return null;
  }

  if (Number(firstShortfallYear) > 20) return 'amber';
  return 'red';
}

function renderResultsContextAndPathSummary({
  result,
  elements,
  tableView,
  activePath,
  useReal,
  formatters
}) {
  const container = elements.resultsContextBar;
  if (!container) return;

  const { formatCurrency } = formatters;

  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';
  const isDeterministic = mode === 'deterministic';

  const rows = activePath?.rows || activePath?.yearlyRows || [];

  const selectedEndValue = getSelectedPathEndValue(activePath, rows, useReal);
  const startingPortfolio =
    Number(result?.inputs?.startingPortfolio ?? result?.inputs?.initialPortfolio ?? 0);

  let endValueChangeDisplay = '';
  let endValueChangeClass = '';

  if (startingPortfolio > 0 && Number.isFinite(selectedEndValue)) {
    const endValueChangePct =
      (selectedEndValue - startingPortfolio) / startingPortfolio;
    const sign =
      endValueChangePct > 0 ? '+' : endValueChangePct < 0 ? '−' : '';

    endValueChangeDisplay =
      `${sign}${Math.abs(endValueChangePct * 100).toFixed(1)}% from initial investments`;

    endValueChangeClass =
      endValueChangePct >= 0
        ? 'results-context-metric-subvalue--green'
        : 'results-context-metric-subvalue--red';
  }

  const { comfortFloor, minimumFloor } =
    getResolvedSpendingFloors(result?.inputs || {});

  let firstComfortBreachYear = null;
  let firstCutAmount = 0;
  let firstCutPct = 0;
  let yearsBelowMinimumFloor = 0;
  let worstFloorGapNominal = 0;
  let worstFloorYear = null;
  let floorHeadroomPct = null;

  rows.forEach((row, index) => {
    const planYear = getRowPlanYear(row, index);
    const inflationIndex = Number(row.inflationIndex ?? 1);

    const actualNominal = Number(row.spendingNominal ?? 0);
    const actual = getRowActualSpending(row, useReal);

    const target = getRowTargetSpending(
      row,
      useReal,
      result?.inputs?.initialSpending || 0
    );

    const comfortFloorNominalForYear = comfortFloor * inflationIndex;
    const minimumFloorNominalForYear = minimumFloor * inflationIndex;

    if (
      comfortFloorNominalForYear > 0 &&
      actualNominal < comfortFloorNominalForYear &&
      firstComfortBreachYear === null
    ) {
      firstComfortBreachYear = planYear;

      if (target > 0 && actual < target) {
        firstCutAmount = target - actual;
        firstCutPct = firstCutAmount / target;
      }
    }

    if (
      minimumFloorNominalForYear > 0 &&
      actualNominal < minimumFloorNominalForYear
    ) {
      yearsBelowMinimumFloor += 1;

      const gapNominal = minimumFloorNominalForYear - actualNominal;

      if (gapNominal > worstFloorGapNominal) {
        worstFloorGapNominal = gapNominal;
        worstFloorYear = planYear;

        floorHeadroomPct =
          (actualNominal - minimumFloorNominalForYear) /
          minimumFloorNominalForYear;
      }
    }
  });

  const worstFloorGap =
    useReal && worstFloorGapNominal > 0 && minimumFloor > 0
      ? worstFloorGapNominal / ((minimumFloor * 1) / minimumFloor)
      : worstFloorGapNominal;

  const totalYears = rows.length || 0;
  const yearsBelowFloorPct =
    totalYears > 0 ? (yearsBelowMinimumFloor / totalYears) * 100 : 0;

  const firstCutDisplay =
    firstCutAmount > 0
      ? `↓ ${formatCurrency(firstCutAmount)} (−${(firstCutPct * 100).toFixed(1)}%)`
      : '';

  const firstCutClass =
    firstCutAmount > 0 ? 'results-context-metric-subvalue--red' : '';

  const floorHeadroomDisplay =
    floorHeadroomPct === null
      ? 'At or above minimum spending level'
      : `${floorHeadroomPct >= 0 ? '+' : '−'}${Math.abs(
          floorHeadroomPct * 100
        ).toFixed(1)}% vs minimum spending level`;

  const floorHeadroomClass =
    floorHeadroomPct === null
      ? 'results-context-metric-subvalue--green'
      : floorHeadroomPct >= 0
        ? 'results-context-metric-subvalue--green'
        : 'results-context-metric-subvalue--red';

  const floorBreachYearsDisplay =
    yearsBelowMinimumFloor > 0
      ? `${yearsBelowFloorPct.toFixed(1)}% of years below minimum level`
      : '0% of years below minimum level';

  const floorBreachYearsClass =
    yearsBelowMinimumFloor > 0
      ? 'results-context-metric-subvalue--red'
      : 'results-context-metric-subvalue--green';

  const summarySaysDepleted = Boolean(
    result?.summary?.depleted ??
    result?.depleted ??
    activePath?.depleted
  );

  const depletionYearFromSummary =
    result?.summary?.depletionYear ??
    result?.depletedYear ??
    activePath?.depletionYear ??
    null;

  const depletionYear = Number.isFinite(Number(depletionYearFromSummary))
    ? Number(depletionYearFromSummary)
    : null;

  const warningData =
    !isHistorical && result?.monteCarlo
      ? getPlanWarningsData(result, useReal, formatters, activePath)
      : { inputWarnings: [], modelWarnings: [], hasWarnings: false };

  let status = 'strong';
  let statusLabel = 'Strong';
  let statusIcon = '✓';
  let statusSubheading = 'Highly resilient under current assumptions';
  let statusMessage =
    'The plan is highly likely to sustain the target spending level across simulated outcomes.';

  if (isHistorical) {
    const depleted = Boolean(result?.summary?.depleted);
    status = depleted ? 'weak' : 'strong';
    statusLabel = depleted ? 'Depleted' : 'Sustained';
    statusIcon = depleted ? '×' : '✓';
    statusSubheading = activePath?.label || 'Selected historical path';
    statusMessage =
      'This result shows one selected historical return sequence rather than Monte Carlo ranges.';
  } else if (!isDeterministic && result?.monteCarlo) {
    const successRate = Number(result.monteCarlo.successRate ?? 0);

    if (successRate < 0.7) {
      status = 'weak';
      statusLabel = 'Weak';
      statusIcon = '×';
      statusSubheading = 'Material pressure under current assumptions';
      statusMessage =
        'The plan does not reliably sustain the target spending level across simulations.';
    } else if (successRate < 0.9) {
      status = 'watch';
      statusLabel = 'Watch';
      statusIcon = '!';
      statusSubheading = 'Worth monitoring under weaker outcomes';
      statusMessage =
        'The plan is broadly viable, but outcomes show some pressure and should be monitored.';
    }
  }

  const warningsHtml = isHistorical
    ? `
      <div class="plan-outlook-warnings">
        <div class="plan-warning-ok">
          Historical mode is showing one selected return sequence rather than Monte Carlo risk ranges.
        </div>
      </div>
    `
    : warningData.hasWarnings
      ? `
        <div class="plan-outlook-warnings">
          <div class="plan-outlook-warnings-grid">
            ${
              warningData.inputWarnings.length
                ? `
                  <div class="plan-warning-group">
                    <h4 class="plan-warning-group-title">Input risk</h4>
                    ${warningData.inputWarnings
                      .map(
                        (text) => `
                          <div class="plan-warning">⚠ ${text}</div>
                        `
                      )
                      .join('')}
                  </div>
                `
                : ''
            }
            ${
              warningData.modelWarnings.length
                ? `
                  <div class="plan-warning-group">
                    <h4 class="plan-warning-group-title">Model risk</h4>
                    ${warningData.modelWarnings
                      .map(
                        (text) => `
                          <div class="plan-warning">⚠ ${text}</div>
                        `
                      )
                      .join('')}
                  </div>
                `
                : ''
            }
          </div>
        </div>
      `
      : `
        <div class="plan-outlook-warnings">
          <div class="plan-warning-ok">
            ✓ No major risks detected in current plan assumptions.
          </div>
        </div>
      `;

  const detailMetricsHtml = isHistorical
    ? ''
    : `
      <div class="results-context-metrics">
        <div class="results-context-metric">
          <div class="results-context-metric-label">
            ${renderMetricHeading(
              useReal ? 'Real end value' : 'Nominal end value',
              'Portfolio value at the end of the selected path.'
            )}
          </div>
          <div class="results-context-metric-body">
            <div class="results-context-metric-value">${formatCurrency(selectedEndValue ?? 0)}</div>
            ${
              endValueChangeDisplay
                ? `<div class="results-context-metric-subvalue ${endValueChangeClass}">
                     ${endValueChangeDisplay}
                   </div>`
                : ''
            }
          </div>
        </div>

        <div class="results-context-metric">
          <div class="results-context-metric-label">
            ${renderMetricHeading(
              'First spending cut',
              'The first year when actual spending falls below planned target spending.'
            )}
          </div>
          <div class="results-context-metric-body">
            <div class="results-context-metric-value">
              ${firstComfortBreachYear ? `Year ${firstComfortBreachYear}` : 'No drop below comfort level'}
            </div>
            ${
              firstCutDisplay
                ? `<div class="results-context-metric-subvalue ${firstCutClass}">
                     ${firstCutDisplay}
                   </div>`
                : ''
            }
          </div>
        </div>

        <div class="results-context-metric">
          <div class="results-context-metric-label">
            ${renderMetricHeading(
              'Worst shortfall vs minimum',
              'The largest gap in any year between actual spending and your minimum acceptable spending level.'
            )}
          </div>
          <div class="results-context-metric-body">
            <div class="results-context-metric-value">
              ${
                worstFloorGap > 0
                  ? `${formatCurrency(worstFloorGap)}${
                      worstFloorYear ? ` (Year ${worstFloorYear})` : ''
                    }`
                  : 'None'
              }
            </div>
            <div class="results-context-metric-subvalue ${floorHeadroomClass}">
              ${floorHeadroomDisplay}
            </div>
          </div>
        </div>

        <div class="results-context-metric">
          <div class="results-context-metric-label">
            ${renderMetricHeading(
              'Years below minimum',
              'Number of years when actual spending falls below your minimum spending level.'
            )}
          </div>
          <div class="results-context-metric-body">
            <div class="results-context-metric-value">${yearsBelowMinimumFloor}</div>
            <div class="results-context-metric-subvalue ${floorBreachYearsClass}">
              ${floorBreachYearsDisplay}
            </div>
          </div>
        </div>
      </div>
    `;

  const headerControls = isHistorical
    ? `<div class="results-context-path">${(activePath?.label || 'Selected scenario').replace(/—/g, '–')}</div>`
    : isDeterministic
      ? `<div class="results-context-path">Base case</div>`
      : `
        <div class="results-context-toggle table-view-selector">
          <button data-view="p10" class="${tableView === 'p10' ? 'active' : ''}">Downside</button>
          <button data-view="median" class="${tableView === 'median' ? 'active' : ''}">Median</button>
          <button data-view="p90" class="${tableView === 'p90' ? 'active' : ''}">Upside</button>
        </div>
      `;

  const depletionAlertHtml = summarySaysDepleted
    ? `
      <div class="results-context-alert results-context-alert--warning">
        <div class="results-context-alert-icon" aria-hidden="true">!</div>
        <div class="results-context-alert-body">
          <div class="results-context-alert-title">
            Plan warning: portfolio depleted${depletionYear ? ` in Year ${depletionYear}` : ''}
          </div>
          <div class="results-context-alert-text">
            After depletion, spending is limited to guaranteed income only.
          </div>
        </div>
      </div>
    `
    : '';

  container.innerHTML = `
    <div class="results-context-card results-context-card--merged${summarySaysDepleted ? ' results-context-card--warning' : ''}">
      <div class="results-context-panel-header">
        <div class="card-title-block">
          <h2>Plan outlook</h2>
          <p>A combined view of plan resilience, key risks, and supporting outcome metrics.</p>
        </div>

        <div class="results-context-header-actions">
          ${headerControls}
        </div>
      </div>

      <div class="retirement-outlook-hero">
        <div class="retirement-outlook-hero-card">
          <div class="retirement-outlook-hero-top">
            <div class="retirement-outlook-kicker">${isHistorical ? 'Historical scenario' : 'Plan outlook'}</div>

            <div class="retirement-outlook-status-row">
              <div class="retirement-outlook-badge retirement-outlook-badge--${status}">
                <span class="retirement-outlook-badge-icon">${statusIcon}</span>
                <span>${statusLabel}</span>
              </div>

              <div class="retirement-outlook-heading-group">
                <div class="retirement-outlook-subheading">${statusSubheading}</div>
              </div>
            </div>
          </div>

          <p class="retirement-outlook-description">${statusMessage}</p>

          ${depletionAlertHtml}
        </div>
      </div>

      ${warningsHtml}

      ${detailMetricsHtml}
    </div>
  `;
}

function renderSummaryCardLabels(elements, result, activePath, tableView) {
  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';
  const isDeterministic = mode === 'deterministic';

  if (isHistorical) {
    if (elements.summarySuccessRateLabel) {
      elements.summarySuccessRateLabel.textContent = 'Historical outcome';
    }

    if (elements.summarySuccessRateDesc) {
      elements.summarySuccessRateDesc.textContent =
        'Whether this selected historical sequence sustains the plan.';
    }

    if (elements.summaryMedianEndLabel) {
      elements.summaryMedianEndLabel.textContent = 'Selected path';
    }

    if (elements.summaryMedianEndDesc) {
      elements.summaryMedianEndDesc.textContent =
        'This matches the selected historical scenario used in the charts, plan outlook, and yearly table.';
    }

    if (elements.summaryWorstStressLabel) {
      elements.summaryWorstStressLabel.textContent = 'Depletion year';
    }

    if (elements.summaryWorstStressDesc) {
      elements.summaryWorstStressDesc.textContent =
        'Earliest year the portfolio reaches zero on this historical path, or not depleted.';
    }

    if (elements.summaryCashRunwayLabel) {
      elements.summaryCashRunwayLabel.textContent = 'Cash runway at start';
    }

    if (elements.summaryCashRunwayDesc) {
      elements.summaryCashRunwayDesc.textContent =
        'Years the opening cashlike bucket could fund withdrawals before refill.';
    }

    return;
  }

  if (isDeterministic) {
    if (elements.summarySuccessRateLabel) {
      elements.summarySuccessRateLabel.textContent = 'Success rate';
    }

    if (elements.summarySuccessRateDesc) {
      elements.summarySuccessRateDesc.textContent =
        'Only applies to simulated outcomes.';
    }

    if (elements.summaryMedianEndLabel) {
      elements.summaryMedianEndLabel.textContent = 'Selected path';
    }

    if (elements.summaryMedianEndDesc) {
      elements.summaryMedianEndDesc.textContent =
        'Base case used for the current charts, plan outlook, and yearly table.';
    }

    if (elements.summaryWorstStressLabel) {
      elements.summaryWorstStressLabel.textContent = 'Worst stress scenario';
    }

    if (elements.summaryWorstStressDesc) {
      elements.summaryWorstStressDesc.textContent =
        'Lowest ending portfolio across the deterministic stress paths.';
    }

    if (elements.summaryCashRunwayLabel) {
      elements.summaryCashRunwayLabel.textContent = 'Cash runway at start';
    }

    if (elements.summaryCashRunwayDesc) {
      elements.summaryCashRunwayDesc.textContent =
        'Years the opening cashlike bucket could fund withdrawals before refill.';
    }

    return;
  }

  // Monte Carlo (default)

  if (elements.summarySuccessRateLabel) {
    elements.summarySuccessRateLabel.textContent = 'Success rate';
  }

  if (elements.summarySuccessRateDesc) {
    const runs =
      result?.scenarioCount ??
      result?.monteCarlo?.scenarioCount ??
      result?.monteCarlo?.runs ??
      null;

    const baseText =
      'How often your portfolio lasts the full retirement plan across all simulated outcomes.';

    if (runs) {
      elements.summarySuccessRateDesc.innerHTML = `
        ${baseText}
        Based on <strong>${runs.toLocaleString()}</strong> simulations.
      `;
    } else {
      elements.summarySuccessRateDesc.textContent = baseText;
    }
  }

  if (elements.summaryMedianEndLabel) {
    elements.summaryMedianEndLabel.textContent = 'Selected path';
  }

  if (elements.summaryMedianEndDesc) {
    const selectedPathDescription =
      tableView === 'p10'
        ? 'A weaker simulated outcome showing how the plan holds up under poorer return conditions.'
        : tableView === 'p90'
          ? 'A stronger simulated outcome showing how the plan performs under better return conditions.'
          : 'The middle simulated outcome, showing the central path through the range of Monte Carlo results.';

    elements.summaryMedianEndDesc.textContent = selectedPathDescription;
  }

  if (elements.summaryWorstStressLabel) {
    elements.summaryWorstStressLabel.textContent = 'Worst stress scenario';
  }

  if (elements.summaryWorstStressDesc) {
    elements.summaryWorstStressDesc.textContent =
      'Lowest ending portfolio across the deterministic stress paths.';
  }

  if (elements.summaryCashRunwayLabel) {
    elements.summaryCashRunwayLabel.textContent = 'Cash runway at start';
  }

  if (elements.summaryCashRunwayDesc) {
    elements.summaryCashRunwayDesc.textContent =
      'Years the opening cashlike bucket could fund withdrawals before refill.';
  }
}

function renderSummarySection(title, items) {
  return `
    <section class="plan-summary-section">
      <h4 class="plan-summary-section-title">${title}</h4>
      <div class="plan-summary-section-grid">
        ${items.join('')}
      </div>
    </section>
  `;
}

function renderSummaryItem(label, value, signal = null) {
  const signalClass = signal ? ` summary-item--${signal}` : '';
  const dotClass = signal
    ? ` summary-label-dot--${signal}`
    : ' summary-label-dot--neutral';

  return `
    <div class="summary-item${signalClass}">
      <div class="summary-label">
        <span class="summary-label-dot${dotClass}"></span>
        <span>${label}</span>
      </div>
      <div class="summary-value">${value}</div>
    </div>
  `;
}

function renderDeterministicNote(elements, result, activePath) {
  const note = ensureDeterministicNoteContainer(elements);
  if (!note) return;

  const mode = String(result?.mode ?? '').toLowerCase();

  if (mode === 'historical') {
    note.textContent = activePath?.label
      ? `This table shows the selected historical path: ${activePath.label}.`
      : 'This table shows the selected historical path.';
  } else if (mode === 'deterministic') {
    note.textContent = 'This table shows the deterministic base case only.';
  } else {
    note.textContent = 'This table shows the selected yearly path.';
  }

  note.classList.remove('hidden');
}

function ensureDeterministicNoteContainer(elements) {
  if (elements.deterministicNote) {
    return elements.deterministicNote;
  }

  const table = elements.resultsTable;
  const tableCard = elements.tableCard;
  if (!table || !tableCard) {
    return null;
  }

  let note = tableCard.querySelector('#deterministicNote');

  if (!note) {
    note = document.createElement('p');
    note.id = 'deterministicNote';
    note.className = 'deterministic-note hidden';

    const tableWrap = table.closest('.table-wrap');
    if (tableWrap && tableWrap.parentNode) {
      tableWrap.parentNode.insertBefore(note, tableWrap);
    } else {
      tableCard.insertBefore(note, tableCard.firstChild);
    }
  }

  elements.deterministicNote = note;
  return note;
}

function getRowShortfall(row, useReal, fallbackTarget = 0) {
  const target = getRowTargetSpending(row, useReal, fallbackTarget);
  const actual = getRowActualSpending(row, useReal);
  return Math.max(0, target - actual);
}

function formatInteger(value) {
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 0
  }).format(value);
}

const glossaryButton = document.getElementById('explainOutlookTerms');
const glossaryOverlay = document.getElementById('outlookGlossaryOverlay');
const glossaryClose = document.getElementById('closeOutlookGlossary');
const glossaryBackdrop = glossaryOverlay?.querySelector('.outlook-glossary-backdrop');

if (glossaryButton && glossaryOverlay) {
  glossaryButton.addEventListener('click', () => {
    glossaryOverlay.classList.remove('hidden');
    document.body.classList.add('glossary-open');
  });
}

if (glossaryClose && glossaryOverlay) {
  glossaryClose.addEventListener('click', () => {
    glossaryOverlay.classList.add('hidden');
    document.body.classList.remove('glossary-open');
  });
}

if (glossaryBackdrop && glossaryOverlay) {
  glossaryBackdrop.addEventListener('click', () => {
    glossaryOverlay.classList.add('hidden');
    document.body.classList.remove('glossary-open');
  });
}

document.addEventListener('keydown', (event) => {
  if (
    event.key === 'Escape' &&
    glossaryOverlay &&
    !glossaryOverlay.classList.contains('hidden')
  ) {
    glossaryOverlay.classList.add('hidden');
    document.body.classList.remove('glossary-open');
  }
});