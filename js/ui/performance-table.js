function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';

  const abs = Math.abs(value * 100);
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';

  return `${sign}${abs.toFixed(1)}%`;
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function renderHeaderLabel(label, tooltip) {
  return `
    <span
      class="metric-heading-with-tooltip"
      tabindex="0"
      aria-label="${label}: ${tooltip}"
      data-tooltip="${tooltip}"
    >
      ${label}
    </span>
  `;
}

function renderArrow(value) {
  if (!Number.isFinite(value)) return '';

  const isUp = value >= 0;

  return `
    <span class="results-table-legend-arrow ${
      isUp
        ? 'results-table-legend-arrow--up'
        : 'results-table-legend-arrow--down'
    }">
      ${isUp ? '↑' : '↓'}
    </span>
  `;
}

function renderDrawdownDot(value) {
  return Number.isFinite(value) && value < 0
    ? '<span class="status-dot cut-moderate"></span>'
    : '';
}

function renderRolling5Dot(value) {
  return Number.isFinite(value) && value < 0.02
    ? '<span class="status-dot cut-severe"></span>'
    : '';
}

export function renderPerformanceTable(table, rows, formatCurrency, options = {}) {
  if (!table || !Array.isArray(rows)) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  if (!thead || !tbody) return;

  const useReal = Boolean(options.useReal);

  const startField = useReal ? 'startPortfolioReal' : 'startPortfolioNominal';
  const endField = useReal ? 'endPortfolioReal' : 'endPortfolioNominal';
  const valueLabel = useReal ? 'Real' : 'Nominal';

  thead.innerHTML = `
    <tr>
      <th class="col-text">Year</th>
      <th class="col-number">Start (${valueLabel} £)</th>
      <th class="col-number">End (${valueLabel} £)</th>
      <th class="col-number">
        ${renderHeaderLabel(
          'Market return',
          'The market movement for that year on the selected path.'
        )}
      </th>
      <th class="col-number">
        ${renderHeaderLabel(
          'Portfolio change',
          'The change in portfolio value from start to end of year, after withdrawals.'
        )}
      </th>
      <th class="col-number">
        ${renderHeaderLabel(
          'Drawdown',
          'The fall from the prior end-of-year peak.'
        )}
      </th>
      <th class="col-number">
        ${renderHeaderLabel(
          'Rolling 5y',
          'The annualised change over the last full 5-year period.'
        )}
      </th>
    </tr>
  `;

  let peak = null;

  tbody.innerHTML = rows
    .map((row, index) => {
      const year = Number(row?.year) || index + 1;
      const start = toFiniteNumber(row?.[startField]) ?? 0;
      const end = toFiniteNumber(row?.[endField]) ?? 0;
      const marketReturn = toFiniteNumber(row?.marketReturn);
      const portfolioChange = start > 0 ? (end / start) - 1 : null;

      peak = peak === null ? end : Math.max(peak, end);
      const drawdown = peak > 0 ? (end / peak) - 1 : null;

      let rolling5 = null;
      if (index >= 5) {
        const start5 = toFiniteNumber(rows[index - 5]?.[endField]);
        if (start5 && start5 > 0 && end > 0) {
          rolling5 = Math.pow(end / start5, 1 / 5) - 1;
        }
      }

      return `
        <tr>
          <td class="col-text">${year}</td>
          <td class="col-number">${formatCurrency(start)}</td>
          <td class="col-number">${formatCurrency(end)}</td>

          <td class="col-number">
            ${renderArrow(marketReturn)}
            ${formatPercent(marketReturn)}
          </td>

          <td class="col-number">
            ${renderArrow(portfolioChange)}
            ${formatPercent(portfolioChange)}
          </td>

          <td class="col-number">
            ${renderDrawdownDot(drawdown)}
            ${formatPercent(drawdown)}
          </td>

          <td class="col-number">
            ${renderRolling5Dot(rolling5)}
            ${formatPercent(rolling5)}
          </td>
        </tr>
      `;
    })
    .join('');
}