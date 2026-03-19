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

  const percentileSeries = hasMonteCarlo
    ? (
        useReal
          ? result.monteCarlo.realPercentiles
          : result.monteCarlo.nominalPercentiles
      )
    : null;

  const medianEnd = percentileSeries?.p50?.length
    ? percentileSeries.p50[percentileSeries.p50.length - 1]
    : (
        (useReal ? activePath?.terminalReal : activePath?.terminalNominal) ??
        result?.summary?.medianTerminalWealth ??
        result?.summary?.terminalNominal ??
        result?.baseCase?.terminalNominal ??
        0
      );

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
  cutDiagnostics,
  useReal,
  formatters
});

  // --- ensure summary labels reflect mode + selected path
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
    if (elements.portfolioChart) {
      elements.portfolioChart.innerHTML = `
        <div class="chart-empty-state">
          Historical mode is using a selected yearly path.
          Chart fallback not wired yet.
        </div>
      `;
    }

    if (elements.portfolioHorizonSummary) {
      elements.portfolioHorizonSummary.innerHTML = `
        <div class="portfolio-horizon-item">
          <div class="portfolio-horizon-label">Historical scenario</div>
          <div class="portfolio-horizon-value">
            ${activePath?.label || 'Selected path'}
          </div>
        </div>
        <div class="portfolio-horizon-item">
          <div class="portfolio-horizon-label">Ending portfolio</div>
          <div class="portfolio-horizon-value">
            ${formatCurrency(
              useReal
                ? (activePath?.terminalReal ?? result?.summary?.terminalReal ?? 0)
                : (activePath?.terminalNominal ?? result?.summary?.terminalNominal ?? 0)
            )}
          </div>
        </div>
        <div class="portfolio-horizon-item">
          <div class="portfolio-horizon-label">Minimum wealth</div>
          <div class="portfolio-horizon-value">
            ${formatCurrency(result?.summary?.minimumWealth ?? 0)}
          </div>
        </div>
        <div class="portfolio-horizon-item">
          <div class="portfolio-horizon-label">Depletion year</div>
          <div class="portfolio-horizon-value">
            ${result?.summary?.depleted
              ? `Year ${result?.summary?.depletionYear ?? '—'}`
              : 'Not depleted'}
          </div>
        </div>
      `;
    }

    if (elements.spendingChart) {
      elements.spendingChart.innerHTML = `
        <div class="chart-empty-state">
          Historical mode is using the selected yearly table path.
          Spending chart fallback not wired yet.
        </div>
      `;
    }

    if (elements.planWarnings) {
      elements.planWarnings.innerHTML = `
        <div class="plan-warning-ok">
          Historical mode is showing one selected sequence, not Monte Carlo risk ranges.
        </div>
      `;
    }

    if (elements.retirementOutlookHero) {
      elements.retirementOutlookHero.innerHTML = `
        <div class="retirement-outlook-hero-card">
          <div class="retirement-outlook-hero-top">
            <div class="retirement-outlook-kicker">Historical scenario</div>
            <div class="retirement-outlook-status-row">
              <div class="retirement-outlook-badge retirement-outlook-badge--${
                result?.summary?.depleted ? 'weak' : 'strong'
              }">
                <span class="retirement-outlook-badge-icon">${
                  result?.summary?.depleted ? '×' : '✓'
                }</span>
                <span>${result?.summary?.depleted ? 'Depleted' : 'Sustained'}</span>
              </div>

              <div class="retirement-outlook-heading-group">
                <div class="retirement-outlook-subheading">
                  ${activePath?.label || 'Selected historical path'}
                </div>
              </div>
            </div>
          </div>

          <p class="retirement-outlook-description">
            This result shows one selected historical return sequence rather than Monte Carlo ranges.
          </p>

          <div class="plan-summary-outcome">
            <h4 class="plan-summary-section-title">Outcome summary</h4>
            <div class="plan-summary-section-grid plan-summary-section-grid--top">
              ${renderSummaryItem(
                'Ending portfolio',
                formatCurrency(
                  useReal
                    ? (activePath?.terminalReal ?? result?.summary?.terminalReal ?? 0)
                    : (activePath?.terminalNominal ?? result?.summary?.terminalNominal ?? 0)
                )
              )}
              ${renderSummaryItem(
                'Minimum wealth',
                formatCurrency(result?.summary?.minimumWealth ?? 0)
              )}
              ${renderSummaryItem(
                'Depletion year',
                result?.summary?.depleted
                  ? `Year ${result?.summary?.depletionYear ?? '—'}`
                  : 'Not depleted'
              )}
            </div>
          </div>
        </div>
      `;
    }

    if (elements.planSummaryGrid) {
      elements.planSummaryGrid.innerHTML = '';
  }
} else if (hasMonteCarlo) {
  renderPortfolioChart(elements.portfolioChart, result, useReal, formatCurrency);
  renderPortfolioHorizonSummary(result, elements, useReal, formatters, activePath);
  renderSpendingChart(
    elements.spendingChart,
    result,
    useReal,
    formatCurrency,
    cutDiagnostics
  );
  renderPlanWarnings(result, elements, useReal, formatters, activePath);
  renderRetirementOutlook(result, elements, useReal, formatters, cutDiagnostics);
  renderMonteCarloSummary(result, elements, useReal, formatters, cutDiagnostics, activePath);
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
renderStatusLegend(elements, rows);

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

function renderPortfolioHorizonSummary(result, elements, useReal, formatters, activePath) {
  const container = elements.portfolioHorizonSummary;
  if (!container) return;

  const { formatCurrency, formatPercent } = formatters;
  const rows = activePath?.rows || activePath?.yearlyRows || [];

  const endValue = getSelectedPathEndValue(activePath, rows, useReal);

  let selectedPathSeries = useReal
    ? (activePath?.pathReal || [])
    : (activePath?.pathNominal || []);

  if (!selectedPathSeries || selectedPathSeries.length <= 1) {
    selectedPathSeries = rows
      .map((row) => {
        const value = useReal
          ? Number(
              row.endPortfolioReal ??
              row.endingPortfolioReal ??
              row.endReal ??
              row.endPortfolio
            )
          : Number(
              row.endPortfolioNominal ??
              row.endingPortfolioNominal ??
              row.endPortfolio ??
              row.endNominal
            );

        return Number.isFinite(value) ? value : null;
      })
      .filter((v) => v !== null);
  } else {
    selectedPathSeries = selectedPathSeries
      .map((value) => Number(value))
      .filter((v) => Number.isFinite(v));
  }

  let lowPoint = Number.POSITIVE_INFINITY;
  for (const value of selectedPathSeries) {
    if (value < lowPoint) {
      lowPoint = value;
    }
  }

  if (!Number.isFinite(lowPoint)) {
    lowPoint = endValue;
  }

  let firstShortfallYear = null;
  let worstCut = 0;

  rows.forEach((row, index) => {
    const planYear = getRowPlanYear(row, index);

    const shortfall = getRowShortfall(
      row,
      useReal,
      result?.inputs?.initialSpending || 0
    );

    if (shortfall > 0 && firstShortfallYear === null) {
      firstShortfallYear = planYear;
    }

    const cut = Number(row.spendingCutPercent) || 0;
    if (cut > worstCut) {
      worstCut = cut;
    }
  });

  const { minimumFloor } = getResolvedSpendingFloors(result?.inputs || {});

  let worstActualSpending = Number.POSITIVE_INFINITY;

  rows.forEach((row) => {
    const actual = getRowActualSpending(row, useReal);

    if (actual > 0 && actual < worstActualSpending) {
      worstActualSpending = actual;
    }
  });

  if (!Number.isFinite(worstActualSpending)) {
    worstActualSpending = 0;
  }

  let floorHeadroomPct = null;

  if (minimumFloor > 0) {
    floorHeadroomPct = (worstActualSpending - minimumFloor) / minimumFloor;
  }

  let floorHeadroomDisplay = '—';
  let floorHeadroomClass = '';

  if (floorHeadroomPct !== null) {
    floorHeadroomDisplay = formatPercent(floorHeadroomPct);
    floorHeadroomClass =
      floorHeadroomPct >= 0
        ? 'portfolio-horizon-signal-value--green'
        : 'portfolio-horizon-signal-value--red';
  }

  container.innerHTML = `
    <div class="portfolio-horizon-item">
      <div class="portfolio-horizon-label">End value</div>
      <div class="portfolio-horizon-value">${formatCurrency(endValue)}</div>
    </div>

    <div class="portfolio-horizon-item">
      <div class="portfolio-horizon-label">Low point</div>
      <div class="portfolio-horizon-value">${formatCurrency(lowPoint)}</div>
    </div>

    <div class="portfolio-horizon-item">
      <div class="portfolio-horizon-label">First shortfall year</div>
      <div class="portfolio-horizon-value">
        ${firstShortfallYear ? `Year ${firstShortfallYear}` : 'None'}
      </div>
    </div>

    <div class="portfolio-horizon-item">
      <div class="portfolio-horizon-label">Worst spending cut</div>
      <div class="portfolio-horizon-value">
        ${worstCut > 0 ? formatPercent(worstCut) : 'None'}
      </div>
    </div>

    <div class="portfolio-horizon-item portfolio-horizon-item--signal">
      <div class="portfolio-horizon-label">Floor headroom</div>
      <div class="portfolio-horizon-row">
        <div class="portfolio-horizon-value ${floorHeadroomClass}">
          ${floorHeadroomDisplay}
        </div>
        <div class="portfolio-horizon-side-note">vs minimum floor</div>
      </div>
    </div>
  `;
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

function getLifestyleResilienceMetrics(result, useReal = false, activePath = null) {
  const inputs = result?.inputs || {};
  const rows = activePath?.rows || activePath?.yearlyRows || result?.baseCase?.rows || [];
  const { targetSpending, comfortFloor, minimumFloor } =
    getResolvedSpendingFloors(inputs);

  if (!targetSpending || !rows.length) {
    return null;
  }

  let worstCutAmount = 0;
  let worstCutPercent = 0;
  let yearsBelowComfort = 0;
  let yearsBelowMinimum = 0;

  rows.forEach((row) => {
    const annualTarget = getRowTargetSpending(row, useReal, targetSpending);
    const annualActual = getRowActualSpending(row, useReal);

    const cutAmount = Math.max(0, annualTarget - annualActual);
    const cutPercent = annualTarget > 0 ? cutAmount / annualTarget : 0;

    if (cutAmount > worstCutAmount) {
      worstCutAmount = cutAmount;
    }

    if (cutPercent > worstCutPercent) {
      worstCutPercent = cutPercent;
    }

    if (annualActual < comfortFloor) {
      yearsBelowComfort += 1;
    }

    if (annualActual < minimumFloor) {
      yearsBelowMinimum += 1;
    }
  });

  return {
    targetSpending,
    comfortFloor,
    minimumFloor,
    worstCutAmount,
    worstCutPercent,
    yearsBelowComfort,
    yearsBelowMinimum
  };
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
  cutDiagnostics,
  useReal,
  formatters
}) {
  const container = elements.resultsContextBar;
  if (!container) return;

  const { formatCurrency } = formatters;

  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';
  const isDeterministic = mode === 'deterministic';

  const modeLabel =
    isHistorical
      ? 'Historical'
      : isDeterministic
        ? 'Deterministic'
        : 'Monte Carlo';

  const rows = activePath?.rows || activePath?.yearlyRows || [];

  const endValue = getSelectedPathEndValue(activePath, rows, useReal);

  const firstShortfall =
    cutDiagnostics.firstShortfallYear != null
      ? `Year ${cutDiagnostics.firstShortfallYear}`
      : 'None';

  const worstShortfall =
    cutDiagnostics.worstShortfall > 0
      ? formatCurrency(cutDiagnostics.worstShortfall)
      : 'None';

  const shortfallYears = cutDiagnostics.shortfallYears || 0;

  const { comfortFloor, minimumFloor } = getResolvedSpendingFloors(result?.inputs || {});

  let firstComfortBreachYear = null;
  let worstActualSpending = Number.POSITIVE_INFINITY;
  let yearsBelowMinimumFloor = 0;

  rows.forEach((row, index) => {
    const planYear = getRowPlanYear(row, index);
    const actual = getRowActualSpending(row, true);

    if (actual > 0 && actual < worstActualSpending) {
      worstActualSpending = actual;
    }

    if (
      comfortFloor > 0 &&
      actual > 0 &&
      actual < comfortFloor &&
      firstComfortBreachYear === null
    ) {
      firstComfortBreachYear = planYear;
    }

    if (minimumFloor > 0 && actual > 0 && actual < minimumFloor) {
      yearsBelowMinimumFloor += 1;
    }
  });

  let firstShortfallSub = '';
  let firstShortfallClass = '';

  if (firstComfortBreachYear != null) {
    firstShortfallSub = `First breach of comfort spending floor in Year ${firstComfortBreachYear}`;
    firstShortfallClass = 'portfolio-horizon-signal-value--blue';
  }

  if (!Number.isFinite(worstActualSpending)) {
    worstActualSpending = 0;
  }

  let floorHeadroomPct = null;

  if (minimumFloor > 0) {
    floorHeadroomPct = (worstActualSpending - minimumFloor) / minimumFloor;
  }

  let floorHeadroomDisplay = '—';
  let floorHeadroomClass = '';

  if (floorHeadroomPct !== null) {
    const sign = floorHeadroomPct > 0 ? '+' : floorHeadroomPct < 0 ? '−' : '';
    floorHeadroomDisplay = `${sign}${Math.abs(floorHeadroomPct * 100).toFixed(1)}%`;

    floorHeadroomClass =
      floorHeadroomPct >= 0
        ? 'portfolio-horizon-signal-value--green'
        : 'portfolio-horizon-signal-value--red';
  }

  const totalYears = rows.length || 0;
  const yearsBelowFloorPct =
    totalYears > 0 ? (yearsBelowMinimumFloor / totalYears) * 100 : 0;

  let shortfallYearsDisplay = '0.0% of years below spending floor';
  let shortfallYearsClass = 'portfolio-horizon-signal-value--green';

  if (yearsBelowMinimumFloor > 0) {
    shortfallYearsDisplay = `${yearsBelowFloorPct.toFixed(1)}% of years below spending floor`;
    shortfallYearsClass = 'portfolio-horizon-signal-value--red';
  }

  container.innerHTML = `
    <div class="results-context-card">
      <div class="results-context-top">
        <div class="results-context-mode">${modeLabel}</div>

        ${
          isHistorical
            ? `<div class="results-context-path">${activePath?.label || 'Selected scenario'}</div>`
            : isDeterministic
              ? `<div class="results-context-path">Base case</div>`
              : `
                <div class="results-context-toggle table-view-selector">
                  <button data-view="p10" class="${tableView === 'p10' ? 'active' : ''}">
                    Downside
                  </button>
                  <button data-view="median" class="${tableView === 'median' ? 'active' : ''}">
                    Median
                  </button>
                  <button data-view="p90" class="${tableView === 'p90' ? 'active' : ''}">
                    Upside
                  </button>
                </div>
              `
        }
      </div>

      ${
        isHistorical
          ? ''
          : `
            <div class="results-context-metrics">
              <div class="results-context-metric">
                <div class="results-context-metric-label">End value</div>
                <div class="results-context-metric-value">${formatCurrency(endValue ?? 0)}</div>
              </div>

              <div class="results-context-metric">
                <div class="results-context-metric-label">First shortfall</div>
                <div class="results-context-metric-value">${firstShortfall}</div>
                ${
                  firstShortfallSub
                    ? `<div class="results-context-metric-subvalue ${firstShortfallClass}">
                         ${firstShortfallSub}
                       </div>`
                    : ''
                }
              </div>

              <div class="results-context-metric">
                <div class="results-context-metric-label">Worst shortfall</div>
                <div class="results-context-metric-value">${worstShortfall}</div>
                <div class="results-context-metric-subvalue ${floorHeadroomClass}">
                  ${floorHeadroomDisplay} from minimum spending floor
                </div>
              </div>

              <div class="results-context-metric">
                <div class="results-context-metric-label">Shortfall years</div>
                <div class="results-context-metric-value">${shortfallYears}</div>
                <div class="results-context-metric-subvalue ${shortfallYearsClass}">
                  ${shortfallYearsDisplay}
                </div>
              </div>
            </div>
          `
      }
    </div>
  `;
}

function renderRetirementOutlook(
  result,
  elements,
  useReal,
  formatters,
  cutDiagnostics = {}
) {
  const hero = elements.retirementOutlookHero;
  const panel = elements.planSummaryPanel;
  if (!panel) return;

  const { formatCurrency, formatPercent } = formatters;
  const percentiles = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;
  const medianEnd = percentiles.p50[percentiles.p50.length - 1];
  const successRate = result.monteCarlo.successRate;
  const shortfallYears = cutDiagnostics.shortfallYears || 0;
  const worstShortfall = cutDiagnostics.worstShortfall || 0;
  const firstShortfallYear = cutDiagnostics.firstShortfallYear;
  const worstYear = cutDiagnostics.worstShortfallYear ?? '—';
  const hasAnyShortfall = shortfallYears > 0;
  const startingPortfolio = Number(result.inputs?.initialPortfolio) || 0;

  const outcomeSignals = {
    planSuccess: getPlanSuccessSignal(successRate),
    medianEnding: getMedianEndingSignal(medianEnd, startingPortfolio),
    baseCaseTiming: getBaseCaseTimingSignal(firstShortfallYear)
  };

  let status = 'strong';
  let label = 'Strong';
  let message =
    'The plan is highly likely to sustain the target spending level across simulated outcomes.';
  let guardrailNotice = '';

  if (successRate < 0.7) {
    status = 'weak';
    label = 'Weak';
    message =
      'The plan does not reliably sustain the target spending level across simulations.';
  } else if (successRate < 0.9) {
    status = 'watch';
    label = 'Watch';
    message =
      'The plan is broadly viable, but outcomes show some pressure and should be monitored.';
  }

  if (hasAnyShortfall) {
    if (successRate >= 0.9) {
      guardrailNotice = `
        <div class="plan-summary-note plan-summary-note--info">
          <strong>Base-case path dips below target in ${shortfallYears} year${
            shortfallYears === 1 ? '' : 's'
          }.</strong>
          <span>Worst shortfall: ${formatCurrency(
            worstShortfall
          )} in year ${worstYear}. Monte Carlo success remains ${formatPercent(
            successRate
          )}.</span>
        </div>
      `;
    } else {
      guardrailNotice = `
        <div class="plan-summary-note plan-summary-note--warning">
          <strong>Base-case spending pressure in ${shortfallYears} year${
            shortfallYears === 1 ? '' : 's'
          }.</strong>
          <span>Worst shortfall: ${formatCurrency(
            worstShortfall
          )} in year ${worstYear}.</span>
        </div>
      `;
    }
  }

  const firstShortfallText =
    firstShortfallYear === null
      ? 'No base-case shortfall'
      : `Base-case shortfall begins: year ${firstShortfallYear}`;

  const statusSubheading =
    status === 'strong'
      ? 'Highly resilient under current assumptions'
      : status === 'watch'
        ? 'Worth monitoring under weaker outcomes'
        : 'Material pressure under current assumptions';

  const statusIcon =
    status === 'strong'
      ? '✓'
      : status === 'watch'
        ? '!'
        : '×';

  panel.classList.remove(
    'plan-summary-panel--strong',
    'plan-summary-panel--watch',
    'plan-summary-panel--weak'
  );
  panel.classList.add(`plan-summary-panel--${status}`);

  if (!hero) return;

  hero.innerHTML = `
    <div class="retirement-outlook-hero-card">
      <div class="retirement-outlook-hero-top">
        <div class="retirement-outlook-kicker">Retirement outlook</div>

        <div class="retirement-outlook-status-row">
          <div class="retirement-outlook-badge retirement-outlook-badge--${status}">
            <span class="retirement-outlook-badge-icon">${statusIcon}</span>
            <span>${label}</span>
          </div>

          <div class="retirement-outlook-heading-group">
            <div class="retirement-outlook-subheading">${statusSubheading}</div>
          </div>
        </div>
      </div>

      <p class="retirement-outlook-description">${message}</p>

      ${guardrailNotice}

      <div class="plan-summary-outcome">
        <h4 class="plan-summary-section-title">Outcome summary</h4>
        <div class="plan-summary-section-grid plan-summary-section-grid--top">
          ${renderSummaryItem(
            'Plan success',
            formatPercent(successRate),
            outcomeSignals.planSuccess
          )}
          ${renderSummaryItem(
            'Median ending portfolio',
            formatCurrency(medianEnd),
            outcomeSignals.medianEnding
          )}
          ${renderSummaryItem(
            'Base-case timing',
            firstShortfallText,
            outcomeSignals.baseCaseTiming
          )}
        </div>
      </div>
    </div>
  `;
}

function renderMonteCarloSummary(
  result,
  elements,
  useReal,
  formatters,
  cutDiagnostics = {},
  activePath
) {
  const { formatCurrency, formatPercent } = formatters;
  const grid = elements.planSummaryGrid;
  if (!grid) return;

  const rows = activePath?.rows || activePath?.yearlyRows || [];
  if (!rows.length) return;

  const inputs = result.inputs || {};
  const percentiles = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;
  const lastIndex = percentiles.p50.length - 1;

  const p10End = percentiles.p10[lastIndex];
  const p90End = percentiles.p90[lastIndex];

  const totals = rows.reduce(
    (acc, row) => {
      acc.spending += getRowActualSpending(row, useReal);
      acc.withdrawals += Number(
        useReal ? row.withdrawalReal : row.withdrawalNominal
      ) || 0;
      acc.statePension += Number(
        useReal ? row.statePensionReal : row.statePensionNominal
      ) || 0;
      return acc;
    },
    { spending: 0, withdrawals: 0, statePension: 0 }
  );

  const dependence =
    totals.spending > 0 ? totals.withdrawals / totals.spending : 0;
  const statePensionReliance =
    totals.spending > 0 ? totals.statePension / totals.spending : 0;
  const initialWithdrawalRate =
    inputs.initialPortfolio > 0
      ? inputs.initialSpending / inputs.initialPortfolio
      : 0;

  const lifestyleMetrics = getLifestyleResilienceMetrics(result, useReal, activePath);

  let weakCaseDepletionYear = 'Not depleted';
  for (let i = 0; i < percentiles.p10.length; i += 1) {
    if (percentiles.p10[i] <= 0) {
      weakCaseDepletionYear = i + 1;
      break;
    }
  }

  const worstShortfallLabel =
    cutDiagnostics.worstShortfallYear === null ||
    cutDiagnostics.worstShortfallYear === undefined
      ? 'None'
      : `${formatCurrency(cutDiagnostics.worstShortfall)} in year ${cutDiagnostics.worstShortfallYear}`;

  const startingPortfolio = Number(inputs.initialPortfolio) || 0;
  const targetSpending =
    lifestyleMetrics?.targetSpending ||
    safePositiveNumber(inputs.initialSpending) ||
    0;

  const signals = {
    comfortFloor: lifestyleMetrics
      ? getYearsSignal(lifestyleMetrics.yearsBelowComfort)
      : null,
    minimumFloor: lifestyleMetrics
      ? getYearsSignal(lifestyleMetrics.yearsBelowMinimum)
      : null,
    worstCut: lifestyleMetrics
      ? getWorstCutSignal(lifestyleMetrics.worstCutPercent)
      : null,

    initialWithdrawalRate: getInitialWithdrawalSignal(initialWithdrawalRate),
    statePensionReliance: getStatePensionRelianceSignal(
      statePensionReliance
    ),
    portfolioDependence: getPortfolioDependenceSignal(dependence),

    p10Ending: getP10EndingSignal(p10End, startingPortfolio),
    p90Ending: getP90EndingSignal(p90End, startingPortfolio),
    weakCaseDepletion: getWeakCaseDepletionSignal(weakCaseDepletionYear),

    worstShortfall: getWorstShortfallSignal(
      cutDiagnostics.worstShortfall || 0,
      targetSpending
    ),
    shortfallYears: getYearsSignal(cutDiagnostics.shortfallYears || 0),
    yearsBelowComfort: lifestyleMetrics
      ? getYearsSignal(lifestyleMetrics.yearsBelowComfort)
      : null
  };

  grid.innerHTML = `
    ${renderSummarySection('Lifestyle resilience', [
      renderSummaryItem(
        'Comfort floor',
        lifestyleMetrics ? formatCurrency(lifestyleMetrics.comfortFloor) : '—',
        signals.comfortFloor
      ),
      renderSummaryItem(
        'Minimum floor',
        lifestyleMetrics ? formatCurrency(lifestyleMetrics.minimumFloor) : '—',
        signals.minimumFloor
      ),
      renderSummaryItem(
        'Worst cut',
        lifestyleMetrics
          ? `${formatCurrency(lifestyleMetrics.worstCutAmount)} (${formatPercent(
              lifestyleMetrics.worstCutPercent
            )})`
          : '—',
        signals.worstCut
      )
    ])}

    ${renderSummarySection('Plan health', [
      renderSummaryItem(
        'Initial withdrawal rate',
        formatPercent(initialWithdrawalRate),
        signals.initialWithdrawalRate
      ),
      renderSummaryItem(
        'State pension reliance',
        formatPercent(statePensionReliance),
        signals.statePensionReliance
      ),
      renderSummaryItem(
        'Portfolio dependence',
        formatPercent(dependence),
        signals.portfolioDependence
      )
    ])}

    ${renderSummarySection('Portfolio outcomes', [
      renderSummaryItem(
        '10th percentile ending',
        formatCurrency(p10End),
        signals.p10Ending
      ),
      renderSummaryItem(
        '90th percentile ending',
        formatCurrency(p90End),
        signals.p90Ending
      ),
      renderSummaryItem(
        'Weak-case depletion year',
        weakCaseDepletionYear,
        signals.weakCaseDepletion
      )
    ])}

    ${renderSummarySection('Plan risks', [
      renderSummaryItem(
        'Worst spending shortfall',
        worstShortfallLabel,
        signals.worstShortfall
      ),
      renderSummaryItem(
        'Years with spending shortfall',
        formatInteger(cutDiagnostics.shortfallYears || 0),
        signals.shortfallYears
      ),
      renderSummaryItem(
        'Years below comfort floor',
        lifestyleMetrics
          ? formatInteger(lifestyleMetrics.yearsBelowComfort)
          : '—',
        signals.yearsBelowComfort
      )
    ])}
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
      elements.summarySuccessRateLabel.textContent = 'Monte Carlo success rate';
    }

    if (elements.summarySuccessRateDesc) {
      elements.summarySuccessRateDesc.textContent =
        'Not used in deterministic mode.';
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
    elements.summarySuccessRateLabel.textContent = 'Monte Carlo success rate';
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

function renderPlanWarnings(result, elements, useReal, formatters, activePath) {
  const container = elements.planWarnings;
  const panel = elements.planWarningsPanel;
  if (!container) return;

  if (panel) {
    panel.classList.remove('hidden');
  }

  const warningData = getPlanWarningsData(result, useReal, formatters, activePath);

  if (!warningData.hasWarnings) {
    container.innerHTML = `
      <div class="plan-warning-ok">
        ✓ No major risks detected in current plan assumptions.
      </div>
    `;
    return;
  }

  const groups = [];

  if (warningData.inputWarnings.length) {
    groups.push(`
      <div class="plan-warning-group">
        <h4 class="plan-warning-group-title">Input warning</h4>
        ${warningData.inputWarnings
          .map(
            (text) => `
              <div class="plan-warning">⚠ ${text}</div>
            `
          )
          .join('')}
      </div>
    `);
  }

  if (warningData.modelWarnings.length) {
    groups.push(`
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
    `);
  }

  container.innerHTML = groups.join('');
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

function renderStatusLegend(elements, rows) {
  const legend = ensureResultsLegendContainer(elements);
  if (!legend) return;

  const flags = getLegendFlags(rows);

  if (!flags.hasMild && !flags.hasModerate && !flags.hasSevere && !flags.hasShortfall) {
    legend.innerHTML = '';
    legend.classList.add('hidden');
    return;
  }

  const items = [];

  if (flags.hasMild) {
    items.push(`
      <div class="results-legend-item">
        <span class="results-legend-swatch results-legend-swatch--mild"></span>
        <span>Spending cut (mild)</span>
      </div>
    `);
  }

  if (flags.hasModerate) {
    items.push(`
      <div class="results-legend-item">
        <span class="results-legend-swatch results-legend-swatch--moderate"></span>
        <span>Spending cut (moderate)</span>
      </div>
    `);
  }

  if (flags.hasSevere) {
    items.push(`
      <div class="results-legend-item">
        <span class="results-legend-swatch results-legend-swatch--severe"></span>
        <span>Spending cut (severe)</span>
      </div>
    `);
  }

  if (flags.hasShortfall) {
    items.push(`
      <div class="results-legend-item">
        <span class="results-legend-swatch results-legend-swatch--shortfall"></span>
        <span>Spending shortfall</span>
      </div>
    `);
  }

  legend.innerHTML = items.join('');
  legend.classList.remove('hidden');
}

function ensureResultsLegendContainer(elements) {
  if (elements.resultsLegend) {
    return elements.resultsLegend;
  }

  const table = elements.resultsTable;
  const tableCard = elements.tableCard;
  if (!table || !tableCard) {
    return null;
  }

  let legend = tableCard.querySelector('#resultsLegend');

  if (!legend) {
    legend = document.createElement('div');
    legend.id = 'resultsLegend';
    legend.className = 'results-legend hidden';

    const tableWrap = table.closest('.table-wrap');
    if (tableWrap && tableWrap.parentNode) {
      tableWrap.parentNode.insertBefore(legend, tableWrap);
    } else {
      tableCard.insertBefore(legend, tableCard.firstChild);
    }
  }

  elements.resultsLegend = legend;
  return legend;
}

function getLegendFlags(rows) {
  let hasMild = false;
  let hasModerate = false;
  let hasSevere = false;
  let hasShortfall = false;

  rows.forEach((row) => {
    const cut = Number(row.spendingCutPercent) || 0;

    if (cut > 0 && cut < 0.05) {
      hasMild = true;
    } else if (cut >= 0.05 && cut < 0.1) {
      hasModerate = true;
    } else if (cut >= 0.1) {
      hasSevere = true;
    }

    if (
      getRowShortfall(row, true) > 0 ||
      getRowShortfall(row, false) > 0
    ) {
      hasShortfall = true;
    }
  });

  return { hasMild, hasModerate, hasSevere, hasShortfall };
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