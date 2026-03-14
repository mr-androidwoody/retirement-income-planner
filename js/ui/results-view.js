import { renderPortfolioChart, renderSpendingChart } from './charts.js';
import { renderYearlyTable } from './yearly-table.js';

export function renderResultsView({
  result,
  elements,
  useReal,
  showFullTable,
  formatters
}) {
  if (!result) return;

  const { formatCurrency, formatPercent, formatYears } = formatters;
  const percentileSeries = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;

  const medianEnd = percentileSeries.p50[percentileSeries.p50.length - 1];
  const hasStressSummary = result.summary && result.summary.worstStressName;
  const rows = result.baseCase?.rows || [];

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

  if (elements.summarySuccessRate) {
    elements.summarySuccessRate.textContent = formatPercent(
      result.monteCarlo.successRate
    );
  }

  if (elements.summaryMedianEnd) {
    elements.summaryMedianEnd.textContent = formatCurrency(medianEnd);
  }

  if (hasStressSummary) {
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
    elements.summaryCashRunway.textContent =
      runway === Number.POSITIVE_INFINITY ? 'No draw' : formatYears(runway);
  }

  renderPortfolioChart(elements.portfolioChart, result, useReal, formatCurrency);
  renderPortfolioHorizonSummary(result, elements, useReal, formatters);
  renderSpendingChart(
    elements.spendingChart,
    result,
    useReal,
    formatCurrency,
    cutDiagnostics
  );
  renderRetirementOutlook(result, elements, useReal, formatters, cutDiagnostics);
  renderPlanWarnings(result, elements, useReal, formatters);
  renderMonteCarloSummary(result, elements, useReal, formatters, cutDiagnostics);

  if (elements.tableCard) {
    elements.tableCard.classList.toggle('hidden', !showFullTable);
  }

  renderDeterministicNote(elements);
  renderStatusLegend(elements, rows);

  renderYearlyTable(elements.resultsTable, rows, useReal, formatCurrency, {
    person1Name: result.inputs?.person1Name,
    person2Name: result.inputs?.person2Name,
    includePerson2: result.inputs?.includePerson2,
    cutDiagnostics
  });
}

