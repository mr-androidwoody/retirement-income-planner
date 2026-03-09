export function renderYearlyTable(table, rows, useReal, formatCurrency, names = {}) {
  if (!table || !Array.isArray(rows)) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  const person1Name = sanitiseHeaderLabel(names.person1Name, 'Person 1');
  const person2Name = sanitiseHeaderLabel(names.person2Name, 'Person 2');

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

  tbody.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.year}</td>
      <td>${row.age1}</td>
      <td>${row.age2}</td>
      <td>${formatCurrency(useReal ? row.startPortfolioReal : row.startPortfolioNominal)}</td>
      <td>${formatCurrency(useReal ? row.spendingReal : row.spendingNominal)}</td>
      <td>${formatCurrency(useReal ? row.statePensionReal : row.statePensionNominal)}</td>
      <td>${formatCurrency(useReal ? row.otherIncomeReal : row.otherIncomeNominal)}</td>
      <td>${formatCurrency(useReal ? row.windfallReal : row.windfallNominal)}</td>
      <td>${formatCurrency(useReal ? row.withdrawalReal : row.withdrawalNominal)}</td>
      <td>${formatCurrency(useReal ? row.endPortfolioReal : row.endPortfolioNominal)}</td>
    </tr>
  `).join('');
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
