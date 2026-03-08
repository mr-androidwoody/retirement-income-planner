export function renderYearlyTable(table, rows, useReal, formatCurrency) {
  if (!table || !Array.isArray(rows)) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  thead.innerHTML = `
    <tr>
      <th>Year</th>
      <th>Age 1</th>
      <th>Age 2</th>
      <th>Start portfolio</th>
      <th>Household spending</th>
      <th>State pension</th>
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
      <td>${formatCurrency(useReal ? row.withdrawalReal : row.withdrawalNominal)}</td>
      <td>${formatCurrency(useReal ? row.endPortfolioReal : row.endPortfolioNominal)}</td>
    </tr>
  `).join('');
}
