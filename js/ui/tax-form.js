// js/ui/tax-form.js
// Tax tab input panel — read-only summary derived from simulation inputs
// and portfolio accounts. No manual re-entry form; engine runs automatically
// on tab switch.
//
// Exports:
//   renderTaxPanel(container, simInputs, portfolioAccounts, portfolioPeople, taxResult, useReal, formatCurrency)
//   buildTaxInputsFromApp(simInputs, portfolioAccounts, portfolioPeople)

import { renderTaxView } from './tax-view.js';

// ---------------------------------------------------------------------------
// Portfolio → per-person wrapper balances
// ---------------------------------------------------------------------------

/**
 * Sum balances from portfolioAccounts per person and wrapper type.
 * ISA  → isa
 * SIPP → pension
 * GIA + QMMF → gia  (cost basis = value, i.e. zero gain assumed)
 * Cash → ignored
 */
function sumWrappersForPerson(accounts, ownerLabel) {
  let isa = 0;
  let gia = 0;
  let pension = 0;

  for (const acc of accounts) {
    if (acc.isPlaceholder) continue;
    if (acc.owner !== ownerLabel) continue;

    const value = Number(acc.value) || 0;

    if (acc.wrapper === 'ISA') {
      isa += value;
    } else if (acc.wrapper === 'SIPP') {
      pension += value;
    } else if (acc.wrapper === 'GIA' || acc.wrapper === 'QMMF') {
      gia += value;
    }
    // Cash intentionally ignored
  }

  return { isa, gia, pension, giaCostBasis: gia };
}

// ---------------------------------------------------------------------------
// Derive tax engine inputs from app state
// ---------------------------------------------------------------------------

/**
 * Build the input object expected by runTaxEngine().
 *
 * NOTE: latestBaseInputs stores inflation as a percentage (e.g. 2.7),
 * matching the HTML field convention (step="0.1"). Divide by 100 here
 * before passing to the engine which expects a decimal.
 */
