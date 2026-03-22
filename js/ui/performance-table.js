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

export function renderPerformanceTable(table, rows, formatCurrency, options = {}) {
  if (!table || !Array.isArray(rows)) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  thead.innerHTML = `
    <tr>
      <th class="col-text">Year</th>
      <th class="col-number">Start (£)</th>
      <th class="col-number">End (£)</th>
      <th class="col-number">Market return</th>
      <th class="col-number">Portfolio return</th>
      <th class="col-number">Drawdown</th>
      <th class="col-number">Rolling 5y</th>
    </tr>
  `;

  let peak = null;

  tbody.innerHTML = rows.map((row, index) => {
    const year = Number(row.year) || index + 1;
    const start = toFiniteNumber(row.startPortfolioNominal) ?? 0;
    const end = toFiniteNumber(row.endPortfolioNominal) ?? 0;
    const marketReturn =
      toFiniteNumber(row.marketReturn) ??
      (start > 0 ? (end / start) - 1 : null);
    const portfolioReturn = start > 0 ? (end / start) - 1 : null;

    peak = peak === null ? end : Math.max(peak, end);
    const drawdown = peak > 0 ? (end / peak) - 1 : null;

    let rolling5 = null;
    if (index >= 4) {
      const end5 = toFiniteNumber(rows[index - 4]?.endPortfolioNominal);
      if (end5 && end5 > 0) {
        rolling5 = Math.pow(end / end5, 1 / 5) - 1;
      }
    }

    return `
      <tr>
        <td class="col-text">${year}</td>
        <td class="col-number">${formatCurrency(start)}</td>
        <td class="col-number">${formatCurrency(end)}</td>
        <td class="col-number">${formatPercent(marketReturn)}</td>
        <td class="col-number">${formatPercent(portfolioReturn)}</td>
        <td class="col-number">${formatPercent(drawdown)}</td>
        <td class="col-number">${formatPercent(rolling5)}</td>
      </tr>
    `;
  }).join('');
}