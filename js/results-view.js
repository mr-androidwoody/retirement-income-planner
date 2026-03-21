import { renderPortfolioChart, renderSpendingChart } from './charts.js';
import { renderYearlyTable } from './yearly-table.js';
import {
  PLAN_OUTLOOK_STATES,
  PLAN_OUTLOOK_CONTEXT,
  PLAN_OUTLOOK_WARNINGS
} from './plan-outlook-state-definitions.js';

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

function resolvePlanOutlookPrimaryState(result, activePath) {
  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';
  const isDeterministic = mode === 'deterministic';

  const depleted = Boolean(
    result?.summary?.depleted ??
    result?.depleted ??
    activePath?.depleted
  );

  const depletionYearRaw =
    result?.summary?.depletionYear ??
    result?.depletedYear ??
    activePath?.depletionYear ??
    null;

  const depletionYear = Number.isFinite(Number(depletionYearRaw))
    ? Number(depletionYearRaw)
    : null;

  if (depleted) {
    return {
      ...PLAN_OUTLOOK_STATES.DEPLETED,
      resolvedTitle: PLAN_OUTLOOK_STATES.DEPLETED.title(depletionYear),
      resolvedBody: PLAN_OUTLOOK_STATES.DEPLETED.body,
      depletionYear
    };
  }

// HISTORICAL MODE — evaluate based on end value vs starting portfolio
if (isHistorical) {
  const startingPortfolio =
    Number(result?.inputs?.startingPortfolio ??
           result?.inputs?.initialPortfolio ?? 0);

  const endValue = Number(
    activePath?.terminalReal ??
    activePath?.terminalNominal ??
    0
  );

  if (startingPortfolio > 0 && Number.isFinite(endValue)) {
    const ratio = endValue / startingPortfolio;
    const retainedPct = Math.round(ratio * 100);

    if (ratio < 0.5) {
      return {
        ...PLAN_OUTLOOK_STATES.WEAK,
        resolvedTitle: PLAN_OUTLOOK_STATES.WEAK.title,
        resolvedBody:
          `The plan finishes with ${retainedPct}% of the starting portfolio in real terms, below the 50% threshold and under pressure.`
      };
    }

    if (ratio < 0.75) {
      return {
        ...PLAN_OUTLOOK_STATES.WATCH,
        resolvedTitle: PLAN_OUTLOOK_STATES.WATCH.title,
        resolvedBody:
          `The plan finishes with ${retainedPct}% of the starting portfolio in real terms, below the 75% threshold and leaving a reduced cushion.`
      };
    }

    return {
      ...PLAN_OUTLOOK_STATES.STRONG,
      resolvedTitle: PLAN_OUTLOOK_STATES.STRONG.title,
      resolvedBody:
        `The plan finishes with ${retainedPct}% of the starting portfolio in real terms, preserving a healthy cushion.`
    };
  }

  return {
    ...PLAN_OUTLOOK_STATES.STRONG,
    resolvedTitle: PLAN_OUTLOOK_STATES.STRONG.title,
    resolvedBody:
      'The plan finishes with at least 75% of the starting portfolio in real terms.'
  };
}
// deterministic fallback (leave as-is for now)
if (isDeterministic || !result?.monteCarlo) {
  return {
    ...PLAN_OUTLOOK_STATES.STRONG,
    resolvedTitle: PLAN_OUTLOOK_STATES.STRONG.title,
    resolvedBody: PLAN_OUTLOOK_STATES.STRONG.body
  };
}

  const successRate = Number(result?.monteCarlo?.successRate ?? 0);

  if (successRate < 0.7) {
    return {
      ...PLAN_OUTLOOK_STATES.WEAK,
      resolvedTitle: PLAN_OUTLOOK_STATES.WEAK.title,
      resolvedBody: PLAN_OUTLOOK_STATES.WEAK.body
    };
  }

  if (successRate < 0.9) {
    return {
      ...PLAN_OUTLOOK_STATES.WATCH,
      resolvedTitle: PLAN_OUTLOOK_STATES.WATCH.title,
      resolvedBody: PLAN_OUTLOOK_STATES.WATCH.body
    };
  }

  return {
    ...PLAN_OUTLOOK_STATES.STRONG,
    resolvedTitle: PLAN_OUTLOOK_STATES.STRONG.title,
    resolvedBody: PLAN_OUTLOOK_STATES.STRONG.body
  };
}

