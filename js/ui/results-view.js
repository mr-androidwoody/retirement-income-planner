import { renderPortfolioChart, renderSpendingChart } from './charts.js';
import { renderYearlyTable } from './yearly-table.js';
import { renderPerformanceTable } from './performance-table.js';
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

function formatHistoricalScenarioRangeLabel(result) {
  const select = document.getElementById('historicalScenario');

  if (!select) {
    return 'Historical scenario';
  }

  const startYear = Number(select.value);
  const horizonYears = Number(result?.inputs?.years);

  if (!Number.isFinite(startYear) || !Number.isFinite(horizonYears) || horizonYears <= 0) {
    return 'Historical scenario';
  }

  const endYear = startYear + horizonYears - 1;

  const labelText = String(select.selectedOptions?.[0]?.textContent || '').trim();

  const scenarioName = labelText
    .replace(/^\d{4}\s*-\s*/, '')
    .trim();

  return scenarioName
    ? `${startYear} ${scenarioName} (${startYear} - ${endYear})`
    : `${startYear} (${startYear} - ${endYear})`;
}

function formatHistoricalResultsHeader(result) {
  return `Results: Historical scenario ${formatHistoricalScenarioRangeLabel(result)}`;
}

function formatMonteCarloResultsHeader(result) {
  const runs =
    Number(result?.scenarioCount) ||
    Number(result?.monteCarlo?.scenarioCount) ||
    Number(result?.monteCarlo?.runs) ||
    Number(result?.inputs?.simulations) ||
    0;

  const formattedRuns = runs > 0 ? runs.toLocaleString() : '—';

  return `Results: Simulated outcomes (${formattedRuns})`;
}

function formatRetirementPeriodLabel(result) {
  const horizonYears = Number(result?.inputs?.years);

  if (!Number.isFinite(horizonYears) || horizonYears <= 0) {
    return '';
  }

  const mode = String(result?.mode ?? '').toLowerCase();

  let startYear = null;

  if (mode === 'historical') {
    const select = document.getElementById('historicalScenario');
    startYear = Number(select?.value);
  } else {
    startYear = Number(
      result?.inputs?.startYear ??
      result?.inputs?.retirementStartYear ??
      new Date().getFullYear()
    );
  }

  if (!Number.isFinite(startYear)) {
    return '';
  }

  const endYear = startYear + horizonYears - 1;

  return `Retirement period: ${startYear}–${endYear}`;
}

