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