function resolvePlanOutlookContextNote(result) {
  const mode = String(result?.mode ?? '').toLowerCase();

  if (mode !== 'historical') {
    return null;
  }

  return PLAN_OUTLOOK_CONTEXT.HISTORICAL_NOTE;
}

function resolvePlanOutlookWarningGroups({
  result,
  activePath,
  useReal,
  formatters,
  suppressWarnings
}) {
  if (suppressWarnings) {
    return [];
  }

  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';

  if (isHistorical || !result?.monteCarlo) {
    return [];
  }

  const warningData = getPlanWarningsData(result, useReal, formatters, activePath);
  const groups = [];

  if (warningData.inputWarnings.length) {
    groups.push({
      ...PLAN_OUTLOOK_WARNINGS.INPUT,
      items: warningData.inputWarnings
    });
  }

  if (warningData.modelWarnings.length) {
    groups.push({
      ...PLAN_OUTLOOK_WARNINGS.MODEL,
      items: warningData.modelWarnings
    });
  }

  return groups;
}

function getPlanOutlookCardClass(primaryState) {
  if (primaryState.key === PLAN_OUTLOOK_STATES.DEPLETED.key) {
    return 'plan-status-card--weak';
  }

  if (primaryState.tone === 'red') {
    return 'plan-status-card--weak';
  }

  if (primaryState.tone === 'amber') {
    return 'plan-status-card--watch';
  }

  return 'plan-status-card--strong';
}

function getPlanOutlookIconTokenHtml(icon) {
  if (icon === 'alert-circle-filled') {
    return '<span class="plan-status-icon plan-status-icon--alert-circle-filled" aria-hidden="true">!</span>';
  }

  if (icon === 'alert') {
    return '<span class="plan-status-icon plan-status-icon--alert" aria-hidden="true">!</span>';
  }

  if (icon === 'check') {
    return '<span class="plan-status-icon plan-status-icon--check" aria-hidden="true">✓</span>';
  }

  return '';
}

function renderPlanOutlookWarningGroups(warningGroups) {
  if (!warningGroups.length) {
    return '';
  }

  return `
    <div class="plan-outlook-warnings">
      <div class="plan-outlook-warnings-grid">
        ${warningGroups
          .map(
            (group) => `
              <div class="plan-warning-group">
                <h4 class="plan-warning-group-title">${group.title}</h4>
                ${group.items
                  .map(
                    (text) => `
                      <div class="plan-warning">⚠ ${text}</div>
                    `
                  )
                  .join('')}
              </div>
            `
          )
          .join('')}
      </div>
    </div>
  `;
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
      ? worstFloorGapNominal
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

  const primaryState = resolvePlanOutlookPrimaryState(result, activePath);
  const contextNote = resolvePlanOutlookContextNote(result);

  const warningGroups = resolvePlanOutlookWarningGroups({
    result,
    activePath,
    useReal,
    formatters,
    suppressWarnings: primaryState.key === PLAN_OUTLOOK_STATES.DEPLETED.key
  });

const detailMetricsHtml = `
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

  const primaryCardClass = getPlanOutlookCardClass(primaryState);
  const primaryIconHtml = getPlanOutlookIconTokenHtml(primaryState.icon);
  const warningsHtml = renderPlanOutlookWarningGroups(warningGroups);

  container.innerHTML = `
      <div class="results-context-card results-context-card--merged">      <div class="results-context-panel-header">
        <div class="card-title-block">
          <h2>Plan outlook</h2>
          <p>A combined view of plan resilience, key risks, and supporting outcome metrics.</p>
        </div>

        <div class="results-context-header-actions">
          ${headerControls}
        </div>
      </div>

      ${contextNote ? `
        <div class="results-context-inline-note">
          ${contextNote.body}
        </div>
      ` : ''}

      ${detailMetricsHtml}

      <div class="retirement-outlook-hero">
        <div class="plan-status-card ${primaryCardClass}">
          <div class="plan-status-inline">
            ${primaryIconHtml}
            <span class="plan-status-label">${primaryState.resolvedTitle}</span>
          </div>
          <div class="plan-status-copy">
            ${primaryState.resolvedBody}
          </div>
        </div>
      </div>

      ${warningsHtml}
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