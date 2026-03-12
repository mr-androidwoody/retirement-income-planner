import { renderPortfolioChart, renderSpendingChart } from './charts.js';
import { renderYearlyTable } from './yearly-table.js';

export function renderResultsView({ result, elements, useReal, showFullTable, formatters }) {
  if (!result) return;

  const { formatCurrency, formatPercent, formatYears } = formatters;
  const percentileSeries = useReal ? result.monteCarlo.realPercentiles : result.monteCarlo.nominalPercentiles;
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

  rows.forEach((r, i) => {
    const cut = r.spendingCutPercent || 0;

    if (cut > 0 && firstCutYear === null) {
      firstCutYear = i;
    }

    if (cut > worstCut) {
      worstCut = cut;
      worstCutYear = i;
    }

    const shortfall = getRowShortfall(r, useReal);

    if (shortfall > 0) {
      shortfallYears += 1;

      if (firstShortfallYear === null) {
        firstShortfallYear = i;
      }

      if (shortfall > worstShortfall) {
        worstShortfall = shortfall;
        worstShortfallYear = i;
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

  elements.summarySuccessRate.textContent = formatPercent(result.monteCarlo.successRate);
  elements.summaryMedianEnd.textContent = formatCurrency(medianEnd);

  if (hasStressSummary) {
    elements.summaryWorstStress.textContent = result.summary.worstStressName;
    elements.summaryWorstStressDesc.textContent = `Lowest ending portfolio across the deterministic stress paths: ${formatCurrency(
      useReal ? result.summary.worstStressTerminalReal : result.summary.worstStressTerminalNominal
    )}.`;
  } else {
    elements.summaryWorstStress.textContent = 'Removed';
    elements.summaryWorstStressDesc.textContent = 'Deterministic stress scenarios are no longer shown in the UI.';
  }

  const runway = result.summary?.cashRunwayYears;
  elements.summaryCashRunway.textContent = runway === Number.POSITIVE_INFINITY ? 'No draw' : formatYears(runway);

  renderPortfolioChart(elements.portfolioChart, result, useReal, formatCurrency);
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

  elements.tableCard.classList.toggle('hidden', !showFullTable);

  renderDeterministicNote(elements);
  renderStatusLegend(elements, rows);

  renderYearlyTable(
    elements.resultsTable,
    rows,
    useReal,
    formatCurrency,
    {
      person1Name: result.inputs?.person1Name,
      person2Name: result.inputs?.person2Name,
      includePerson2: result.inputs?.includePerson2,
      cutDiagnostics
    }
  );
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

  let status = 'strong';
  let label = 'Strong';
  let message = 'Your plan is on track to fund the full retirement horizon in most simulated outcomes.';

  if (successRate < 0.70) {
    status = 'weak';
    label = 'Weak';
    message = 'Your plan shows a material risk of running short and may need lower spending, more income, or a larger starting portfolio.';
  } else if (successRate < 0.90) {
    status = 'watch';
    label = 'Watch';
    message = 'Your plan works in many scenarios, but later outcomes become less secure and need monitoring.';
  }

  const firstShortfallText =
    cutDiagnostics.firstShortfallYear === null
      ? 'No spending shortfall in base case'
      : `First base-case shortfall: year ${cutDiagnostics.firstShortfallYear}`;

  panel.classList.remove(
    'plan-summary-panel--strong',
    'plan-summary-panel--watch',
    'plan-summary-panel--weak'
  );
  panel.classList.add(`plan-summary-panel--${status}`);

  if (!hero) return;

  hero.innerHTML = `
    <div class="retirement-outlook-badge retirement-outlook-badge--${status}">
      Retirement outlook: ${label}
    </div>
    <p class="retirement-outlook-message">${message}</p>
    <div class="retirement-outlook-stats">
      <div class="retirement-outlook-stat">
        <span class="retirement-outlook-stat__label">Plan success</span>
        <strong class="retirement-outlook-stat__value">${formatPercent(successRate)}</strong>
      </div>
      <div class="retirement-outlook-stat">
        <span class="retirement-outlook-stat__label">Median ending portfolio</span>
        <strong class="retirement-outlook-stat__value">${formatCurrency(medianEnd)}</strong>
      </div>
      <div class="retirement-outlook-stat">
        <span class="retirement-outlook-stat__label">Base-case timing</span>
        <strong class="retirement-outlook-stat__value">${firstShortfallText}</strong>
      </div>
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
  const percentiles = useReal ? result.monteCarlo.realPercentiles : result.monteCarlo.nominalPercentiles;

  const lastIndex = percentiles.p50.length - 1;
  const medianEnd = percentiles.p50[lastIndex];
  const p10End = percentiles.p10[lastIndex];
  const p90End = percentiles.p90[lastIndex];

  const totals = rows.reduce(
    (acc, r) => {
      acc.spending += useReal ? r.spendingReal : r.spendingNominal;
      acc.withdrawals += useReal ? r.withdrawalReal : r.withdrawalNominal;
      acc.pension += useReal ? r.statePensionReal : r.statePensionNominal;
      acc.otherIncome += useReal ? r.otherIncomeReal : r.otherIncomeNominal;
      return acc;
    },
    { spending: 0, withdrawals: 0, pension: 0, otherIncome: 0 }
  );

  const lastRow = rows[rows.length - 1];
  const finalWithdrawal = useReal ? lastRow.withdrawalReal : lastRow.withdrawalNominal;

  const medianFinalWithdrawalRate = medianEnd > 0 ? finalWithdrawal / medianEnd : 0;

  let yearsToZero = 'Not depleted';

  for (let i = 0; i < percentiles.p10.length; i++) {
    if (percentiles.p10[i] <= 0) {
      yearsToZero = i;
      break;
    }
  }

  const successRate = result.monteCarlo.successRate;
  const maxCut = Math.max(...rows.map((r) => r.spendingCutPercent || 0));
  const dependence = totals.spending > 0 ? totals.withdrawals / totals.spending : 0;
  const finalWithdrawalRatePressure = medianFinalWithdrawalRate;
  const percentileSpread = medianEnd > 0 ? Math.max(0, (medianEnd - p10End) / medianEnd) : 1;

  let sustainabilityScore = 100;

  sustainabilityScore -= (1 - successRate) * 45;
  sustainabilityScore -= maxCut * 100;
  sustainabilityScore -= Math.max(0, dependence - 0.5) * 70;
  sustainabilityScore -= Math.max(0, finalWithdrawalRatePressure - 0.05) * 220;
  sustainabilityScore -= percentileSpread * 18;

  if (yearsToZero !== 'Not depleted') {
    sustainabilityScore -= 12;
  }

  sustainabilityScore = Math.max(0, Math.min(100, Math.round(sustainabilityScore)));

  let sustainabilityLabel = 'Excellent';
  if (sustainabilityScore < 90) sustainabilityLabel = 'Strong';
  if (sustainabilityScore < 75) sustainabilityLabel = 'Moderate';
  if (sustainabilityScore < 60) sustainabilityLabel = 'Fragile';
  if (sustainabilityScore < 40) sustainabilityLabel = 'Unsustainable';

  const initialWithdrawalRate =
    inputs.initialPortfolio > 0
      ? inputs.initialSpending / inputs.initialPortfolio
      : 0;

  const firstShortfallYearLabel =
    cutDiagnostics.firstShortfallYear === null ? 'None' : cutDiagnostics.firstShortfallYear;

  const worstShortfallLabel =
    cutDiagnostics.worstShortfallYear === null
      ? 'None'
      : `${formatCurrency(cutDiagnostics.worstShortfall)} in year ${cutDiagnostics.worstShortfallYear}`;

  grid.innerHTML = `
    <div class="summary-section">
      <div class="summary-section-title">Plan health</div>
      <div class="summary-section-grid">
        ${renderSummaryItem('Spending sustainability score', `${sustainabilityScore}/100 — ${sustainabilityLabel}`)}
        ${renderSummaryItem('Initial withdrawal rate', formatPercent(initialWithdrawalRate))}
        ${renderSummaryItem('Median final withdrawal rate', formatPercent(medianFinalWithdrawalRate))}
        ${renderSummaryItem('Portfolio dependence', formatPercent(dependence))}
      </div>
    </div>

    <div class="summary-section">
      <div class="summary-section-title">Plan setup</div>
      <div class="summary-section-grid">
        ${renderSummaryItem('Simulations run', formatInteger(inputs.monteCarloRuns))}
        ${renderSummaryItem('Years modelled', formatInteger(inputs.years))}
        ${renderSummaryItem('Starting portfolio', formatCurrency(inputs.initialPortfolio))}
        ${renderSummaryItem('Total household spending', formatCurrency(totals.spending))}
      </div>
    </div>

    <div class="summary-section">
      <div class="summary-section-title">Portfolio outcomes</div>
      <div class="summary-section-grid">
        ${renderSummaryItem('Median ending portfolio', formatCurrency(medianEnd))}
        ${renderSummaryItem('10th percentile ending', formatCurrency(p10End))}
        ${renderSummaryItem('90th percentile ending', formatCurrency(p90End))}
        ${renderSummaryItem('Total withdrawals', formatCurrency(totals.withdrawals))}
      </div>
    </div>

    <div class="summary-section">
      <div class="summary-section-title">Plan risks</div>
      <div class="summary-section-grid">
        ${renderSummaryItem('First spending shortfall year', firstShortfallYearLabel)}
        ${renderSummaryItem('Worst spending shortfall', worstShortfallLabel)}
        ${renderSummaryItem('Years with spending shortfall', formatInteger(cutDiagnostics.shortfallYears || 0))}
        ${renderSummaryItem('Total state pension income', formatCurrency(totals.pension))}
      </div>
    </div>
  `;
}

function renderSummaryItem(label, value) {
  return `
    <div class="summary-item">
      <div class="summary-item-label">${label}</div>
      <div class="summary-item-value">${value}</div>
    </div>
  `;
}

function renderPlanWarnings(result, elements, useReal, formatters) {
  const container = elements.planWarnings;
  if (!container) return;

  const rows = result.baseCase?.rows || [];
  if (!rows.length) return;

  const { formatPercent, formatCurrency } = formatters;
  const inputs = result.inputs;

  const warnings = [];

  const startWithdrawalRate = inputs.initialSpending / inputs.initialPortfolio;

  if (startWithdrawalRate > 0.055) {
    warnings.push({
      level: 'warning',
      text: `Aggressive starting withdrawal rate (${formatPercent(startWithdrawalRate)}).`
    });
  }

  const percentiles = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;

  const p10 = percentiles.p10;
  const planYears = inputs.years;

  for (let i = 0; i < p10.length; i++) {
    if (p10[i] <= 0 && i < planYears * 0.5) {
      warnings.push({
        level: 'warning',
        text: `Weak outcomes reach portfolio depletion by year ${i}.`
      });
      break;
    }
  }

  const maxCut = Math.max(...rows.map((r) => r.spendingCutPercent || 0));

  if (maxCut > 0.15) {
    warnings.push({
      level: 'warning',
      text: `Guardrails reduce spending by up to ${formatPercent(maxCut)}.`
    });
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.spending += useReal ? r.spendingReal : r.spendingNominal;
      acc.withdrawals += useReal ? r.withdrawalReal : r.withdrawalNominal;
      return acc;
    },
    { spending: 0, withdrawals: 0 }
  );

  const dependence =
    totals.spending > 0 ? totals.withdrawals / totals.spending : 0;

  if (dependence > 0.7) {
    warnings.push({
      level: 'info',
      text: `High reliance on portfolio withdrawals (${formatPercent(dependence)} of spending).`
    });
  }

  let firstShortfallYear = null;
  let worstShortfall = 0;
  let worstShortfallYear = null;

  rows.forEach((r, i) => {
    const shortfall = getRowShortfall(r, useReal);

    if (shortfall > 0) {
      if (firstShortfallYear === null) {
        firstShortfallYear = i;
      }

      if (shortfall > worstShortfall) {
        worstShortfall = shortfall;
        worstShortfallYear = i;
      }
    }
  });

  if (firstShortfallYear !== null) {
    warnings.push({
      level: 'warning',
      text: `Target spending is not fully met from year ${firstShortfallYear}. Worst shortfall is ${formatCurrency(worstShortfall)} in year ${worstShortfallYear}.`
    });
  }

  if (!warnings.length) {
    container.innerHTML = `
      <div class="plan-warning-ok">
        ✓ No major risks detected in current plan assumptions.
      </div>
    `;
    return;
  }

  container.innerHTML = warnings
    .map(
      (w) => `
      <div class="plan-warning">
        ⚠ ${w.text}
      </div>
    `
    )
    .join('');
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
      <span class="legend-item">
        <span class="status-dot cut-mild" aria-hidden="true"></span>
        <span>Spending cut (mild)</span>
      </span>
    `);
  }

  if (flags.hasModerate) {
    items.push(`
      <span class="legend-item">
        <span class="status-dot cut-moderate" aria-hidden="true"></span>
        <span>Spending cut (moderate)</span>
      </span>
    `);
  }

  if (flags.hasSevere) {
    items.push(`
      <span class="legend-item">
        <span class="status-dot cut-severe" aria-hidden="true"></span>
        <span>Spending cut (severe)</span>
      </span>
    `);
  }

  if (flags.hasShortfall) {
    items.push(`
      <span class="legend-item">
        <span class="status-dot shortfall-dot" aria-hidden="true"></span>
        <span>Spending shortfall</span>
      </span>
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

  rows.forEach((r) => {
    const cut = r.spendingCutPercent || 0;

    if (cut > 0 && cut < 0.05) hasMild = true;
    else if (cut >= 0.05 && cut < 0.10) hasModerate = true;
    else if (cut >= 0.10) hasSevere = true;

    if (getRowShortfall(r, true) > 0 || getRowShortfall(r, false) > 0) {
      hasShortfall = true;
    }
  });

  return {
    hasMild,
    hasModerate,
    hasSevere,
    hasShortfall
  };
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
  if (event.key === 'Escape' && glossaryOverlay && !glossaryOverlay.classList.contains('hidden')) {
    glossaryOverlay.classList.add('hidden');
    document.body.classList.remove('glossary-open');
  }
});