export function buildTaxInputsFromApp(simInputs, portfolioAccounts, portfolioPeople) {
  const inp = simInputs || {};
  const ppl = portfolioPeople || {};
  const accs = portfolioAccounts || [];

  const p1 = sumWrappersForPerson(accs, 'Person 1');
  const p2 = sumWrappersForPerson(accs, 'Person 2');

  const p1Age = Number(ppl.person1Age) || Number(inp.person1Age) || 55;
  const p2Age = Number(ppl.person2Age) || Number(inp.person2Age) || 55;

  const p1PensionAge = Number(inp.person1PensionAge) || 67;
  const p2PensionAge = Number(inp.person2PensionAge) || 67;
  const p1SpYear = Math.max(1, p1PensionAge - p1Age);
  const p2SpYear = Math.max(1, p2PensionAge - p2Age);

  const fallbackSp = Number(inp.statePensionToday) || 0;
  const p1SpAmount = Number(inp.person1PensionToday ?? fallbackSp);
  const p2SpAmount = Number(inp.person2PensionToday ?? fallbackSp);

  const inflationDecimal = (Number(inp.inflation) || 2.7) / 100;

  return {
    years: Number(inp.years) || 30,
    growthRate: 0.05,
    inflation: inflationDecimal,
    spendingTarget: Number(inp.initialSpending) || 40000,
    wrapperOrder: ['GIA', 'Pension', 'ISA'],

    p1IsaBalance: p1.isa,
    p1GiaBalance: p1.gia,
    p1PensionBalance: p1.pension,
    p1GiaCostBasis: p1.giaCostBasis,

    p2IsaBalance: p2.isa,
    p2GiaBalance: p2.gia,
    p2PensionBalance: p2.pension,
    p2GiaCostBasis: p2.giaCostBasis,

    p1StatePensionAmount: p1SpAmount,
    p1StatePensionYear: p1SpYear,
    p2StatePensionAmount: p2SpAmount,
    p2StatePensionYear: p2SpYear,

    p1OtherIncomeAmount: Number(inp.person1OtherIncomeToday) || 0,
    p1OtherIncomeYears: Number(inp.person1OtherIncomeYears) || 0,
    p2OtherIncomeAmount: Number(inp.person2OtherIncomeToday) || 0,
    p2OtherIncomeYears: Number(inp.person2OtherIncomeYears) || 0,

    p1StartAge: p1Age,
    p2StartAge: p2Age,

    thresholdInflationRate: 0, // frozen thresholds (current policy to 2031)
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtGbp(value) {
  if (!Number.isFinite(value) || value === 0) return '—';
  return '£' + Math.round(value).toLocaleString('en-GB');
}

function fmtYears(value) {
  if (!value || value <= 0) return 'none';
  return value === 1 ? '1 year' : `${value} years`;
}

function fmtYear(year) {
  return Number.isFinite(year) && year > 0 ? `Year ${year}` : 'Never';
}

function fmtPct(value) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function infoRow(label, value, note = '') {
  return `
    <tr>
      <td class="tax-info-label">${label}</td>
      <td class="tax-info-value">${value}</td>
      <td class="tax-info-note">${note || ''}</td>
    </tr>
  `;
}

function narrative(summary) {
  if (!summary) return '';

  const effectiveRate = Number(summary.effectiveRate) || 0;
  const peakYearText = fmtYear(summary.peakTaxYear);
  const peakTaxText = fmtGbp(summary.peakTaxAmount);

  if (effectiveRate < 0.05) {
    return `Tax stays very light across most of the plan and only becomes noticeable later, peaking in ${peakYearText} at ${peakTaxText}.`;
  }

  if (effectiveRate < 0.10) {
    return `Tax remains manageable overall, building gradually through retirement and peaking in ${peakYearText} at ${peakTaxText}.`;
  }

  return `Tax becomes a material drag on spending over time, with the highest burden in ${peakYearText} at ${peakTaxText}.`;
}

function renderSummaryCards(summary, formatCurrency) {
  if (!summary || typeof formatCurrency !== 'function') return '';

  const fmt = (value) => Number.isFinite(value) ? formatCurrency(value) : '—';

  const exhaustionBadges = [
    `<span class="tax-wrapper-badge tax-wrapper-isa">ISA ${fmtYear(summary.isaExhaustedYear)}</span>`,
    `<span class="tax-wrapper-badge tax-wrapper-gia">GIA ${fmtYear(summary.giaExhaustedYear)}</span>`,
    `<span class="tax-wrapper-badge tax-wrapper-pension">Pension ${fmtYear(summary.pensionExhaustedYear)}</span>`,
  ].join('');

  return `
    <section class="tax-overview" aria-label="Tax overview">
      <div class="tax-card-row">
        <article class="tax-card">
          <div class="tax-card-value">${fmt(summary.lifetimeTax)}</div>
          <div class="tax-card-label">Lifetime tax</div>
          <div class="tax-card-sub">Income ${fmt(summary.lifetimeIncomeTax)} / CGT ${fmt(summary.lifetimeCgt)}</div>
        </article>

        <article class="tax-card">
          <div class="tax-card-value">${fmtPct(summary.effectiveRate)}</div>
          <div class="tax-card-label">Effective rate</div>
          <div class="tax-card-sub">Tax ÷ gross spending</div>
        </article>

        <article class="tax-card">
          <div class="tax-card-value">${fmtYear(summary.peakTaxYear)}</div>
          <div class="tax-card-label">Peak tax year</div>
          <div class="tax-card-sub">${fmt(summary.peakTaxAmount)} that year</div>
        </article>

        <article class="tax-card">
          <div class="tax-card-value">${fmt(summary.finalTotalPortfolio)}</div>
          <div class="tax-card-label">Final portfolio</div>
          <div class="tax-card-sub">End of tax model horizon</div>
        </article>
      </div>

      <div class="tax-narrative">${escHtml(narrative(summary))}</div>

      <div class="tax-exhaustion-strip">
        <div class="tax-exhaustion-label">Wrapper exhaustion</div>
        <div class="tax-exhaustion-badges">${exhaustionBadges}</div>
      </div>
    </section>
  `;
}

function renderEmptyState(container) {
  container.innerHTML = `
    <div class="tax-no-data">
      <p>Run a simulation first — the tax model reads your portfolio balances and assumptions automatically.</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Render combined info + summary + table panel
// ---------------------------------------------------------------------------

/**
 * Renders the unified tax panel:
 * - display mode toggle
 * - summary cards
 * - narrative
 * - inputs summary
 * - embedded tax table
 *
 * @param {HTMLElement} container
 * @param {object}      simInputs
 * @param {object[]}    portfolioAccounts
 * @param {object}      portfolioPeople
 * @param {object|null} taxResult
 * @param {boolean}     useReal
 * @param {Function}    formatCurrency
 */
export function renderTaxPanel(
  container,
  simInputs,
  portfolioAccounts,
  portfolioPeople,
  taxResult,
  useReal,
  formatCurrency
) {
  if (!container) return;

  const inp = simInputs || {};
  const ppl = portfolioPeople || {};
  const accs = portfolioAccounts || [];

  const hasPortfolio = accs.some((acc) => !acc.isPlaceholder);
  if (!hasPortfolio || !simInputs) {
    renderEmptyState(container);
    return;
  }

  const p1Name = (ppl.person1Name || inp.person1Name || 'Person 1').trim() || 'Person 1';
  const p2Name = (ppl.person2Name || inp.person2Name || 'Person 2').trim() || 'Person 2';

  const p1Age = Number(ppl.person1Age) || Number(inp.person1Age) || 55;
  const p2Age = Number(ppl.person2Age) || Number(inp.person2Age) || 55;

  const includePerson2 = Boolean(inp.includePerson2 ?? true);

  const p1 = sumWrappersForPerson(accs, 'Person 1');
  const p2 = sumWrappersForPerson(accs, 'Person 2');

  const p1PensionAge = Number(inp.person1PensionAge) || 67;
  const p2PensionAge = Number(inp.person2PensionAge) || 67;

  const fallbackSp = Number(inp.statePensionToday) || 0;
  const p1SpAmount = Number(inp.person1PensionToday ?? fallbackSp);
  const p2SpAmount = Number(inp.person2PensionToday ?? fallbackSp);

  const p1SpYear = Math.max(1, p1PensionAge - p1Age);
  const p2SpYear = Math.max(1, p2PensionAge - p2Age);

  const inflationPct = (Number(inp.inflation) || 2.7).toFixed(1);

  const hasQmmf = accs.some((a) => !a.isPlaceholder && a.wrapper === 'QMMF');
  const hasCash = accs.some((a) => !a.isPlaceholder && a.wrapper === 'Cash');

  const wrapperNotes = [];
  if (hasQmmf) wrapperNotes.push('QMMF treated as GIA');
  if (hasCash) wrapperNotes.push('Cash accounts excluded');
  wrapperNotes.push('GIA cost basis = current value (zero unrealised gain assumed)');

  const toggleDisabled = !taxResult;
  const toggleClass = toggleDisabled
    ? 'tax-mode-switch tax-mode-switch--disabled'
    : 'tax-mode-switch';

  const summaryHtml = taxResult
    ? renderSummaryCards(taxResult.summary, formatCurrency)
    : '';

  container.innerHTML = `
    <div class="tax-info-panel">
      <div class="tax-info-header">
        <div class="tax-info-header-copy">
          <div class="tax-info-header-title">Tax model</div>
          <div class="tax-info-header-subtitle">
            Deterministic year-by-year UK income tax and CGT estimate across GIA, pension, and ISA wrappers.
          </div>
        </div>

        <div class="${toggleClass}" role="group" aria-label="Tax display mode">
          <label class="tax-mode-option">
            <input
              id="taxModeReal"
              type="radio"
              name="taxMode"
              ${useReal ? 'checked' : ''}
              ${toggleDisabled ? 'disabled' : ''}
            />
            <span>Real</span>
          </label>

          <label class="tax-mode-option">
            <input
              id="taxModeNominal"
              type="radio"
              name="taxMode"
              ${!useReal ? 'checked' : ''}
              ${toggleDisabled ? 'disabled' : ''}
            />
            <span>Nominal</span>
          </label>
        </div>
      </div>

      ${summaryHtml}

      <section class="tax-inputs tax-inputs--secondary" aria-label="Tax model inputs">
        <div class="tax-inputs-title">Model inputs</div>

        <div class="tax-info-cols">
          <section class="tax-info-section">
            <h4 class="tax-info-heading">Wrapper balances</h4>
            <table class="tax-info-table">
              <thead>
                <tr>
                  <th></th>
                  <th>${escHtml(p1Name)}</th>
                  ${includePerson2 ? `<th>${escHtml(p2Name)}</th>` : ''}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="tax-info-label">ISA</td>
                  <td class="tax-info-value">${fmtGbp(p1.isa)}</td>
                  ${includePerson2 ? `<td class="tax-info-value">${fmtGbp(p2.isa)}</td>` : ''}
                </tr>
                <tr>
                  <td class="tax-info-label">GIA</td>
                  <td class="tax-info-value">${fmtGbp(p1.gia)}</td>
                  ${includePerson2 ? `<td class="tax-info-value">${fmtGbp(p2.gia)}</td>` : ''}
                </tr>
                <tr>
                  <td class="tax-info-label">Pension</td>
                  <td class="tax-info-value">${fmtGbp(p1.pension)}</td>
                  ${includePerson2 ? `<td class="tax-info-value">${fmtGbp(p2.pension)}</td>` : ''}
                </tr>
              </tbody>
            </table>
            ${wrapperNotes.map((note) => `<p class="tax-info-aside">${escHtml(note)}</p>`).join('')}
          </section>

          <section class="tax-info-section">
            <h4 class="tax-info-heading">Spending &amp; growth</h4>
            <table class="tax-info-table">
              <tbody>
                ${infoRow('Spending target', fmtGbp(Number(inp.initialSpending) || 0), "today's £, inflation-linked")}
                ${infoRow('Horizon', `${Number(inp.years) || 30} years`, '')}
                ${infoRow('Nominal growth', '5.0%', 'fixed assumption')}
                ${infoRow('Inflation', `${inflationPct}%`, '')}
                ${infoRow('Tax thresholds', 'Frozen', '2026/27 rates to 2031')}
                ${infoRow('Withdrawal order', 'GIA → Pension → ISA', '')}
              </tbody>
            </table>
          </section>

          <section class="tax-info-section">
            <h4 class="tax-info-heading">State pensions</h4>
            <table class="tax-info-table">
              <tbody>
                ${infoRow(escHtml(p1Name), `${fmtGbp(p1SpAmount)}/yr`, `starts year ${p1SpYear} (age ${p1PensionAge})`)}
                ${includePerson2 ? infoRow(escHtml(p2Name), `${fmtGbp(p2SpAmount)}/yr`, `starts year ${p2SpYear} (age ${p2PensionAge})`) : ''}
                ${infoRow('Other income', fmtYears((Number(inp.person1OtherIncomeYears) || 0) + (includePerson2 ? Number(inp.person2OtherIncomeYears) || 0 : 0)), 'temporary income streams')}
              </tbody>
            </table>
          </section>
        </div>
      </section>

      <section class="tax-results-embedded" aria-label="Year-by-year tax results">
        <div class="tax-results-embedded__header">
          <h3 class="tax-results-embedded__title">Year-by-year tax view</h3>
          <p class="tax-results-embedded__intro">
            Annual view of spending, income, withdrawals, tax, and remaining wrapper balances.
          </p>
        </div>

        <div class="tax-table-wrap">
          <table id="taxYearTableInline" class="tax-year-table">
            <thead></thead>
            <tbody></tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  if (taxResult) {
    renderTaxView({
      result: taxResult,
      tableEl: container.querySelector('#taxYearTableInline'),
      useReal,
      formatCurrency,
    });
  }
}