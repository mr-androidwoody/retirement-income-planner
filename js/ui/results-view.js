import { renderPortfolioChart, renderSpendingChart } from './charts.js';
import { renderYearlyTable } from './yearly-table.js';

export function renderResultsView({ result, elements, useReal, showFullTable, formatters }) {
  if (!result) return;

  const { formatCurrency, formatPercent, formatYears } = formatters;
  const percentileSeries = useReal ? result.monteCarlo.realPercentiles : result.monteCarlo.nominalPercentiles;
  const medianEnd = percentileSeries.p50[percentileSeries.p50.length - 1];
  const hasStressSummary = result.summary && result.summary.worstStressName;

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

  renderSpendingChart(elements.spendingChart, result, useReal, formatCurrency);

  renderMonteCarloSummary(result, elements, useReal, formatters);

  elements.tableCard.classList.toggle('hidden', !showFullTable);

  renderYearlyTable(
    elements.resultsTable,
    result.baseCase?.rows || [],
    useReal,
    formatCurrency,
    {
      person1Name: result.inputs?.person1Name,
      person2Name: result.inputs?.person2Name
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

  const metrics = [
    ['Simulations run', inputs.monteCarloRuns],
    ['Years modelled', inputs.years],
    ['Starting portfolio', formatCurrency(inputs.initialPortfolio)],
    ['Initial withdrawal rate', formatPercent(inputs.initialWithdrawalRate / 100)],

    ['State pension today', formatCurrency(inputs.statePensionToday)],
    ['Other income', formatCurrency(inputs.otherIncomeToday)],
    ['Windfall', formatCurrency(inputs.windfallAmount)],

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