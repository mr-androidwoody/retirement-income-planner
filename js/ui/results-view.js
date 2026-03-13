import { renderPortfolioChart, renderSpendingChart } from './charts.js';
import { renderYearlyTable } from './yearly-table.js';

export function renderResultsView({ result, elements, useReal, showFullTable, formatters }) {
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
    const cut = row.spendingCutPercent || 0;

    if (cut > 0 && firstCutYear === null) {
      firstCutYear = index;
    }

    if (cut > worstCut) {
      worstCut = cut;
      worstCutYear = index;
    }

    const shortfall = getRowShortfall(row, useReal);

    if (shortfall > 0) {
      shortfallYears += 1;

      if (firstShortfallYear === null) {
        firstShortfallYear = index;
      }

      if (shortfall > worstShortfall) {
        worstShortfall = shortfall;
        worstShortfallYear = index;
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
    elements.summarySuccessRate.textContent = formatPercent(result.monteCarlo.successRate);
  }

  if (elements.summaryMedianEnd) {
    elements.summaryMedianEnd.textContent = formatCurrency(medianEnd);
  }

  if (hasStressSummary) {
    if (elements.summaryWorstStress) {
      elements.summaryWorstStress.textContent = result.summary.worstStressName;
    }

    if (elements.summaryWorstStressDesc) {
      elements.summaryWorstStressDesc.textContent =
        `Lowest ending portfolio across the deterministic stress paths: ${formatCurrency(
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
    <div class="chart-horizon-metric">
      <span class="chart-horizon-label">P10</span>
      <span class="chart-horizon-value">${formatCurrency(p10)}</span>
    </div>
    <div class="chart-horizon-metric">
      <span class="chart-horizon-label">Median</span>
      <span class="chart-horizon-value">${formatCurrency(p50)}</span>
    </div>
    <div class="chart-horizon-metric">
      <span class="chart-horizon-label">P90</span>
      <span class="chart-horizon-value">${formatCurrency(p90)}</span>
    </div>
    <div class="chart-horizon-metric">
      <span class="chart-horizon-label">Base case</span>
      <span class="chart-horizon-value">${formatCurrency(base)}</span>
    </div>
  `;
}

function getLifestyleResilienceMetrics(result, useReal = false) {
  const inputs = result?.inputs || {};
  const rows = result?.baseCase?.rows || [];

  const targetSpending = Number(inputs.initialSpending || 0);
  const comfortFloor = Number(inputs.comfortSpending || 0);
  const minimumFloor = Number(inputs.minimumSpending || 0);

  if (!targetSpending || !rows.length) {
    return null;
  }

  let worstCutAmount = 0;
  let worstCutPercent = 0;
  let yearsBelowComfort = 0;
  let yearsBelowMinimum = 0;

  rows.forEach((row) => {
    const annualTarget = Number(
      useReal ? row.targetSpendingReal : row.targetSpendingNominal
    ) || 0;

    const annualActual = Number(
      useReal ? row.spendingReal : row.spendingNominal
    ) || 0;

    const cutAmount = Math.max(0, annualTarget - annualActual);
    const cutPercent = annualTarget > 0 ? cutAmount / annualTarget : 0;

    if (cutAmount > worstCutAmount) {
      worstCutAmount = cutAmount;
    }

    if (cutPercent > worstCutPercent) {
      worstCutPercent = cutPercent;
    }

    if (comfortFloor > 0 && annualActual < comfortFloor) {
      yearsBelowComfort += 1;
    }

    if (minimumFloor > 0 && annualActual < minimumFloor) {
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

function renderRetirementOutlook(result, elements, useReal, formatters, cutDiagnostics = {}) {
  const hero = elements.retirementOutlookHero;
  const panel = elements.planSummaryPanel;
  if (!panel) return;

  const { formatCurrency, formatPercent } = formatters;
  const percentiles = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;
  const medianEnd = percentiles.p50[percentiles.p50.length - 1];
  const successRate = result.monteCarlo.successRate;

  const targetSpending = result.inputs?.initialSpending || 0;
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

  if (successRate < 0.70) {
    status = 'weak';
    label = 'Weak';
    message = 'The plan does not reliably sustain the target spending level across simulations.';
  } else if (successRate < 0.90) {
    status = 'watch';
    label = 'Watch';
    message = 'The plan is broadly viable, but outcomes show some pressure and should be monitored.';
  }

  if (hasAnyShortfall) {
    if (successRate >= 0.90) {
      guardrailNotice = `
       <div class="plan-summary-note">
         ⓘ Base case path dips below target in ${shortfallYears} year${shortfallYears === 1 ? '' : 's'}.
          <br>Worst shortfall: <strong>${formatCurrency(worstShortfall)}</strong> in year ${worstYear}.
          <br>Monte Carlo success remains <strong>${formatPercent(successRate)}</strong>.
       </div>
      `;
    } else {
      guardrailNotice = `
        <div class="plan-summary-note plan-summary-note--warning">
          ⚠ Base case spending pressure — the deterministic path falls below target in ${shortfallYears} year${shortfallYears === 1 ? '' : 's'}.
          Worst shortfall: ${formatCurrency(worstShortfall)} in year ${worstYear}.
        </div>
      `;
    }
  }

  const firstShortfallText =
    firstShortfallYear === null
      ? 'No base case shortfall'
      : `Base case shortfall begins: year ${firstShortfallYear}`;

  panel.classList.remove(
    'plan-summary-panel--strong',
    'plan-summary-panel--watch',
    'plan-summary-panel--weak'
  );
  panel.classList.add(`plan-summary-panel--${status}`);

  if (!hero) return;

  hero.innerHTML = `
    <div class="retirement-outlook-status retirement-outlook-status--${status}">
      <div class="retirement-outlook-status__title">
        Retirement outlook: ${label}
      </div>
      <div class="retirement-outlook-status__message">
        ${message}
      </div>
    </div>

    ${guardrailNotice}

    <div class="plan-summary-heading">Outcome summary</div>

    <div class="plan-summary-metrics">
      ${renderSummaryItem('Plan success', formatPercent(successRate))}
      ${renderSummaryItem('Median ending portfolio', formatCurrency(medianEnd))}
      ${renderSummaryItem('Base case timing', firstShortfallText)}
    </div>
  `;
}

function renderMonteCarloSummary(result, elements, useReal, formatters, cutDiagnostics = {}) {
  const { formatCurrency, formatPercent } = formatters;
  const grid = elements.planSummaryGrid;
  if (!grid) return;

  const rows = result.baseCase?.rows || [];
  if (!rows.length) return;

  const inputs = result.inputs;
  const percentiles = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;
  const lastIndex = percentiles.p50.length - 1;

  const medianEnd = percentiles.p50[lastIndex];
  const p10End = percentiles.p10[lastIndex];
  const p90End = percentiles.p90[lastIndex];

  const totals = rows.reduce(
    (acc, row) => {
      acc.spending += useReal ? row.spendingReal : row.spendingNominal;
      acc.withdrawals += useReal ? row.withdrawalReal : row.withdrawalNominal;
      acc.pension += useReal ? row.statePensionReal : row.statePensionNominal;
      acc.otherIncome += useReal ? row.otherIncomeReal : row.otherIncomeNominal;
      return acc;
    },
    { spending: 0, withdrawals: 0, pension: 0, otherIncome: 0 }
  );

  const lastRow = rows[rows.length - 1];
  const finalWithdrawal = useReal ? lastRow.withdrawalReal : lastRow.withdrawalNominal;
  const medianFinalWithdrawalRate = medianEnd > 0 ? finalWithdrawal / medianEnd : 0;

  const initialWithdrawalRate =
    inputs.initialPortfolio > 0 ? inputs.initialSpending / inputs.initialPortfolio : 0;

  const firstShortfallYearLabel =
    cutDiagnostics.firstShortfallYear === null ? 'None' : cutDiagnostics.firstShortfallYear;

  const worstShortfallLabel =
    cutDiagnostics.worstShortfallYear === null
      ? 'None'
      : `${formatCurrency(cutDiagnostics.worstShortfall)} in year ${cutDiagnostics.worstShortfallYear}`;

  const lifestyleMetrics = getLifestyleResilienceMetrics(result, useReal);

  grid.innerHTML = `
    <div class="plan-summary-heading">Plan health</div>
    <div class="plan-summary-metrics">
      ${lifestyleMetrics ? renderSummaryItem('Target spending', formatCurrency(lifestyleMetrics.targetSpending)) : ''}
      ${lifestyleMetrics ? renderSummaryItem('Comfort floor', formatCurrency(lifestyleMetrics.comfortFloor)) : ''}
      ${lifestyleMetrics ? renderSummaryItem('Minimum floor', formatCurrency(lifestyleMetrics.minimumFloor)) : ''}
      ${lifestyleMetrics ? renderSummaryItem('Worst cut', `${formatCurrency(lifestyleMetrics.worstCutAmount)} (${formatPercent(lifestyleMetrics.worstCutPercent)})`) : ''}
      ${lifestyleMetrics ? renderSummaryItem('Years below comfort floor', formatInteger(lifestyleMetrics.yearsBelowComfort)) : ''}
      ${lifestyleMetrics ? renderSummaryItem('Years below minimum floor', formatInteger(lifestyleMetrics.yearsBelowMinimum)) : ''}
      ${renderSummaryItem('Initial withdrawal rate', formatPercent(initialWithdrawalRate))}
      ${renderSummaryItem('Median final withdrawal rate', formatPercent(medianFinalWithdrawalRate))}
      ${renderSummaryItem('Portfolio dependence', formatPercent(totals.spending > 0 ? totals.withdrawals / totals.spending : 0))}
    </div>

    <div class="plan-summary-heading">Plan setup</div>
    <div class="plan-summary-metrics">
      ${renderSummaryItem('Simulations run', formatInteger(inputs.monteCarloRuns))}
      ${renderSummaryItem('Years modelled', formatInteger(inputs.years))}
      ${renderSummaryItem('Starting portfolio', formatCurrency(inputs.initialPortfolio))}
      ${renderSummaryItem('Total household spending', formatCurrency(totals.spending))}
    </div>

    <div class="plan-summary-heading">Portfolio outcomes</div>
    <div class="plan-summary-metrics">
      ${renderSummaryItem('Median ending portfolio', formatCurrency(medianEnd))}
      ${renderSummaryItem('10th percentile ending', formatCurrency(p10End))}
      ${renderSummaryItem('90th percentile ending', formatCurrency(p90End))}
      ${renderSummaryItem('Total withdrawals', formatCurrency(totals.withdrawals))}
    </div>

    <div class="plan-summary-heading">Plan risks</div>
    <div class="plan-summary-metrics">
      ${renderSummaryItem('First spending shortfall year', firstShortfallYearLabel)}
      ${renderSummaryItem('Worst spending shortfall', worstShortfallLabel)}
      ${renderSummaryItem('Years with spending shortfall', formatInteger(cutDiagnostics.shortfallYears || 0))}
      ${renderSummaryItem('Total state pension income', formatCurrency(totals.pension))}
    </div>
  `;
}

function renderSummaryItem(label, value) {
  return `
    <div class="summary-metric">
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
    inputs.initialPortfolio > 0 ? inputs.initialSpending / inputs.initialPortfolio : 0;

  if (startWithdrawalRate > 0.055) {
    inputWarnings.push(
      `High starting withdrawal rate (${formatPercent(startWithdrawalRate)}), which may reduce resilience if returns are weaker than expected.`
    );
  }

  for (let i = 0; i < p10.length; i += 1) {
    if (p10[i] <= 0 && i < planYears * 0.5) {
      modelWarnings.push(`Weaker simulated outcomes deplete the portfolio by year ${i}.`);
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
        <div class="plan-warning-group-title">Input warning</div>
        ${inputWarnings.map((text) => `
          <div class="plan-warning">⚠ ${text}</div>
        `).join('')}
      </div>
    `);
  }

  if (modelWarnings.length) {
    groups.push(`
      <div class="plan-warning-group">
        <div class="plan-warning-group-title">Model risk</div>
        ${modelWarnings.map((text) => `
          <div class="plan-warning">⚠ ${text}</div>
        `).join('')}
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
      <div class="legend-item">
        <span class="legend-swatch legend-swatch--mild"></span>
        <span class="legend-text">Spending cut (mild)</span>
      </div>
    `);
  }

  if (flags.hasModerate) {
    items.push(`
      <div class="legend-item">
        <span class="legend-swatch legend-swatch--moderate"></span>
        <span class="legend-text">Spending cut (moderate)</span>
      </div>
    `);
  }

  if (flags.hasSevere) {
    items.push(`
      <div class="legend-item">
        <span class="legend-swatch legend-swatch--severe"></span>
        <span class="legend-text">Spending cut (severe)</span>
      </div>
    `);
  }

  if (flags.hasShortfall) {
    items.push(`
      <div class="legend-item">
        <span class="legend-swatch legend-swatch--shortfall"></span>
        <span class="legend-text">Spending shortfall</span>
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
    const cut = row.spendingCutPercent || 0;

    if (cut > 0 && cut < 0.05) {
      hasMild = true;
    } else if (cut >= 0.05 && cut < 0.10) {
      hasModerate = true;
    } else if (cut >= 0.10) {
      hasSevere = true;
    }

    if (getRowShortfall(row, true) > 0 || getRowShortfall(row, false) > 0) {
      hasShortfall = true;
    }
  });

  return { hasMild, hasModerate, hasSevere, hasShortfall };
}

function getRowShortfall(row, useReal) {
  const target = useReal ? row.targetSpendingReal : row.targetSpendingNominal;
  const actual = useReal ? row.spendingReal : row.spendingNominal;
  const portfolioEnd = useReal ? row.endPortfolioReal : row.endPortfolioNominal;

  let shortfall = Math.max(0, target - actual);

  if (shortfall === 0 && portfolioEnd <= 0 && target > actual) {
    shortfall = target - actual;
  }

  return shortfall;
}

function formatInteger(value) {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);
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
  if (event.key === 'Escape' && glossaryOverlay && !glossaryOverlay.classList.contains('hidden')) {
    glossaryOverlay.classList.add('hidden');
    document.body.classList.remove('glossary-open');
  }
});