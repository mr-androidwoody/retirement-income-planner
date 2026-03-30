function formatDelta(value, formatCurrency) {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${formatCurrency(abs)}`;
}

function formatPercent(value) {
  const abs = Math.abs(value * 100);
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${abs.toFixed(1)}%`;
}

export function renderYearlyTable(table, rows, useReal, formatCurrency, options = {}) {
  if (!table || !Array.isArray(rows)) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  const person1Name = sanitiseHeaderLabel(options.person1Name, 'Person 1');
  const includePerson2 = Boolean(options.includePerson2);
  const person2Name = sanitiseHeaderLabel(options.person2Name, 'Person 2');

  thead.innerHTML = `
    <tr>
      <th class="col-text">Year</th>
      <th class="col-text">${escapeHtml(person1Name)}</th>
      ${includePerson2 ? `<th class="col-text">${escapeHtml(person2Name)}</th>` : ''}
      <th class="col-number">Start portfolio</th>
      <th class="col-number">Target spending</th>
      <th class="col-number">Actual spending</th>
      <th class="col-number">Cut</th>
      <th class="col-number">Shortfall</th>
      <th class="col-number">State pension</th>
      <th class="col-number">Other income</th>
      <th class="col-number">Windfall</th>
      <th class="col-number">Portfolio withdrawal</th>
      <th class="col-number">End portfolio</th>
    </tr>
  `;

  let peak = 0;

  tbody.innerHTML = rows.map((row, index) => {
    const cut = Number(row.spendingCutPercent) || 0;

    const target = Number(useReal ? row.targetSpendingReal : row.targetSpendingNominal) || 0;
    const actual = Number(useReal ? row.spendingReal : row.spendingNominal) || 0;
    
    // Shortfall should ONLY reflect failure to fund spending, not cuts
    const shortfall = Number(row.spendingCutNominal ?? 0) === 0
      ? Math.max(0, target - actual)
      : 0;

    const start = Number(useReal ? row.startPortfolioReal : row.startPortfolioNominal) || 0;
    const end = Number(useReal ? row.endPortfolioReal : row.endPortfolioNominal) || 0;

    if (index === 0) {
      peak = start;
    } else {
      peak = Math.max(peak, start);
    }

    const drawdown = peak > 0 ? (start - peak) / peak : 0;
    const delta = end - start;
    const deltaPct = start > 0 ? delta / start : 0;

    const isUp = delta > 0;
    const isDown = delta < 0;

    let severity = '';
    let cutDot = '';
    let shortfallDot = '';

    if (cut > 0) {
      let cutLabel = '';

      if (cut < 0.05) {
        severity = 'cut-mild';
        cutLabel = 'Mild spending cut';
      } else if (cut < 0.10) {
        severity = 'cut-moderate';
        cutLabel = 'Moderate spending cut';
      } else {
        severity = 'cut-severe';
        cutLabel = 'Severe spending cut';
      }

      cutDot = `<span class="status-dot ${severity}" aria-hidden="true" title="${cutLabel}"></span>`;
    }

    if (shortfall > 0) {
      shortfallDot = `<span class="status-dot shortfall-dot" aria-hidden="true" title="Spending shortfall"></span>`;
    }

    const cutDisplay = cut > 0 ? `${(cut * 100).toFixed(1)}%` : '—';
    const shortfallDisplay = shortfall > 0 ? formatCurrency(shortfall) : '—';

    const startHtml = `
      <div class="cell-main">${formatCurrency(start)}</div>
      <div class="cell-sub ${drawdown < 0 ? 'is-down' : 'is-neutral'}">
        ${
          drawdown < 0
            ? `↓ ${Math.abs(drawdown * 100).toFixed(0)}% from peak`
            : 'At peak'
        }
      </div>
    `;

    const endHtml = `
      <div class="cell-main">${formatCurrency(end)}</div>
      <div class="cell-sub ${isUp ? 'is-up' : isDown ? 'is-down' : 'is-neutral'}">
        ${
          isUp
            ? `↑ ${formatDelta(delta, formatCurrency)} (${formatPercent(deltaPct)})`
            : isDown
              ? `↓ ${formatDelta(delta, formatCurrency)} (${formatPercent(deltaPct)})`
              : '—'
        }
      </div>
    `;

    return `
      <tr>
        <td class="col-text">${row.year}</td>
        <td class="col-text">${row.age1}</td>
        ${includePerson2 ? `<td class="col-text">${row.age2}</td>` : ''}
        <td class="col-number">${startHtml}</td>
        <td class="col-number">${formatCurrency(target)}</td>
        <td class="col-number">${formatCurrency(actual)}</td>
        <td class="cut-cell col-number">
          <div class="status-cell">
            <span class="status-value">${cutDisplay}</span>
            ${cutDot}
          </div>
        </td>
        <td class="shortfall-cell col-number">
          <div class="status-cell">
            <span class="status-value">${shortfallDisplay}</span>
            ${shortfallDot}
          </div>
        </td>
        <td class="col-number">${formatCurrency(useReal ? row.statePensionReal : row.statePensionNominal)}</td>
        <td class="col-number">${formatCurrency(useReal ? row.otherIncomeReal : row.otherIncomeNominal)}</td>
        <td class="col-number">${formatCurrency(useReal ? row.windfallReal : row.windfallNominal)}</td>
        <td class="col-number">${formatCurrency(useReal ? row.withdrawalReal : row.withdrawalNominal)}</td>
        <td class="col-number">${endHtml}</td>
      </tr>
    `;
  }).join('');
}

function sanitiseHeaderLabel(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}