export function renderYearlyTable(table, rows, useReal, formatCurrency, options = {}) {
  if (!table || !Array.isArray(rows)) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  const person1Name = sanitiseHeaderLabel(options.person1Name, 'Person 1');
  const includePerson2 = Boolean(options.includePerson2);
  const person2Name = sanitiseHeaderLabel(options.person2Name, 'Person 2');

  const cutDiagnostics = options.cutDiagnostics || {};
  const firstCutYear = cutDiagnostics.firstCutYear;
  const worstCutYear = cutDiagnostics.worstCutYear;
  const firstShortfallYear = cutDiagnostics.firstShortfallYear;
  const worstShortfallYear = cutDiagnostics.worstShortfallYear;

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

  tbody.innerHTML = rows.map((row, index) => {
    const cut = row.spendingCutPercent || 0;

    const target = useReal ? row.targetSpendingReal : row.targetSpendingNominal;
    const actual = useReal ? row.spendingReal : row.spendingNominal;
    const shortfall = Math.max(0, target - actual);

    let severity = '';
    let cutDot = '';
    let shortfallDot = '';
    let shortfallClass = '';

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
      shortfallClass = 'spending-shortfall';
      shortfallDot = `<span class="status-dot shortfall-dot" aria-hidden="true" title="Spending shortfall"></span>`;
    }

    const firstCutClass = index === firstCutYear ? 'first-cut-year' : '';
    const worstCutClass = index === worstCutYear ? 'worst-cut-year' : '';

    const firstShortfallClass = index === firstShortfallYear ? 'first-shortfall-year' : '';
    const worstShortfallClass = index === worstShortfallYear ? 'worst-shortfall-year' : '';

    const rowClass = [
      severity,
      shortfallClass,
      firstCutClass,
      worstCutClass,
      firstShortfallClass,
      worstShortfallClass
    ].filter(Boolean).join(' ');

    const cutDisplay = cut > 0 ? `${(cut * 100).toFixed(1)}%` : '—';
    const shortfallDisplay = shortfall > 0 ? formatCurrency(shortfall) : '—';

    return `
      <tr class="${rowClass}">
        <td class="col-text">${row.year}</td>
        <td class="col-text">${row.age1}</td>
        ${includePerson2 ? `<td class="col-text">${row.age2}</td>` : ''}
        <td class="col-number">${formatCurrency(useReal ? row.startPortfolioReal : row.startPortfolioNominal)}</td>
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
        <td class="col-number">${formatCurrency(useReal ? row.endPortfolioReal : row.endPortfolioNominal)}</td>
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