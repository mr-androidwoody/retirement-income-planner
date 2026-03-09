export function renderYearlyTable(table, rows, useReal, formatCurrency, options = {}) {
  if (!table || !Array.isArray(rows)) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  const person1Name = sanitiseHeaderLabel(options.person1Name, 'Person 1');
  const person2Name = sanitiseHeaderLabel(options.person2Name, 'Person 2');

  const cutDiagnostics = options.cutDiagnostics || {};
  const firstCutYear = cutDiagnostics.firstCutYear;
  const worstCutYear = cutDiagnostics.worstCutYear;

  thead.innerHTML = `
    <tr>
      <th>Year</th>
      <th>${escapeHtml(person1Name)}</th>
      <th>${escapeHtml(person2Name)}</th>
      <th>Start portfolio</th>
      <th>Household spending</th>
      <th>State pension</th>
      <th>Other income</th>
      <th>Windfall</th>
      <th>Portfolio withdrawal</th>
      <th>End portfolio</th>
    </tr>
  `;

  tbody.innerHTML = rows.map((row, index) => {

    const cut = row.spendingCutPercent || 0;

    let severity = '';
    let badge = '';

    if (cut > 0) {
      if (cut < 0.05) severity = 'cut-mild';
      else if (cut < 0.10) severity = 'cut-moderate';
      else severity = 'cut-severe';

      const label =
        cut < 0.05 ? 'Mild cut'
        : cut < 0.10 ? 'Moderate cut'
        : 'Severe cut';

      badge = `<span class="cut-badge ${severity}">${label}</span>`;
    }

    const firstCutClass = index === firstCutYear ? 'first-cut-year' : '';
    const worstCutClass = index === worstCutYear ? 'worst-cut-year' : '';

    const rowClass = [
      severity,
      firstCutClass,
      worstCutClass
    ].filter(Boolean).join(' ');

    return `
      <tr class="${rowClass}">
        <td>${row.year}</td>
        <td>${row.age1}</td>
        <td>${row.age2}</td>
        <td>${formatCurrency(useReal ? row.startPortfolioReal : row.startPortfolioNominal)}</td>
        <td>
          ${formatCurrency(useReal ? row.spendingReal : row.spendingNominal)}
          ${badge}
        </td>
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