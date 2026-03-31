// js/ui/tax-form.js
// Tax tab input panel — read-only summary derived from simulation inputs
// and portfolio accounts. No manual re-entry form; engine runs automatically
// on tab switch.
//
// Exports:
//   renderTaxPanel(container, simInputs, portfolioAccounts, portfolioPeople)
//   buildTaxInputsFromApp(simInputs, portfolioAccounts, portfolioPeople)

// ---------------------------------------------------------------------------
// Portfolio → per-person wrapper balances
// ---------------------------------------------------------------------------

/**
 * Sum balances from portfolioAccounts per person and wrapper type.
 * ISA  → isa
 * SIPP → pension
 * GIA + QMMF → gia  (cost basis = value, i.e. zero gain assumed)
 * Cash → ignored
 *
 * @param {object[]} accounts
 * @param {string}   ownerLabel  'Person 1' | 'Person 2'
 * @returns {{ isa, gia, pension, giaCostBasis }}
 */
function sumWrappersForPerson(accounts, ownerLabel) {
  let isa     = 0;
  let gia     = 0;
  let pension = 0;

  for (const acc of accounts) {
    if (acc.isPlaceholder) continue;
    if (acc.owner !== ownerLabel) continue;
    const v = Number(acc.value) || 0;
    if      (acc.wrapper === 'ISA')  isa     += v;
    else if (acc.wrapper === 'SIPP') pension += v;
    else if (acc.wrapper === 'GIA')  gia     += v;
    else if (acc.wrapper === 'QMMF') gia     += v;
    // Cash: intentionally ignored
  }

  return { isa, gia, pension, giaCostBasis: gia }; // cost = value → zero gain
}

// ---------------------------------------------------------------------------
// Derive tax engine inputs from app state
// ---------------------------------------------------------------------------

/**
 * Build the input object expected by runTaxEngine().
 *
 * @param {object}   simInputs        latestBaseInputs from app.js
 * @param {object[]} portfolioAccounts
 * @param {object}   portfolioPeople  { person1Name, person2Name, person1Age, person2Age }
 * @returns {object}
 */