function renderResultsPanelTitle(result) {
  const titleEl = document.getElementById('resultsPanelTitle');
  if (!titleEl) return;

  const mode = String(result?.mode ?? '').toLowerCase();

  let mainTitle = 'Results';

  if (mode === 'historical') {
    const select = document.getElementById('historicalScenario');

    if (!select) {
      titleEl.textContent = 'Results';
      return;
    }

    const startYear = Number(select.value);
    const labelText = String(select.selectedOptions?.[0]?.textContent || '').trim();

    const scenarioName = labelText
      .replace(/^\d{4}\s*-\s*/, '')
      .trim();

    mainTitle = scenarioName
      ? `Results: Historical scenario ${startYear} ${scenarioName}`
      : `Results: Historical scenario ${startYear}`;
  } else if (mode === 'montecarlo') {
    mainTitle = formatMonteCarloResultsHeader(result);
  }

  const periodLabel = formatRetirementPeriodLabel(result);

  if (periodLabel) {
    titleEl.innerHTML = `
      ${mainTitle}
      <span class="results-title-subtext">${periodLabel}</span>
    `;
  } else {
    titleEl.textContent = mainTitle;
  }
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

function getTableModeSelectorHtml(tableMode) {
  return `
    <button type="button" data-mode="plan" class="${tableMode === 'plan' ? 'active' : ''}">Cashflow plan</button>
    <button type="button" data-mode="performance" class="${tableMode === 'performance' ? 'active' : ''}">Investment performance</button>
  `;
}

function renderTableModeSelector(elements, tableMode) {
  const selector = elements?.tableModeSelector;
  if (!selector) return;

  selector.innerHTML = getTableModeSelectorHtml(tableMode);
  selector.classList.remove('hidden');
}

function renderResultsTableTitle(result) {
  const titleEl = document.getElementById('resultsTableTitle');
  if (!titleEl) return;

  const mode = String(result?.mode ?? '').toLowerCase();

  if (mode === 'historical') {
    const select = document.getElementById('historicalScenario');

    if (!select) {
      titleEl.textContent = 'Yearly results view';
      return;
    }

    const startYear = Number(select.value);
    const labelText = String(select.selectedOptions?.[0]?.textContent || '').trim();

    const scenarioName = labelText
      .replace(/^\d{4}\s*-\s*/, '')
      .trim();

    titleEl.textContent = scenarioName
      ? `Yearly results view for: historic scenario ${startYear} ${scenarioName}`
      : `Yearly results view for: historic scenario ${startYear}`;

    return;
  }

  if (mode === 'montecarlo') {
    const runs =
      Number(result?.scenarioCount) ||
      Number(result?.monteCarlo?.scenarioCount) ||
      Number(result?.monteCarlo?.runs) ||
      Number(result?.inputs?.simulations) ||
      0;

    const formattedRuns = runs > 0 ? runs.toLocaleString() : '—';

    titleEl.textContent = `Yearly results view for: ${formattedRuns} simulated outcomes`;
    return;
  }

  titleEl.textContent = 'Yearly results view';
}

function renderResultsTableIntro(elements, tableMode) {
  const intro = elements?.resultsTableIntro;
  const actions = document.getElementById('tableDescriptionActions');

  if (intro) {
    intro.textContent =
      tableMode === 'performance'
        ? 'A year-by-year view of how your portfolio behaved as an investment, including returns, drawdowns, and rolling performance.'
        : 'A year-by-year view of your plan showing how spending, income, and withdrawals interact with your portfolio.';
  }

  if (actions) {
    actions.innerHTML = `
      <button
        type="button"
        id="openPerformanceSummary"
        class="button button--secondary button--small performance-summary-trigger"
      >
        Key metrics
      </button>
    `;
  }
}

function renderTableViewSelector(elements, result, tableView, tableMode) {
  const selector = elements?.tableViewSelector;
  const chartsSelector = document.getElementById('chartsViewSelector');
  const tableHeaderSelector = document.getElementById('tableHeaderViewSelector');

  if (!selector && !chartsSelector && !tableHeaderSelector) return;

  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';

  if (selector) {
    selector.innerHTML = '';
    selector.classList.add('hidden');
  }

  if (isHistorical) {
    if (chartsSelector) {
      chartsSelector.innerHTML = '';
      chartsSelector
        .closest('.results-context-header-actions')
        ?.classList.add('hidden');
    }

    if (tableHeaderSelector) {
      tableHeaderSelector.innerHTML = '';
    }

    return;
  }

  const pathSelectorHtml =
  mode === 'montecarlo'
    ? `
        <div class="table-view-selector-group">
          ${getTableViewSelectorHtml(tableView)}
        </div>
      `
    : '';

  if (chartsSelector) {
    chartsSelector.innerHTML = pathSelectorHtml;
    chartsSelector
      .closest('.results-context-header-actions')
      ?.classList.toggle('hidden', !pathSelectorHtml);
  }

  if (tableHeaderSelector) {
  tableHeaderSelector.innerHTML =
    mode === 'montecarlo'
      ? getTableViewSelectorHtml(tableView)
      : '';
}
}

function getTableViewSelectorHtml(tableView) {
  return `
    <button type="button" data-view="p10" class="${tableView === 'p10' ? 'active' : ''}">Downside</button>
    <button type="button" data-view="median" class="${tableView === 'median' ? 'active' : ''}">Median</button>
    <button type="button" data-view="p90" class="${tableView === 'p90' ? 'active' : ''}">Upside</button>
  `;
}

function renderResultsTableNote(elements, result, activePath, tableMode) {
  const note = elements?.resultsTableNote;
  if (!note) return;

  const mode = String(result?.mode ?? '').toLowerCase();
  const historicalLabel = `Historical scenario: ${formatHistoricalScenarioRangeLabel(result)}.`;

  if (mode === 'historical') {
    note.textContent =
      tableMode === 'performance'
        ? `${historicalLabel} Performance view shows portfolio changes, drawdowns, and rolling performance across this historical sequence.`
        : `${historicalLabel} Cashflow view shows how spending, income, and withdrawals evolved across this historical sequence.`;

    note.classList.remove('hidden');
    return;
  }

 

  note.textContent = '';
  note.classList.add('hidden');
}

function getPathRows(path) {
  return path?.yearlyRows || path?.rows || [];
}

function resolveBehaviourPath(result, preferredView) {
  if (!result) return null;

  if (preferredView && result?.tableViews?.[preferredView]) {
    return result.tableViews[preferredView];
  }

  if (preferredView === 'median') {
    return resolveActivePath(result, 'median');
  }

  if (preferredView === 'p25') {
    return result?.tableViews?.p25 || result?.tableViews?.p10 || resolveActivePath(result, 'p10');
  }

  return resolveActivePath(result, preferredView);
}

function buildPathBehaviourProfile(result, path, useReal = true) {
  const rows = getPathRows(path);
  const inputs = result?.inputs || {};
  const { comfortFloor, minimumFloor } = getResolvedSpendingFloors(inputs);

  const startingPortfolio = Number(
    inputs.startingPortfolio ?? inputs.initialPortfolio ?? 0
  );

  const endValue = Number(
    getSelectedPathEndValue(path, rows, useReal)
  );

  let firstAdjustmentYear = null;
  let firstBelowComfortYear = null;
  let firstBelowMinimumYear = null;
  let yearsBelowMinimum = 0;
  let worstShortfallAmount = 0;
  let worstShortfallYear = null;

  rows.forEach((row, index) => {
    const planYear = getRowPlanYear(row, index);
    const inflationIndex = Number(row?.inflationIndex ?? 1);
    const cutPct = Number(row?.spendingCutPercent ?? 0);

    const actualSpending = getRowActualSpending(row, useReal);

    const comfortFloorForYear = useReal
      ? comfortFloor
      : comfortFloor * inflationIndex;

    const minimumFloorForYear = useReal
      ? minimumFloor
      : minimumFloor * inflationIndex;

    if (cutPct > 0 && firstAdjustmentYear === null) {
      firstAdjustmentYear = planYear;
    }

    if (
      comfortFloorForYear > 0 &&
      actualSpending < comfortFloorForYear &&
      firstBelowComfortYear === null
    ) {
      firstBelowComfortYear = planYear;
    }

    if (
      minimumFloorForYear > 0 &&
      actualSpending < minimumFloorForYear
    ) {
      yearsBelowMinimum += 1;

      if (firstBelowMinimumYear === null) {
        firstBelowMinimumYear = planYear;
      }

      const gap = minimumFloorForYear - actualSpending;

      if (gap > worstShortfallAmount) {
        worstShortfallAmount = gap;
        worstShortfallYear = planYear;
      }
    }
  });

  const depleted = Boolean(
    result?.summary?.depleted ??
    result?.depleted ??
    path?.depleted
  );

  const depletionYearRaw =
    result?.summary?.depletionYear ??
    result?.depletedYear ??
    path?.depletionYear ??
    null;

  const depletionYear = Number.isFinite(Number(depletionYearRaw))
    ? Number(depletionYearRaw)
    : null;

  return {
    rows,
    depleted,
    depletionYear,
    endValue,
    endValuePctVsStart:
      startingPortfolio > 0 && Number.isFinite(endValue)
        ? endValue / startingPortfolio
        : null,
    firstAdjustmentYear,
    firstBelowComfortYear,
    firstBelowMinimumYear,
    yearsBelowMinimum,
    worstShortfallAmount,
    worstShortfallYear,
    neverAdjusted: firstAdjustmentYear === null,
    neverBelowComfort: firstBelowComfortYear === null,
    neverBelowMinimum: yearsBelowMinimum === 0
  };
}

function resolvePlanOutlookPrimaryState(result, profiles) {
  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';

  const medianProfile = profiles?.medianProfile || null;
  const downsideProfile = profiles?.downsideProfile || medianProfile || null;
  const activeProfile = profiles?.activeProfile || medianProfile || downsideProfile || null;

  if (activeProfile?.depleted) {
    return {
      ...PLAN_OUTLOOK_STATES.DEPLETED,
      resolvedTitle: PLAN_OUTLOOK_STATES.DEPLETED.title(activeProfile.depletionYear),
      resolvedBody: PLAN_OUTLOOK_STATES.DEPLETED.body,
      depletionYear: activeProfile.depletionYear
    };
  }

  if (isHistorical) {
    if (activeProfile?.yearsBelowMinimum > 0) {
      return {
        ...PLAN_OUTLOOK_STATES.WEAK,
        resolvedTitle: 'Weak — spending falls below minimum',
        resolvedBody:
          activeProfile.yearsBelowMinimum === 1
            ? 'The plan drops below the minimum spending level in 1 year.'
            : `The plan drops below the minimum spending level in ${activeProfile.yearsBelowMinimum} years.`
      };
    }

    if (activeProfile?.firstBelowComfortYear !== null) {
      return {
        ...PLAN_OUTLOOK_STATES.WATCH,
        resolvedTitle: 'Watch — comfort level not maintained',
        resolvedBody:
          `The plan first falls below the comfort spending level in Year ${activeProfile.firstBelowComfortYear}.`
      };
    }

    return {
      ...PLAN_OUTLOOK_STATES.STRONG,
      resolvedTitle: 'Strong — spending maintained',
      resolvedBody:
        'The historical path maintains the comfort spending level throughout the plan.'
    };
  }

  const successRate = Number(result?.monteCarlo?.successRate ?? 0);
  const successPct = Number.isFinite(successRate)
    ? Math.round(successRate * 100)
    : null;

  if (
    successRate < 0.7 ||
    (downsideProfile?.yearsBelowMinimum ?? 0) > 0
  ) {
    return {
      ...PLAN_OUTLOOK_STATES.WEAK,
      resolvedTitle: 'Weak — downside pressure is material',
      resolvedBody:
        successPct === null
          ? 'The plan is under pressure in weaker outcomes.'
          : `The plan succeeds in ${successPct}% of simulated outcomes, and weaker outcomes fall below minimum spending.`
    };
  }

  if (
    successRate < 0.9 ||
    downsideProfile?.firstBelowComfortYear !== null ||
    medianProfile?.firstBelowComfortYear !== null
  ) {
    return {
      ...PLAN_OUTLOOK_STATES.WATCH,
      resolvedTitle: 'Watch — comfort may not be maintained',
      resolvedBody:
        downsideProfile?.firstBelowComfortYear !== null
          ? `In weaker outcomes, spending first falls below comfort level in Year ${downsideProfile.firstBelowComfortYear}.`
          : 'The plan is sensitive to weaker market conditions.'
    };
  }

  return {
    ...PLAN_OUTLOOK_STATES.STRONG,
    resolvedTitle: 'Strong — comfort level maintained',
    resolvedBody:
      'The plan maintains the comfort spending level throughout the core projected paths.'
  };
}

function renderTopRowCardValues({
  result,
  elements,
  activePath,
  profiles,
  useReal,
  formatters
}) {
  const { formatCurrency, formatPercent } = formatters;
  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';
  const hasStressSummary = Boolean(result?.summary?.worstStressName);

  const medianProfile = profiles?.medianProfile || null;
  const activeProfile = profiles?.activeProfile || medianProfile || null;

  const setText = (el, value) => {
    if (el) el.textContent = value;
  };

  const successCard = document.getElementById('summarySuccessRateCard');

  if (successCard) {
    successCard.classList.remove('is-strong', 'is-weak', 'is-watch');
  }

  // Panel 1: Success / historical outcome
  if (elements.summarySuccessRate) {
    if (isHistorical) {
      const depleted = Boolean(activeProfile?.depleted);

      setText(elements.summarySuccessRate, depleted ? 'Depleted' : 'Sustained');

      if (successCard) {
        successCard.classList.add(depleted ? 'is-weak' : 'is-strong');
      }
    } else {
      const rate = Number(result?.monteCarlo?.successRate);

      if (Number.isFinite(rate)) {
        setText(elements.summarySuccessRate, formatPercent(rate));

        if (successCard) {
          if (rate >= 0.9) {
            successCard.classList.add('is-strong');
          } else if (rate < 0.6) {
            successCard.classList.add('is-weak');
          } else {
            successCard.classList.add('is-watch');
          }
        }
      } else {
        setText(elements.summarySuccessRate, '—');
      }
    }
  }

  // Panel 2: Expected outcome (median path)
  if (elements.summaryMedianEnd) {
    const expectedValue = Number(
      medianProfile?.endValue ??
      getSelectedPathEndValue(activePath, getPathRows(activePath), useReal)
    );

    setText(
      elements.summaryMedianEnd,
      Number.isFinite(expectedValue) ? formatCurrency(expectedValue) : '—'
    );
  }

  if (elements.summaryMedianEndDesc) {
    const medianDepleted = Boolean(medianProfile?.depleted);
    const endPctVsStart = Number(medianProfile?.endValuePctVsStart);

    if (medianDepleted) {
      setText(
        elements.summaryMedianEndDesc,
        'Funds spending until depletion.'
      );
    } else if (Number.isFinite(endPctVsStart) && endPctVsStart <= 0.1) {
      setText(
        elements.summaryMedianEndDesc,
        'Funds spending, ending close to zero.'
      );
    } else {
      setText(
        elements.summaryMedianEndDesc,
        'After funding your planned spending throughout.'
      );
    }
  }

  // Panel 3: Worst observed outcome
  if (elements.summaryWorstStress) {
    if (isHistorical) {
      const depletionYear = activeProfile?.depletionYear;

      setText(
        elements.summaryWorstStress,
        activeProfile?.depleted
          ? `Year ${depletionYear ?? '—'}`
          : 'Not depleted'
      );
    } else if (hasStressSummary) {
      const worstObservedValue = Number(
        useReal
          ? result?.summary?.worstStressTerminalReal
          : result?.summary?.worstStressTerminalNominal
      );

      setText(
        elements.summaryWorstStress,
        Number.isFinite(worstObservedValue)
          ? formatCurrency(worstObservedValue)
          : '—'
      );
    } else {
      setText(elements.summaryWorstStress, '—');
    }
  }

    if (elements.summaryWorstStressDesc) {
      let worstValue = null;
    
      if (isHistorical) {
        worstValue = Number(result?.summary?.minimumWealth);
      } else if (hasStressSummary) {
        worstValue = Number(
          useReal
            ? result?.summary?.worstStressTerminalReal
            : result?.summary?.worstStressTerminalNominal
        );
      }
    
      if (Number.isFinite(worstValue) && worstValue <= 0) {
        // Full depletion
        setText(
          elements.summaryWorstStressDesc,
          'Portfolio fully depleted in worst cases.'
        );
      } else if (Number.isFinite(worstValue) && worstValue < (result?.inputs?.startingPortfolio || 0) * 0.5) {
        // Significant loss (e.g. >50% drawdown)
        setText(
          elements.summaryWorstStressDesc,
          'Large losses in worst cases.'
        );
      } else {
        // No severe downside
        setText(
          elements.summaryWorstStressDesc,
          'No severe downside observed.'
        );
      }
    }

  // Panel 4: First below comfort (median)
  if (elements.summaryCashRunway) {
    const firstBelowComfortYear = medianProfile?.firstBelowComfortYear;

    setText(
      elements.summaryCashRunway,
      firstBelowComfortYear == null ? 'Never' : `Year ${firstBelowComfortYear}`
    );
  }

  if (elements.summaryCashRunwayDesc) {
    const firstBelowComfortYear = medianProfile?.firstBelowComfortYear;

    if (firstBelowComfortYear == null) {
      setText(
        elements.summaryCashRunwayDesc,
        'Comfort spending maintained throughout.'
      );
    } else if (firstBelowComfortYear <= 5) {
      setText(
        elements.summaryCashRunwayDesc,
        `Spending pressure begins early (Year ${firstBelowComfortYear}).`
      );
    } else {
      setText(
        elements.summaryCashRunwayDesc,
        `Falls below comfort in Year ${firstBelowComfortYear}.`
      );
    }
  }
}

export function renderResultsView({
  result,
  elements,
  useReal,
  showFullTable,
  tableView,
  tableMode = 'plan',
  formatters
}) {
  if (!result) return;

  const { formatCurrency, formatPercent } = formatters;

  const activePath = resolveActivePath(result, tableView);
  const rows = activePath?.yearlyRows || [];

  renderResultsPanelTitle(result);

  const hasMonteCarlo =
    Boolean(result?.monteCarlo?.realPercentiles) &&
    Boolean(result?.monteCarlo?.nominalPercentiles);

  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';

  if (elements.tableCard) {
    elements.tableCard.classList.toggle(
      'is-performance-table',
      tableMode === 'performance'
    );
    elements.tableCard.classList.toggle(
      'is-plan-table',
      tableMode !== 'performance'
    );
  }

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
      true,
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

  const medianPath =
    resolveBehaviourPath(result, 'median') || activePath;

  const downsidePath =
    resolveBehaviourPath(result, 'p25') ||
    resolveBehaviourPath(result, 'p10') ||
    activePath;

    const profiles = {
      activeProfile: buildPathBehaviourProfile(result, activePath, true),
      medianProfile: buildPathBehaviourProfile(result, medianPath, true),
      downsideProfile: buildPathBehaviourProfile(result, downsidePath, true)
    };

    if (elements.resultsContextBar) {
      elements.resultsContextBar.innerHTML = '';
      elements.resultsContextBar.classList.add('hidden');
    }

  renderTableModeSelector(elements, tableMode);
  renderResultsTableTitle(result);
  renderResultsTableIntro(elements, tableMode);
  renderTableViewSelector(elements, result, tableView, tableMode);

  const button = document.getElementById('openPerformanceSummary');

  if (button) {
    const summary = computePerformanceSummary(rows, result, useReal);

    button.replaceWith(button.cloneNode(true));
    const newButton = document.getElementById('openPerformanceSummary');

    if (newButton) {
      newButton.onclick = () => {
        openPerformanceSummaryOverlay(summary, {
          formatPercent,
          formatCurrency
        });
      };
    }
  }

  renderSummaryCardLabels(elements, result, tableView);
  renderTopRowCardValues({
    result,
    elements,
    activePath,
    profiles,
    useReal,
    formatters
  });

  if (isHistorical || hasMonteCarlo) {
    renderPortfolioChart(
      elements.portfolioChart,
      result,
      useReal,
      formatCurrency,
      tableView
    );

    renderSpendingChart(
      elements.spendingChart,
      rows,
      useReal,
      formatCurrency,
      cutDiagnostics
    );
  }

  renderResultsTableNote(elements, result, activePath, tableMode);
  renderResultsTableLegend(elements, result, tableMode);

  clearPerformanceSummary(elements);

  if (tableMode === 'performance') {
    renderPerformanceTable(elements.resultsTable, rows, formatCurrency, {
      activePath,
      inputs: result.inputs,
      tableView,
      useReal
    });
  } else {
    renderYearlyTable(elements.resultsTable, rows, useReal, formatCurrency, {
      person1Name: result.inputs?.person1Name,
      person2Name: result.inputs?.person2Name,
      includePerson2: result.inputs?.includePerson2,
      cutDiagnostics
    });
  }
}

function renderPerformanceSummaryOverlayBody(summary, formatters) {
  if (!summary) return '';

  const { formatPercent, formatCurrency } = formatters;

  const valueWithClass = (v, { signed = false, currency = false } = {}) => {
    if (!Number.isFinite(v)) {
      return { text: '—', className: '' };
    }

    if (currency) {
      return {
        text: formatCurrency(v),
        className: ''
      };
    }

    return {
      text: `${signed && v > 0 ? '+' : ''}${formatPercent(v)}`,
      className:
        v > 0
          ? 'performance-summary-metric__value--positive'
          : v < 0
            ? 'performance-summary-metric__value--negative'
            : ''
    };
  };

  const items = summary.mode === 'historical'
    ? [
        {
          label: 'Portfolio value at start',
          description: 'Starting portfolio value for this scenario',
          value: valueWithClass(summary.startValue, { currency: true })
        },
        {
          label: 'Portfolio value at end',
          description: 'Ending portfolio value for this scenario',
          value: valueWithClass(summary.endValue, { currency: true })
        },
        {
          label: 'Portfolio value CAGR',
          description: 'Annualised growth of your portfolio value',
          value: valueWithClass(summary.portfolioValueCagr)
        },
        {
          label: 'Max drawdown',
          description: 'Largest peak-to-trough portfolio fall',
          value: valueWithClass(summary.maxDrawdown)
        },
        {
          label: 'Worst rolling 5-year return',
          description: 'Worst annualised return over any 5-year period',
          value: valueWithClass(summary.worstRollingFiveYearReturn)
        },
        {
          label: 'Best rolling 5-year return',
          description: 'Best annualised return over any 5-year period',
          value: valueWithClass(summary.bestRollingFiveYearReturn)
        }
      ]
    : [
        {
          label: 'Portfolio value CAGR',
          description: 'Annualised growth of your portfolio value',
          value: valueWithClass(summary.portfolioValueCagr)
        },
        {
          label: 'Market CAGR',
          description: 'Annualised return of the underlying market',
          value: valueWithClass(summary.marketCagr)
        },
        {
          label: 'Return gap',
          description: 'Difference between your returns and the market',
          value: valueWithClass(summary.returnGap, { signed: true })
        },
        {
          label: 'Max drawdown',
          description: 'Largest peak-to-trough portfolio fall',
          value: valueWithClass(summary.maxDrawdown)
        },
        {
          label: 'Worst year return',
          description: 'Largest loss in a single year',
          value: valueWithClass(summary.worstYearReturn)
        },
        {
          label: 'Worst rolling 5-year return',
          description: 'Worst annualised return over any 5-year period',
          value: valueWithClass(summary.worstRollingFiveYearReturn)
        },
        {
          label: 'Best rolling 5-year return',
          description: 'Best annualised return over any 5-year period',
          value: valueWithClass(summary.bestRollingFiveYearReturn)
        },
        {
          label: 'End portfolio growth',
          description: 'Percentage change in ending portfolio versus starting value',
          value: valueWithClass(summary.endPortfolioGrowth, { signed: true })
        }
      ];

  return `
    <div class="performance-summary-grid">
      ${items
        .map(
          ({ label, description, value }) => `
            <div class="performance-summary-metric">
              <div class="performance-summary-metric__label">${label}</div>
              <div class="performance-summary-metric__description">${description}</div>
              <div class="performance-summary-metric__value ${value.className}">
                ${value.text}
              </div>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function clearPerformanceSummary(elements) {
  const container = elements?.performanceSummary;
  if (!container) return;

  container.innerHTML = '';
  container.classList.add('hidden');
}

function computePerformanceSummary(rows, result, useReal = false) {
  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      mode,
      startValue: null,
      endValue: null,
      years: 0,
      portfolioValueCagr: null,
      marketCagr: null,
      returnGap: null,
      maxDrawdown: null,
      worstYearReturn: null,
      worstRollingFiveYearReturn: null,
      bestRollingFiveYearReturn: null,
      endPortfolioGrowth: null,
      validMarketYears: 0
    };
  }

  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];

  const inputStartValue = Number(
    result?.inputs?.startingPortfolio ?? result?.inputs?.initialPortfolio
  );

  const startValue =
    Number.isFinite(inputStartValue) && inputStartValue > 0
      ? inputStartValue
      : Number(
          useReal
            ? firstRow?.startPortfolioReal ?? firstRow?.startPortfolioNominal
            : firstRow?.startPortfolioNominal
        );

  const endValue = Number(
    useReal
      ? lastRow?.endPortfolioReal ?? lastRow?.endPortfolioNominal
      : lastRow?.endPortfolioNominal
  );

  const years = rows.length;

  const portfolioValueCagr =
    Number.isFinite(startValue) &&
    Number.isFinite(endValue) &&
    startValue > 0 &&
    endValue > 0 &&
    years > 0
      ? Math.pow(endValue / startValue, 1 / years) - 1
      : null;

  let marketGrowthFactor = 1;
  let validMarketYears = 0;

  rows.forEach((row) => {
    const r = Number(row?.marketReturn);
    if (Number.isFinite(r)) {
      marketGrowthFactor *= (1 + r);
      validMarketYears += 1;
    }
  });

  const marketCagr =
    !isHistorical && validMarketYears > 0 && marketGrowthFactor > 0
      ? Math.pow(marketGrowthFactor, 1 / validMarketYears) - 1
      : null;

  const returnGap =
    !isHistorical &&
    Number.isFinite(portfolioValueCagr) &&
    Number.isFinite(marketCagr)
      ? portfolioValueCagr - marketCagr
      : null;

  let peak =
    Number.isFinite(startValue) && startValue > 0
      ? startValue
      : Number(
          useReal
            ? firstRow?.endPortfolioReal ?? firstRow?.endPortfolioNominal
            : firstRow?.endPortfolioNominal
        ) || 0;

  let maxDrawdown = 0;

  rows.forEach((row) => {
    const end = Number(
      useReal
        ? row?.endPortfolioReal ?? row?.endPortfolioNominal
        : row?.endPortfolioNominal
    );

    if (!Number.isFinite(end) || end <= 0) return;

    if (end > peak) peak = end;

    if (peak > 0) {
      const drawdown = (end / peak) - 1;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  });

  let worstYearReturn = null;

  if (!isHistorical) {
    rows.forEach((row) => {
      const r = Number(row?.marketReturn);
      if (!Number.isFinite(r)) return;

      if (worstYearReturn === null || r < worstYearReturn) {
        worstYearReturn = r;
      }
    });
  }

  let worstRollingFiveYearReturn = null;
  let bestRollingFiveYearReturn = null;

  const rollingBaseValues = [
    startValue,
    ...rows.map((row) =>
      Number(
        useReal
          ? row?.endPortfolioReal ?? row?.endPortfolioNominal
          : row?.endPortfolioNominal
      )
    )
  ];

  for (let index = 5; index < rollingBaseValues.length; index += 1) {
    const start5 = Number(rollingBaseValues[index - 5]);
    const end5 = Number(rollingBaseValues[index]);

    if (
      Number.isFinite(start5) &&
      Number.isFinite(end5) &&
      start5 > 0 &&
      end5 > 0
    ) {
      const rolling5 = Math.pow(end5 / start5, 1 / 5) - 1;

      if (
        worstRollingFiveYearReturn === null ||
        rolling5 < worstRollingFiveYearReturn
      ) {
        worstRollingFiveYearReturn = rolling5;
      }

      if (
        bestRollingFiveYearReturn === null ||
        rolling5 > bestRollingFiveYearReturn
      ) {
        bestRollingFiveYearReturn = rolling5;
      }
    }
  }

  const endPortfolioGrowth =
    !isHistorical &&
    Number.isFinite(startValue) &&
    Number.isFinite(endValue) &&
    startValue > 0
      ? (endValue / startValue) - 1
      : null;

  return {
    mode,
    startValue,
    endValue,
    years,
    portfolioValueCagr,
    marketCagr,
    returnGap,
    maxDrawdown,
    worstYearReturn,
    worstRollingFiveYearReturn,
    bestRollingFiveYearReturn,
    endPortfolioGrowth,
    validMarketYears
  };
}

