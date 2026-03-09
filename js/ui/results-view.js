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

  rows.forEach((r, i) => {
    const cut = r.spendingCutPercent || 0;

    if (cut > 0 && firstCutYear === null) {
      firstCutYear = i;
    }

    if (cut > worstCut) {
      worstCut = cut;
      worstCutYear = i;
    }
  });

  const cutDiagnostics = {
    firstCutYear,
    worstCutYear,
    worstCut
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

  renderPlanWarnings(result, elements, useReal, formatters);
  renderMonteCarloSummary(result, elements, useReal, formatters);

  elements.tableCard.classList.toggle('hidden', !showFullTable);

  renderYearlyTable(
    elements.resultsTable,
    rows,
    useReal,
    formatCurrency,
    {
      person1Name: result.inputs?.person1Name,
      person2Name: result.inputs?.person2Name,
      cutDiagnostics
    }
  );
}

function renderMonteCarloSummary(result, elements, useReal, formatters) {
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

  const worstEnd = Math.min(...percentiles.p10);
  const bestEnd = Math.max(...percentiles.p90);

  const totals = rows.reduce(
    (acc, r) => {
      acc.spending += useReal ? r.actualSpendingReal : r.actualSpendingNominal;
      acc.withdrawals += useReal ? r.withdrawalReal : r.withdrawalNominal;
      acc.pension += useReal ? r.statePensionReal : r.statePensionNominal;
      acc.otherIncome += useReal ? r.otherIncomeReal : r.otherIncomeNominal;
      return acc;
    },
    { spending: 0, withdrawals: 0, pension: 0, otherIncome: 0 }
  );

  const lastRow = rows[rows.length - 1];

  const finalWithdrawal = useReal ? lastRow.withdrawalReal : lastRow.withdrawalNominal;
  const finalPortfolioStart = useReal ? lastRow.startPortfolioReal : lastRow.startPortfolioNominal;

  const medianFinalWithdrawalRate = medianEnd > 0 ? finalWithdrawal / medianEnd : 0;
  const finalYearWithdrawalPct = finalPortfolioStart > 0 ? finalWithdrawal / finalPortfolioStart : 0;

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
  const percentileSpread =
    medianEnd > 0 ? Math.max(0, (medianEnd - p10End) / medianEnd) : 1;

  let sustainabilityScore = 100;

  /* Monte Carlo success remains the anchor */
  sustainabilityScore -= (1 - successRate) * 45;

  /* Penalise large spending cuts */
  sustainabilityScore -= maxCut * 100;

  /* Penalise high dependence on portfolio withdrawals */
  sustainabilityScore -= Math.max(0, dependence - 0.5) * 70;

  /* Penalise high late-stage withdrawal pressure */
  sustainabilityScore -= Math.max(0, finalWithdrawalRatePressure - 0.05) * 220;

  /* Penalise weak downside resilience */
  sustainabilityScore -= percentileSpread * 18;

  /* Penalise actual depletion in the weak path */
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

  const metrics = [
    ['Spending sustainability score', `${sustainabilityScore}/100 — ${sustainabilityLabel}`],

    ['Simulations run', inputs.monteCarloRuns],
    ['Years modelled', inputs.years],
    ['Starting portfolio', formatCurrency(inputs.initialPortfolio)],
    ['Initial withdrawal rate', formatPercent(initialWithdrawalRate)],

    ['Success rate', formatPercent(result.monteCarlo.successRate)],
    ['Median ending portfolio', formatCurrency(medianEnd)],
    ['10th percentile ending', formatCurrency(p10End)],
    ['90th percentile ending', formatCurrency(p90End)],
    ['Worst ending', formatCurrency(worstEnd)],
    ['Best ending', formatCurrency(bestEnd)],

    ['Total household spending', formatCurrency(totals.spending)],
    ['Total withdrawals', formatCurrency(totals.withdrawals)],
    ['Total state pension income', formatCurrency(totals.pension)],
    ['Total other income', formatCurrency(totals.otherIncome)],

    ['Median final withdrawal rate', formatPercent(medianFinalWithdrawalRate)],
    [`Withdrawal % in year ${inputs.years}`, formatPercent(finalYearWithdrawalPct)],
    ['Portfolio dependence', formatPercent(dependence)],
    ['Maximum spending cut', formatPercent(maxCut)],
    ['Years until portfolio hits £0 (worst path)', yearsToZero]
  ];

  grid.innerHTML = metrics
    .map(
      ([label, value]) => `
      <div class="summary-item">
        <div class="summary-item-label">${label}</div>
        <div class="summary-item-value">${value}</div>
      </div>
    `
    )
    .join('');
}

function renderPlanWarnings(result, elements, useReal, formatters) {
  const container = elements.planWarnings;
  if (!container) return;

  const rows = result.baseCase?.rows || [];
  if (!rows.length) return;

  const { formatPercent } = formatters;
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
      acc.spending += useReal ? r.actualSpendingReal : r.actualSpendingNominal;
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