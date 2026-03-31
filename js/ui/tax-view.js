// js/ui/tax-view.js
// Renders tax simulation results: year-by-year table only.
// Summary stats are now rendered inline in the info panel (tax-form.js).
// Real/Nominal toggle is owned by tax-form.js; app.js re-renders both
// on toggle change.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value, formatCurrency) {
  return Number.isFinite(value) ? formatCurrency(value) : '—';
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Year-by-year table
// ---------------------------------------------------------------------------

function renderTable(tableEl, rows, useReal, formatCurrency) {
  if (!tableEl) return;

  const thead = tableEl.querySelector('thead');
  const tbody = tableEl.querySelector('tbody');
  if (!thead || !tbody) return;

  thead.innerHTML = `
    <tr>
      <th class="col-text">Year</th>
      <th class="col-text">Ages</th>
      <th class="col-number">Spending target</th>
      <th class="col-number">State pension</th>
      <th class="col-number">Other income</th>
      <th class="col-number">GIA drawn</th>
      <th class="col-number">Pension drawn</th>
      <th class="col-number">ISA drawn</th>
      <th class="col-number">Income tax</th>
      <th class="col-number">CGT</th>
      <th class="col-number">Total tax</th>
      <th class="col-number">Net spending</th>
      <th class="col-number">GIA balance</th>
      <th class="col-number">Pension balance</th>
      <th class="col-number">ISA balance</th>
    </tr>
  `;

  // Approximate real deflator for state pension (engine stores nominal only)
  const r = (row, nominal, real) => useReal ? real : nominal;

  tbody.innerHTML = rows.map((row) => {
    const hasTax    = row.totalTax > 0.5;
    const hasCgt    = row.cgt > 0.5;
    const shortfall = (row.p1.shortfall + row.p2.shortfall) > 0.5;

    // Real deflator for this year
    const inflFactor = row.realSpending > 0 ? row.nominalSpending / row.realSpending : 1;
    const deflate = (v) => v / inflFactor;

    return `
      <tr class="${hasTax ? 'tax-row--has-tax' : ''}${shortfall ? ' tax-row--shortfall' : ''}">
        <td class="col-text">${row.year}</td>
        <td class="col-text">${row.p1Age}/${row.p2Age}</td>
        <td class="col-number">${fmt(r(row, row.nominalSpending,    row.realSpending),       formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.p1StatePension + row.p2StatePension,
                                           deflate(row.p1StatePension + row.p2StatePension)), formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.p1OtherIncome + row.p2OtherIncome,
                                           deflate(row.p1OtherIncome + row.p2OtherIncome)),  formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.giaDrawn,     deflate(row.giaDrawn)),     formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.pensionDrawn, deflate(row.pensionDrawn)), formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.isaDrawn,     deflate(row.isaDrawn)),     formatCurrency)}</td>
        <td class="col-number ${hasTax ? 'tax-cell--income-tax' : ''}">${fmt(r(row, row.incomeTax, deflate(row.incomeTax)), formatCurrency)}</td>
        <td class="col-number ${hasCgt ? 'tax-cell--cgt'        : ''}">${fmt(r(row, row.cgt,       deflate(row.cgt)),       formatCurrency)}</td>
        <td class="col-number ${hasTax ? 'tax-cell--total-tax'  : ''}">${fmt(r(row, row.totalTax,  deflate(row.totalTax)),  formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.netSpending,   row.realNetSpending),      formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.giaBalance,     row.realGiaBalance),      formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.pensionBalance, row.realPensionBalance),  formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.isaBalance,     row.realIsaBalance),      formatCurrency)}</td>
      </tr>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// Main render entry point
// ---------------------------------------------------------------------------

/**
 * @param {object}      p
 * @param {object}      p.result         output of runTaxEngine()
 * @param {HTMLElement} p.tableEl
 * @param {boolean}     p.useReal
 * @param {Function}    p.formatCurrency
 */
export function renderTaxView({ result, tableEl, useReal, formatCurrency }) {
  if (!result) return;
  renderTable(tableEl, result.rows, useReal, formatCurrency);
}
