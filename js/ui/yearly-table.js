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
      <th>Year</th>
      <th>${escapeHtml(person1Name)}</th>
      ${includePerson2 ? `<th>${escapeHtml(person2Name)}</th>` : ''}
      <th>Start portfolio</th>
      <th>Target spending</th>
      <th>Actual spending</th>
      <th>Cut</th>
      <th>Shortfall</th>
      <th>State pension</th>
      <th>Other income</th>
      <th>Windfall</th>
      <th>Portfolio withdrawal</th>
      <th>End portfolio</th>
    </tr>
  `;

  tbody.innerHTML = rows.map((row, index) => {
    const cut = row.spendingCutPercent || 0;

    const target = useReal ? row.targetSpendingReal : row.targetSpendingNominal;
    const actual = useReal ? row.spendingReal : row.spendingNominal;
    const shortfall = Math.max(0, target - actual);

    let severity = '';
    let cutBadge = '';
    let shortfallBadge = '';
    let shortfallClass = '';

    if (cut > 0) {
      if (cut < 0.05) severity = 'cut-mild';
      else if (cut < 0.10) severity = 'cut-moderate';
      else severity = 'cut-severe';

      const label =
        cut < 0.05 ? 'Mild cut'
        : cut < 0.10 ? 'Moderate cut'
        : 'Severe cut';

      cutBadge = `<span class="cut-badge ${severity}">${label}</span>`;
    }

    if (shortfall > 0) {
      shortfallClass = 'spending-shortfall';
      shortfallBadge = `<span class="shortfall-badge">Shortfall</span>`;
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
        <td>${row.year}</td>
        <td>${row.age1}</td>
        ${includePerson2 ? `<td>${row.age2}</td>` : ''}
        <td>${formatCurrency(useReal ? row.startPortfolioReal : row.startPortfolioNominal)}</td>
        <td>${formatCurrency(target)}</td>
        <td>
          <div class="table-cell-with-badge">
            <span class="table-cell-value">${formatCurrency(actual)}</span>
            ${shortfallBadge}
          </div>
        </td>
        <td>
          <div class="table-cell-with-badge">
            <span class="table-cell-value">${cutDisplay}</span>
            ${cutBadge}
          </div>
        </td>
        <td>${shortfallDisplay}</td>
        <td>${formatCurrency(useReal ? row.statePensionReal : row.statePensionNominal)}</td>
        <td>${formatCurrency(useReal ? row.otherIncomeReal : row.otherIncomeNominal)}</td>
        <td>${formatCurrency(useReal ? row.windfallReal : row.windfallNominal)}</td>
        <td>${formatCurrency(useReal ? row.withdrawalReal : row.withdrawalNominal)}</td>
        <td>${formatCurrency(useReal ? row.endPortfolioReal : row.endPortfolioNominal)}</td>
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