function openPerformanceSummaryOverlay(summary, formatters) {
  const overlay = document.getElementById('performanceSummaryOverlay');
  const body = document.getElementById('performanceSummaryBody');

  if (!overlay || !body || !summary) return;

  body.innerHTML = renderPerformanceSummaryOverlayBody(summary, formatters);

  overlay.classList.remove('hidden');
  document.body.classList.add('glossary-open');
}

function closePerformanceSummaryOverlay() {
  const overlay = document.getElementById('performanceSummaryOverlay');
  const body = document.getElementById('performanceSummaryBody');
  const glossaryOverlay = document.getElementById('outlookGlossaryOverlay');

  if (!overlay || !body) return;

  overlay.classList.add('hidden');
  body.innerHTML = '';

  const glossaryOpen =
    glossaryOverlay && !glossaryOverlay.classList.contains('hidden');

  const performanceOpen =
    overlay && !overlay.classList.contains('hidden');

  if (!glossaryOpen && !performanceOpen) {
    document.body.classList.remove('glossary-open');
  }
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
          row.endPortfolioReal,
          row.startPortfolioReal
        ])
      : firstFinite([
          row.endPortfolioNominal,
          row.startPortfolioNominal
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
  formatters,
  profiles
}) {
  const container = elements.resultsContextBar;
  if (!container) return;

  const { formatCurrency } = formatters;
  const mode = String(result?.mode ?? '').toLowerCase();
  const isMonteCarlo = mode === 'montecarlo';

  const medianProfile = profiles?.medianProfile || buildPathBehaviourProfile(
    result,
    resolveBehaviourPath(result, 'median') || activePath,
    useReal
  );

  const downsideProfile = profiles?.downsideProfile || buildPathBehaviourProfile(
    result,
    resolveBehaviourPath(result, 'p25') || resolveBehaviourPath(result, 'p10') || activePath,
    useReal
  );

  const activeProfile = profiles?.activeProfile || buildPathBehaviourProfile(
    result,
    activePath,
    useReal
  );

  const primaryState = resolvePlanOutlookPrimaryState(result, {
    medianProfile,
    downsideProfile,
    activeProfile
  });

  const warningGroups = resolvePlanOutlookWarningGroups({
    result,
    activePath,
    useReal,
    formatters,
    suppressWarnings: false
  });

  const contextNote = mode === 'historical'
    ? PLAN_OUTLOOK_CONTEXT.HISTORICAL_NOTE
    : null;

  const detailMetricsHtml = `
    <div class="results-context-metrics">
      <div class="results-context-metric">
        <div class="results-context-metric-label">
          ${renderMetricHeading(
            'First spending adjustment (median)',
            'First year the median path requires spending to be reduced versus target.'
          )}
        </div>
        <div class="results-context-metric-body">
          <div class="results-context-metric-value">
            ${
              medianProfile.firstAdjustmentYear === null
                ? 'Spending maintained throughout'
                : `Year ${medianProfile.firstAdjustmentYear}`
            }
          </div>
        </div>
      </div>

      <div class="results-context-metric">
        <div class="results-context-metric-label">
          ${renderMetricHeading(
            'First below comfort (downside)',
            'First year the downside path falls below the comfort spending level. Uses p25 if available, otherwise falls back to p10.'
          )}
        </div>
        <div class="results-context-metric-body">
          <div class="results-context-metric-value">
            ${
              downsideProfile.firstBelowComfortYear === null
                ? 'Never below comfort level'
                : `Year ${downsideProfile.firstBelowComfortYear}`
            }
          </div>
        </div>
      </div>

      <div class="results-context-metric">
        <div class="results-context-metric-label">
          ${renderMetricHeading(
            'Worst shortfall vs minimum',
            'Largest gap in any year between actual spending and your minimum acceptable spending level.'
          )}
        </div>
        <div class="results-context-metric-body">
          <div class="results-context-metric-value">
            ${
              downsideProfile.worstShortfallAmount > 0
                ? `${formatCurrency(downsideProfile.worstShortfallAmount)}${
                    downsideProfile.worstShortfallYear
                      ? ` (Year ${downsideProfile.worstShortfallYear})`
                      : ''
                  }`
                : 'Minimum spending always met'
            }
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
          <div class="results-context-metric-value">
            ${downsideProfile.yearsBelowMinimum} years
          </div>
        </div>
      </div>
    </div>
  `;

  const headerControls = isMonteCarlo
    ? `
        <div class="plan-outlook-path-selector table-view-selector">
          <div class="table-view-selector-group">
            ${getTableViewSelectorHtml(tableView)}
          </div>
        </div>
      `
    : '';

  const primaryCardClass = getPlanOutlookCardClass(primaryState);
  const primaryIconHtml = getPlanOutlookIconTokenHtml(primaryState.icon);
  const warningsHtml = renderPlanOutlookWarningGroups(warningGroups);

  container.innerHTML = `
    <div class="results-context-card results-context-card--merged">
      <div class="results-context-panel-header">
        <div class="card-title-block">
          <h2>Plan outlook</h2>
          <p>A behavioural view of when spending first changes, when comfort level is first breached, and how severe downside pressure becomes.</p>
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

function renderSummaryCardLabels(elements, result, tableView) {
  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';

  if (isHistorical) {
    if (elements.summarySuccessRateLabel) {
      elements.summarySuccessRateLabel.textContent = 'Historical outcome';
    }

    if (elements.summarySuccessRateDesc) {
      elements.summarySuccessRateDesc.textContent =
        'Shows whether starting retirement at this point in history would sustain the plan.';
    }

    if (elements.summaryMedianEndLabel) {
      elements.summaryMedianEndLabel.textContent = 'Expected outcome (median path)';
    }

    if (elements.summaryMedianEndDesc) {
      elements.summaryMedianEndDesc.textContent =
        'Ending portfolio value for this historical return sequence.';
    }

    if (elements.summaryWorstStressLabel) {
      elements.summaryWorstStressLabel.textContent = 'Worst observed outcome';
    }

    if (elements.summaryWorstStressDesc) {
      elements.summaryWorstStressDesc.textContent =
        'Shows whether this historical path depletes, with the lowest portfolio value shown below.';
    }

    if (elements.summaryCashRunwayLabel) {
      elements.summaryCashRunwayLabel.textContent = 'First below comfort (median)';
    }

    if (elements.summaryCashRunwayDesc) {
      elements.summaryCashRunwayDesc.textContent =
        'First year this historical path falls below the comfort spending level.';
    }

    return;
  }

  // --- UPDATED BLOCK (only change in this function) ---
  if (elements.summarySuccessRateLabel) {
    elements.summarySuccessRateLabel.textContent = 'Plan reliability';
  }

  if (elements.summarySuccessRateDesc) {
    const successRate = Number(result?.monteCarlo?.successRate);

    if (Number.isFinite(successRate)) {
      const failureRate = Math.max(0, 1 - successRate);

      elements.summarySuccessRateDesc.textContent =
        `${formatPercent(failureRate)} of simulated outcomes do not sustain spending.`;
    } else {
      elements.summarySuccessRateDesc.textContent =
        'Shows how often the plan sustains spending across simulated outcomes.';
    }
  }
  // --- END UPDATED BLOCK ---

  if (elements.summaryMedianEndLabel) {
    elements.summaryMedianEndLabel.textContent = 'Expected outcome (median path)';
  }

  if (elements.summaryMedianEndDesc) {
    elements.summaryMedianEndDesc.textContent =
      'Representative ending portfolio value for the median path.';
  }

  if (elements.summaryWorstStressLabel) {
    elements.summaryWorstStressLabel.textContent = 'Worst observed outcome';
  }

  if (elements.summaryWorstStressDesc) {
    elements.summaryWorstStressDesc.textContent =
      'Lowest ending portfolio across the observed stress scenarios.';
  }

  if (elements.summaryCashRunwayLabel) {
    elements.summaryCashRunwayLabel.textContent = 'First below comfort (median)';
  }

  if (elements.summaryCashRunwayDesc) {
    elements.summaryCashRunwayDesc.textContent =
      'First year the median path falls below the comfort spending level.';
  }
}

function renderResultsTableLegend(elements, result, tableMode) {
  const legend = elements?.resultsTableLegend;
  if (!legend) return;

  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';

  if (tableMode === 'performance') {
    legend.innerHTML = `
      <div class="results-table-legend-group">
        <span class="results-table-legend-title">Returns</span>

        <span class="results-table-legend-item">
          <span class="results-table-legend-arrow results-table-legend-arrow--up">↑</span>
          Positive return
        </span>

        <span class="results-table-legend-item">
          <span class="results-table-legend-arrow results-table-legend-arrow--down">↓</span>
          Negative return
        </span>
      </div>

      <div class="results-table-legend-group">
        <span class="results-table-legend-title">Risk</span>

        <span class="results-table-legend-item">
          <span class="status-dot cut-moderate"></span>
          Drawdown from peak
        </span>

        <span class="results-table-legend-item">
          <span class="status-dot cut-severe"></span>
          Weak rolling 5-year period
        </span>
      </div>
    `;

    legend.classList.remove('hidden');
    return;
  }

  if (isHistorical) {
    legend.innerHTML = `
      <div class="results-table-legend-group">
        <span class="results-table-legend-title">Portfolio change</span>

        <span class="results-table-legend-item">
          <span class="results-table-legend-arrow results-table-legend-arrow--up">↑</span>
          Increase
        </span>

        <span class="results-table-legend-item">
          <span class="results-table-legend-arrow results-table-legend-arrow--down">↓</span>
          Decrease
        </span>
      </div>

      <div class="results-table-legend-group">
        <span class="results-table-legend-title">Spending cuts</span>

        <span class="results-table-legend-item">
          <span class="status-dot cut-mild"></span>
          Mild
        </span>

        <span class="results-table-legend-item">
          <span class="status-dot cut-moderate"></span>
          Moderate
        </span>

        <span class="results-table-legend-item">
          <span class="status-dot cut-severe"></span>
          Severe
        </span>
      </div>

      <div class="results-table-legend-group">
        <span class="results-table-legend-title">Shortfall</span>

        <span class="results-table-legend-item">
          <span class="status-dot shortfall-dot"></span>
          Spending below target
        </span>
      </div>
    `;

    legend.classList.remove('hidden');
    return;
  }

  legend.innerHTML = `
    <div class="results-table-legend-group">
      <span class="results-table-legend-title">Portfolio change</span>

      <span class="results-table-legend-item">
        <span class="results-table-legend-arrow results-table-legend-arrow--up">↑</span>
        Increase
      </span>

      <span class="results-table-legend-item">
        <span class="results-table-legend-arrow results-table-legend-arrow--down">↓</span>
        Decrease
      </span>
    </div>

    <div class="results-table-legend-group">
      <span class="results-table-legend-title">Spending cuts</span>

      <span class="results-table-legend-item">
        <span class="status-dot cut-mild"></span>
        Mild
      </span>

      <span class="results-table-legend-item">
        <span class="status-dot cut-moderate"></span>
        Moderate
      </span>

      <span class="results-table-legend-item">
        <span class="status-dot cut-severe"></span>
        Severe
      </span>
    </div>

    <div class="results-table-legend-group">
      <span class="results-table-legend-title">Shortfall</span>

      <span class="results-table-legend-item">
        <span class="status-dot shortfall-dot"></span>
        Spending below target
      </span>
    </div>
  `;

  legend.classList.remove('hidden');
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

const performanceOverlay = document.getElementById('performanceSummaryOverlay');
const performanceCloseButtons = document.querySelectorAll('[data-performance-summary-close]');

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

if (performanceCloseButtons && performanceCloseButtons.length) {
  performanceCloseButtons.forEach((el) => {
    el.addEventListener('click', () => {
      closePerformanceSummaryOverlay();
    });
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  if (performanceOverlay && !performanceOverlay.classList.contains('hidden')) {
    closePerformanceSummaryOverlay();
    return;
  }

  if (glossaryOverlay && !glossaryOverlay.classList.contains('hidden')) {
    glossaryOverlay.classList.add('hidden');
    document.body.classList.remove('glossary-open');
  }
});