export function buildTaxInputsFromApp(simInputs, portfolioAccounts, portfolioPeople) {
  const inp  = simInputs  || {};
  const ppl  = portfolioPeople || {};
  const accs = portfolioAccounts || [];

  const p1 = sumWrappersForPerson(accs, 'Person 1');
  const p2 = sumWrappersForPerson(accs, 'Person 2');

  // Ages — prefer portfolioPeople (set from the Portfolio tab fields) then simInputs
  const p1Age = Number(ppl.person1Age) || Number(inp.person1Age) || 55;
  const p2Age = Number(ppl.person2Age) || Number(inp.person2Age) || 55;

  // State pension ages — years from now until pension age
  const p1PensionAge = Number(inp.person1PensionAge) || 67;
  const p2PensionAge = Number(inp.person2PensionAge) || 67;
  const p1SpYear     = Math.max(1, p1PensionAge - p1Age);
  const p2SpYear     = Math.max(1, p2PensionAge - p2Age);

  // State pension amounts — use per-person fields if set, fall back to shared
  const fallbackSp   = Number(inp.statePensionToday) || 0;
  const p1SpAmount   = Number(inp.person1PensionToday ?? fallbackSp);
  const p2SpAmount   = Number(inp.person2PensionToday ?? fallbackSp);

  return {
    years:           Number(inp.years)          || 30,
    growthRate:      0.05,   // nominal 5% — sensible default; not in simInputs
    inflation:       Number(inp.inflation)       || 0.027,
    spendingTarget:  Number(inp.initialSpending) || 40000,
    wrapperOrder:    ['ISA', 'GIA', 'Pension'],

    p1IsaBalance:     p1.isa,
    p1GiaBalance:     p1.gia,
    p1PensionBalance: p1.pension,
    p1GiaCostBasis:   p1.giaCostBasis,

    p2IsaBalance:     p2.isa,
    p2GiaBalance:     p2.gia,
    p2PensionBalance: p2.pension,
    p2GiaCostBasis:   p2.giaCostBasis,

    p1StatePensionAmount: p1SpAmount,
    p1StatePensionYear:   p1SpYear,
    p2StatePensionAmount: p2SpAmount,
    p2StatePensionYear:   p2SpYear,

    p1OtherIncomeAmount: Number(inp.person1OtherIncomeToday) || 0,
    p1OtherIncomeYears:  Number(inp.person1OtherIncomeYears) || 0,
    p2OtherIncomeAmount: Number(inp.person2OtherIncomeToday) || 0,
    p2OtherIncomeYears:  Number(inp.person2OtherIncomeYears) || 0,

    p1StartAge: p1Age,
    p2StartAge: p2Age,

    thresholdInflationRate: 0, // frozen thresholds (current policy to 2031)
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtGbp(v) {
  if (!Number.isFinite(v) || v === 0) return '—';
  return '£' + Math.round(v).toLocaleString('en-GB');
}

function fmtYears(n) {
  if (!n || n <= 0) return 'none';
  return n === 1 ? '1 year' : `${n} years`;
}

function row(label, value, note) {
  return `
    <tr>
      <td class="tax-info-label">${label}</td>
      <td class="tax-info-value">${value}</td>
      ${note ? `<td class="tax-info-note">${note}</td>` : '<td></td>'}
    </tr>`;
}

// ---------------------------------------------------------------------------
// Render read-only summary panel
// ---------------------------------------------------------------------------

/**
 * Renders a read-only "inputs at a glance" panel into container.
 * Shows what the engine is using so the user can verify before reading results.
 *
 * @param {HTMLElement} container
 * @param {object}      simInputs
 * @param {object[]}    portfolioAccounts
 * @param {object}      portfolioPeople
 */
export function renderTaxPanel(container, simInputs, portfolioAccounts, portfolioPeople) {
  if (!container) return;

  const inp = simInputs  || {};
  const ppl = portfolioPeople || {};
  const accs = portfolioAccounts || [];

  const p1Name = (ppl.person1Name || inp.person1Name || 'Person 1').trim() || 'Person 1';
  const p2Name = (ppl.person2Name || inp.person2Name || 'Person 2').trim() || 'Person 2';

  const p1Age  = Number(ppl.person1Age) || Number(inp.person1Age) || 55;
  const p2Age  = Number(ppl.person2Age) || Number(inp.person2Age) || 55;

  const p1 = sumWrappersForPerson(accs, 'Person 1');
  const p2 = sumWrappersForPerson(accs, 'Person 2');

  const includePerson2 = Boolean(inp.includePerson2 ?? true);

  const p1PensionAge = Number(inp.person1PensionAge) || 67;
  const p2PensionAge = Number(inp.person2PensionAge) || 67;
  const fallbackSp   = Number(inp.statePensionToday) || 0;
  const p1SpAmount   = Number(inp.person1PensionToday ?? fallbackSp);
  const p2SpAmount   = Number(inp.person2PensionToday ?? fallbackSp);

  const p1SpYear = Math.max(1, p1PensionAge - p1Age);
  const p2SpYear = Math.max(1, p2PensionAge - p2Age);

  const hasQmmf = accs.some(a => !a.isPlaceholder && a.wrapper === 'QMMF');
  const hasCash = accs.some(a => !a.isPlaceholder && a.wrapper === 'Cash');

  // Check if any portfolio data exists at all
  const hasPortfolio = accs.some(a => !a.isPlaceholder);

  if (!hasPortfolio || !simInputs) {
    container.innerHTML = `
      <div class="tax-no-data">
        <p>Run a simulation first — the tax model reads your portfolio balances and assumptions automatically.</p>
      </div>`;
    return;
  }

  const wrapperNotes = [];
  if (hasQmmf) wrapperNotes.push('QMMF treated as GIA');
  if (hasCash) wrapperNotes.push('Cash accounts excluded');
  wrapperNotes.push('GIA cost basis = current value (zero gain assumed — CGT stays within annual exempt amount)');

  container.innerHTML = `
    <div class="tax-info-panel">

      <div class="tax-info-cols">

        <!-- ── Balances ── -->
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
          ${wrapperNotes.map(n => `<p class="tax-info-aside">${n}</p>`).join('')}
        </section>

        <!-- ── Spending & growth ── -->
        <section class="tax-info-section">
          <h4 class="tax-info-heading">Spending &amp; growth</h4>
          <table class="tax-info-table">
            <tbody>
              ${row('Spending target', fmtGbp(inp.initialSpending), "today's £, inflation-linked")}
              ${row('Horizon', `${inp.years || 30} years`)}
              ${row('Nominal growth', '5.0%', 'fixed assumption')}
              ${row('Inflation', `${((Number(inp.inflation) || 0.027) * 100).toFixed(1)}%`)}
              ${row('Tax thresholds', 'Frozen', '2026/27 rates to 2031')}
              ${row('Withdrawal order', 'ISA → GIA → Pension')}
            </tbody>
          </table>
        </section>

        <!-- ── State pensions ── -->
        <section class="tax-info-section">
          <h4 class="tax-info-heading">State pensions</h4>
          <table class="tax-info-table">
            <tbody>
              ${row(p1Name, fmtGbp(p1SpAmount) + '/yr', `starts year ${p1SpYear} (age ${p1PensionAge})`)}
              ${includePerson2 ? row(p2Name, fmtGbp(p2SpAmount) + '/yr', `starts year ${p2SpYear} (age ${p2PensionAge})`) : ''}
            </tbody>
          </table>
        </section>

        <!-- ── Other income ── -->
        ${(inp.person1OtherIncomeToday > 0 || inp.person2OtherIncomeToday > 0) ? `
        <section class="tax-info-section">
          <h4 class="tax-info-heading">Other income</h4>
          <table class="tax-info-table">
            <tbody>
              ${inp.person1OtherIncomeToday > 0
                ? row(p1Name, fmtGbp(inp.person1OtherIncomeToday) + '/yr', `for ${fmtYears(inp.person1OtherIncomeYears)}`)
                : ''}
              ${includePerson2 && inp.person2OtherIncomeToday > 0
                ? row(p2Name, fmtGbp(inp.person2OtherIncomeToday) + '/yr', `for ${fmtYears(inp.person2OtherIncomeYears)}`)
                : ''}
            </tbody>
          </table>
        </section>` : ''}

      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Escape helper
// ---------------------------------------------------------------------------

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