function renderPortfolioHorizonSummary(result, elements, useReal, formatters) {
  const container = elements.portfolioHorizonSummary;
  if (!container) return;

  const { formatCurrency } = formatters;
  const percentiles = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;
  const basePath = useReal ? result.baseCase.pathReal : result.baseCase.pathNominal;
  const lastIndex = percentiles.p50.length - 1;

  const p10 = percentiles.p10[lastIndex];
  const p50 = percentiles.p50[lastIndex];
  const p90 = percentiles.p90[lastIndex];
  const base = basePath[lastIndex];

  container.innerHTML = `
    <div class="portfolio-horizon-item">
      <div class="portfolio-horizon-label">10th percentile</div>
      <div class="portfolio-horizon-value">${formatCurrency(p10)}</div>
    </div>
    <div class="portfolio-horizon-item">
      <div class="portfolio-horizon-label">Median</div>
      <div class="portfolio-horizon-value">${formatCurrency(p50)}</div>
    </div>
    <div class="portfolio-horizon-item">
      <div class="portfolio-horizon-label">90th percentile</div>
      <div class="portfolio-horizon-value">${formatCurrency(p90)}</div>
    </div>
    <div class="portfolio-horizon-item">
      <div class="portfolio-horizon-label">Base case</div>
      <div class="portfolio-horizon-value">${formatCurrency(base)}</div>
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

function getLifestyleResilienceMetrics(result, useReal = false) {
  const inputs = result?.inputs || {};
  const rows = result?.baseCase?.rows || [];
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
          ${renderSummaryItem('Plan success', formatPercent(successRate))}
          ${renderSummaryItem('Median ending portfolio', formatCurrency(medianEnd))}
          ${renderSummaryItem('Base-case timing', firstShortfallText)}
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
  cutDiagnostics = {}
) {
  const { formatCurrency, formatPercent } = formatters;
  const grid = elements.planSummaryGrid;
  if (!grid) return;

  const rows = result.baseCase?.rows || [];
  if (!rows.length) return;

  const inputs = result.inputs || {};
  const percentiles = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;
  const lastIndex = percentiles.p50.length - 1;

  const p10End = percentiles.p10[lastIndex];
  const p50End = percentiles.p50[lastIndex];
  const p90End = percentiles.p90[lastIndex];

  const totals = rows.reduce(
    (acc, row) => {
      acc.spending += getRowActualSpending(row, useReal);
      acc.withdrawals += Number(
        useReal ? row.withdrawalReal : row.withdrawalNominal
      ) || 0;
      return acc;
    },
    { spending: 0, withdrawals: 0 }
  );

  const lastRow = rows[rows.length - 1];
  const finalWithdrawal =
    Number(useReal ? lastRow.withdrawalReal : lastRow.withdrawalNominal) || 0;
  const medianFinalWithdrawalRate = p50End > 0 ? finalWithdrawal / p50End : 0;
  const dependence =
    totals.spending > 0 ? totals.withdrawals / totals.spending : 0;
  const initialWithdrawalRate =
    inputs.initialPortfolio > 0
      ? inputs.initialSpending / inputs.initialPortfolio
      : 0;

  const lifestyleMetrics = getLifestyleResilienceMetrics(result, useReal);

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

  grid.innerHTML = `
    ${renderSummarySection('Lifestyle resilience', [
      renderSummaryItem(
        'Comfort floor',
        lifestyleMetrics ? formatCurrency(lifestyleMetrics.comfortFloor) : '—'
      ),
      renderSummaryItem(
        'Minimum floor',
        lifestyleMetrics ? formatCurrency(lifestyleMetrics.minimumFloor) : '—'
      ),
      renderSummaryItem(
        'Worst cut',
        lifestyleMetrics
          ? `${formatCurrency(lifestyleMetrics.worstCutAmount)} (${formatPercent(
              lifestyleMetrics.worstCutPercent
            )})`
          : '—'
      )
    ])}

    ${renderSummarySection('Plan health', [
      renderSummaryItem(
        'Initial withdrawal rate',
        formatPercent(initialWithdrawalRate)
      ),
      renderSummaryItem(
        'Median final withdrawal rate',
        formatPercent(medianFinalWithdrawalRate)
      ),
      renderSummaryItem('Portfolio dependence', formatPercent(dependence))
    ])}

    ${renderSummarySection('Portfolio outcomes', [
      renderSummaryItem('10th percentile ending', formatCurrency(p10End)),
      renderSummaryItem('90th percentile ending', formatCurrency(p90End)),
      renderSummaryItem('Weak-case depletion year', weakCaseDepletionYear)
    ])}

    ${renderSummarySection('Plan risks', [
      renderSummaryItem('Worst spending shortfall', worstShortfallLabel),
      renderSummaryItem(
        'Years with spending shortfall',
        formatInteger(cutDiagnostics.shortfallYears || 0)
      ),
      renderSummaryItem(
        'Years below comfort floor',
        lifestyleMetrics
          ? formatInteger(lifestyleMetrics.yearsBelowComfort)
          : '—'
      )
    ])}
  `;
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

function renderSummaryItem(label, value) {
  return `
    <div class="summary-item">
      <div class="summary-label">${label}</div>
      <div class="summary-value">${value}</div>
    </div>
  `;
}

function renderPlanWarnings(result, elements, useReal, formatters) {
  const container = elements.planWarnings;
  if (!container) return;

  const rows = result.baseCase?.rows || [];
  if (!rows.length) return;

  const { formatPercent } = formatters;
  const inputs = result.inputs;
  const percentiles = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;
  const p10 = percentiles.p10;
  const planYears = inputs.years;

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

  if (!inputWarnings.length && !modelWarnings.length) {
    container.innerHTML = `
      <div class="plan-warning-ok">
        ✓ No major risks detected in current plan assumptions.
      </div>
    `;
    return;
  }

  const groups = [];

  if (inputWarnings.length) {
    groups.push(`
      <div class="plan-warning-group">
        <h4 class="plan-warning-group-title">Input warning</h4>
        ${inputWarnings
          .map(
            (text) => `
              <div class="plan-warning">⚠ ${text}</div>
            `
          )
          .join('')}
      </div>
    `);
  }

  if (modelWarnings.length) {
    groups.push(`
      <div class="plan-warning-group">
        <h4 class="plan-warning-group-title">Model risk</h4>
        ${modelWarnings
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

function renderDeterministicNote(elements) {
  const note = ensureDeterministicNoteContainer(elements);
  if (!note) return;

  note.textContent = 'This table shows the deterministic base case only.';
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