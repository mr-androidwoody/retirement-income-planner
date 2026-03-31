// js/ui/tax-view.js
// Renders tax simulation results: summary cards + year-by-year table.
// Real/Nominal toggle mirrors the Results tab pattern.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value, formatCurrency) {
  return Number.isFinite(value) ? formatCurrency(value) : '—';
}

function fmtPct(value) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function fmtYear(year) {
  return Number.isFinite(year) && year > 0 ? `Year ${year}` : 'Never';
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------

function renderSummaryCards(container, summary, useReal, formatCurrency) {
  if (!container) return;

  const lifetime = useReal
    ? summary.lifetimeTax   // real values not separately tracked; nominal close enough for summary
    : summary.lifetimeTax;

  container.innerHTML = `
    <div class="tax-summary-grid">

      <article class="summary-card">
        <div class="summary-label">Lifetime tax (nominal)</div>
        <div class="summary-value">${fmt(summary.lifetimeTax, formatCurrency)}</div>
        <div class="summary-desc">
          Income tax ${fmt(summary.lifetimeIncomeTax, formatCurrency)} /
          CGT ${fmt(summary.lifetimeCgt, formatCurrency)}
        </div>
      </article>

      <article class="summary-card">
        <div class="summary-label">Effective tax rate</div>
        <div class="summary-value">${fmtPct(summary.effectiveRate)}</div>
        <div class="summary-desc">Total tax ÷ gross spending over the horizon</div>
      </article>

      <article class="summary-card">
        <div class="summary-label">Peak tax year</div>
        <div class="summary-value">${fmtYear(summary.peakTaxYear)}</div>
        <div class="summary-desc">${fmt(summary.peakTaxAmount, formatCurrency)} in that year</div>
      </article>

      <article class="summary-card">
        <div class="summary-label">Wrapper exhaustion</div>
        <div class="summary-value tax-exhaustion-value">
          <span class="tax-wrapper-badge tax-wrapper-isa">ISA ${fmtYear(summary.isaExhaustedYear)}</span>
          <span class="tax-wrapper-badge tax-wrapper-gia">GIA ${fmtYear(summary.giaExhaustedYear)}</span>
          <span class="tax-wrapper-badge tax-wrapper-pension">Pension ${fmtYear(summary.pensionExhaustedYear)}</span>
        </div>
        <div class="summary-desc">First year each wrapper reaches zero</div>
      </article>

    </div>
  `;
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
      <th class="col-number">ISA drawn</th>
      <th class="col-number">GIA drawn</th>
      <th class="col-number">Pension drawn</th>
      <th class="col-number">Income tax</th>
      <th class="col-number">CGT</th>
      <th class="col-number">Total tax</th>
      <th class="col-number">Net spending</th>
      <th class="col-number">ISA balance</th>
      <th class="col-number">GIA balance</th>
      <th class="col-number">Pension balance</th>
    </tr>
  `;

  const r = (row, nominal, real) => useReal ? real : nominal;

  tbody.innerHTML = rows.map((row) => {
    const hasTax    = row.totalTax > 0.5;
    const hasCgt    = row.cgt > 0.5;
    const shortfall = (row.p1.shortfall + row.p2.shortfall) > 0.5;

    return `
      <tr class="${hasTax ? 'tax-row--has-tax' : ''}${shortfall ? ' tax-row--shortfall' : ''}">
        <td class="col-text">${row.year}</td>
        <td class="col-text">${row.p1Age}/${row.p2Age}</td>
        <td class="col-number">${fmt(r(row, row.nominalSpending, row.realSpending), formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.p1StatePension + row.p2StatePension,
          (row.p1StatePension + row.p2StatePension) / Math.pow(1 + 0, row.year - 1) /* approx */
          ), formatCurrency)}</td>
        <td class="col-number">${fmt(row.p1OtherIncome + row.p2OtherIncome, formatCurrency)}</td>
        <td class="col-number">${fmt(row.isaDrawn, formatCurrency)}</td>
        <td class="col-number">${fmt(row.giaDrawn, formatCurrency)}</td>
        <td class="col-number">${fmt(row.pensionDrawn, formatCurrency)}</td>
        <td class="col-number ${hasTax ? 'tax-cell--income-tax' : ''}">${fmt(row.incomeTax, formatCurrency)}</td>
        <td class="col-number ${hasCgt ? 'tax-cell--cgt' : ''}">${fmt(row.cgt, formatCurrency)}</td>
        <td class="col-number ${hasTax ? 'tax-cell--total-tax' : ''}">${fmt(row.totalTax, formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.netSpending, row.realNetSpending), formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.isaBalance, row.realIsaBalance), formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.giaBalance, row.realGiaBalance), formatCurrency)}</td>
        <td class="col-number">${fmt(r(row, row.pensionBalance, row.realPensionBalance), formatCurrency)}</td>
      </tr>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// Main render entry point
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} p.result        output of runTaxEngine()
 * @param {HTMLElement} p.summaryContainer
 * @param {HTMLElement} p.tableEl
 * @param {boolean}     p.useReal
 * @param {Function}    p.formatCurrency
 */
export function renderTaxView({ result, summaryContainer, tableEl, useReal, formatCurrency }) {
  if (!result) return;
  renderSummaryCards(summaryContainer, result.summary, useReal, formatCurrency);
  renderTable(tableEl, result.rows, useReal, formatCurrency);
}
