// js/ui/tax-form.js
// Tax tab input form. Renders form HTML into #taxFormContainer,
// pre-populates from simulation inputs where available, and
// exports buildTaxInputs() to read current form values.

import { DEFAULT_INPUTS } from '../model/simulator.js';
import { WRAPPER_ORDER_DEFAULT } from '../model/tax-engine.js';

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderTaxForm(container, simInputs) {
  if (!container) return;
  const inp = simInputs || DEFAULT_INPUTS;

  // Derive defaults
  const sp1 = inp.person1PensionToday ?? inp.statePensionToday ?? DEFAULT_INPUTS.statePensionToday;
  const sp2 = inp.person2PensionToday ?? inp.statePensionToday ?? DEFAULT_INPUTS.statePensionToday;

  // State pension start year: years from now until pension age
  const sp1Year = Math.max(1, (inp.person1PensionAge ?? 67) - (inp.person1Age ?? 50));
  const sp2Year = Math.max(1, (inp.person2PensionAge ?? 67) - (inp.person2Age ?? 50));

  const spending = inp.initialSpending ?? DEFAULT_INPUTS.initialSpending;
  const years    = inp.years ?? DEFAULT_INPUTS.years;

  container.innerHTML = `
    <div class="tax-form-grid">

      <!-- ── Wrapper balances ────────────────────────────────────────── -->
      <section class="panel input-group-card tax-form-section">
        <div class="section-heading">
          <h3>Wrapper balances</h3>
          <p>Starting balances for each tax wrapper, split by person.</p>
        </div>

        <div class="field-grid field-grid-2 tax-person-cols">
          <div class="tax-person-col">
            <div class="tax-person-label">${inp.person1Name || 'Person 1'}</div>
            <div class="field">
              <label class="field-label" for="taxP1Isa">ISA (£)</label>
              <input class="field-input" id="taxP1Isa" type="text" inputmode="numeric" value="0" />
            </div>
            <div class="field">
              <label class="field-label" for="taxP1Gia">GIA (£)</label>
              <input class="field-input" id="taxP1Gia" type="text" inputmode="numeric" value="0" />
            </div>
            <div class="field">
              <label class="field-label" for="taxP1GiaCost">GIA cost basis (£)</label>
              <input class="field-input" id="taxP1GiaCost" type="text" inputmode="numeric" value="0" />
            </div>
            <div class="field">
              <label class="field-label" for="taxP1Pension">Pension (£)</label>
              <input class="field-input" id="taxP1Pension" type="text" inputmode="numeric" value="0" />
            </div>
          </div>

          <div class="tax-person-col">
            <div class="tax-person-label">${inp.person2Name || 'Person 2'}</div>
            <div class="field">
              <label class="field-label" for="taxP2Isa">ISA (£)</label>
              <input class="field-input" id="taxP2Isa" type="text" inputmode="numeric" value="0" />
            </div>
            <div class="field">
              <label class="field-label" for="taxP2Gia">GIA (£)</label>
              <input class="field-input" id="taxP2Gia" type="text" inputmode="numeric" value="0" />
            </div>
            <div class="field">
              <label class="field-label" for="taxP2GiaCost">GIA cost basis (£)</label>
              <input class="field-input" id="taxP2GiaCost" type="text" inputmode="numeric" value="0" />
            </div>
            <div class="field">
              <label class="field-label" for="taxP2Pension">Pension (£)</label>
              <input class="field-input" id="taxP2Pension" type="text" inputmode="numeric" value="0" />
            </div>
          </div>
        </div>
      </section>

      <!-- ── Spending & growth ───────────────────────────────────────── -->
      <section class="panel input-group-card tax-form-section">
        <div class="section-heading">
          <h3>Spending &amp; growth</h3>
        </div>

        <div class="field-grid field-grid-2">
          <div class="field">
            <label class="field-label" for="taxSpending">Annual spending target (£, today)</label>
            <input class="field-input" id="taxSpending" type="text" inputmode="numeric" value="${spending}" />
          </div>
          <div class="field">
            <label class="field-label" for="taxYears">Horizon (years)</label>
            <input class="field-input" id="taxYears" type="text" inputmode="numeric" value="${years}" />
          </div>
          <div class="field">
            <label class="field-label" for="taxGrowthRate">Nominal growth rate (%)</label>
            <input class="field-input" id="taxGrowthRate" type="text" inputmode="decimal" value="5.0" />
          </div>
          <div class="field">
            <label class="field-label" for="taxInflation">Inflation (%)</label>
            <input class="field-input" id="taxInflation" type="text" inputmode="decimal"
              value="${(inp.inflation ?? DEFAULT_INPUTS.inflation).toFixed(1)}" />
          </div>
        </div>
      </section>

      <!-- ── State pensions ──────────────────────────────────────────── -->
      <section class="panel input-group-card tax-form-section">
        <div class="section-heading">
          <h3>State pensions</h3>
          <p>Annual amount in today's £ and the year (from now) it starts.</p>
        </div>

        <div class="field-grid field-grid-2 tax-person-cols">
          <div class="tax-person-col">
            <div class="tax-person-label">${inp.person1Name || 'Person 1'}</div>
            <div class="field">
              <label class="field-label" for="taxP1SpAmount">Amount (£/yr today)</label>
              <input class="field-input" id="taxP1SpAmount" type="text" inputmode="numeric" value="${Math.round(sp1)}" />
            </div>
            <div class="field">
              <label class="field-label" for="taxP1SpYear">Starts in year</label>
              <input class="field-input" id="taxP1SpYear" type="text" inputmode="numeric" value="${sp1Year}" />
            </div>
          </div>
          <div class="tax-person-col">
            <div class="tax-person-label">${inp.person2Name || 'Person 2'}</div>
            <div class="field">
              <label class="field-label" for="taxP2SpAmount">Amount (£/yr today)</label>
              <input class="field-input" id="taxP2SpAmount" type="text" inputmode="numeric" value="${Math.round(sp2)}" />
            </div>
            <div class="field">
              <label class="field-label" for="taxP2SpYear">Starts in year</label>
              <input class="field-input" id="taxP2SpYear" type="text" inputmode="numeric" value="${sp2Year}" />
            </div>
          </div>
        </div>
      </section>

      <!-- ── Other income ────────────────────────────────────────────── -->
      <section class="panel input-group-card tax-form-section">
        <div class="section-heading">
          <h3>Other income</h3>
          <p>Part-time work, rental income, etc. — taxable, in today's £.</p>
        </div>

        <div class="field-grid field-grid-2 tax-person-cols">
          <div class="tax-person-col">
            <div class="tax-person-label">${inp.person1Name || 'Person 1'}</div>
            <div class="field">
              <label class="field-label" for="taxP1OtherAmount">Amount (£/yr today)</label>
              <input class="field-input" id="taxP1OtherAmount" type="text" inputmode="numeric"
                value="${Math.round(inp.person1OtherIncomeToday ?? 0)}" />
            </div>
            <div class="field">
              <label class="field-label" for="taxP1OtherYears">For how many years</label>
              <input class="field-input" id="taxP1OtherYears" type="text" inputmode="numeric"
                value="${inp.person1OtherIncomeYears ?? 0}" />
            </div>
          </div>
          <div class="tax-person-col">
            <div class="tax-person-label">${inp.person2Name || 'Person 2'}</div>
            <div class="field">
              <label class="field-label" for="taxP2OtherAmount">Amount (£/yr today)</label>
              <input class="field-input" id="taxP2OtherAmount" type="text" inputmode="numeric"
                value="${Math.round(inp.person2OtherIncomeToday ?? 0)}" />
            </div>
            <div class="field">
              <label class="field-label" for="taxP2OtherYears">For how many years</label>
              <input class="field-input" id="taxP2OtherYears" type="text" inputmode="numeric"
                value="${inp.person2OtherIncomeYears ?? 0}" />
            </div>
          </div>
        </div>
      </section>

      <!-- ── Sequencing & ages ───────────────────────────────────────── -->
      <section class="panel input-group-card tax-form-section">
        <div class="section-heading">
          <h3>Withdrawal order &amp; ages</h3>
        </div>

        <div class="field-grid field-grid-2">
          <div class="field field-span-full">
            <label class="field-label" for="taxWrapperOrder">Withdrawal sequencing</label>
            <select class="field-input" id="taxWrapperOrder">
              <option value="ISA,GIA,Pension" selected>ISA → GIA → Pension</option>
              <option value="ISA,Pension,GIA">ISA → Pension → GIA</option>
              <option value="GIA,ISA,Pension">GIA → ISA → Pension</option>
              <option value="GIA,Pension,ISA">GIA → Pension → ISA</option>
              <option value="Pension,ISA,GIA">Pension → ISA → GIA</option>
              <option value="Pension,GIA,ISA">Pension → GIA → ISA</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="taxP1Age">${inp.person1Name || 'Person 1'} current age</label>
            <input class="field-input" id="taxP1Age" type="text" inputmode="numeric"
              value="${inp.person1Age ?? 50}" />
          </div>
          <div class="field">
            <label class="field-label" for="taxP2Age">${inp.person2Name || 'Person 2'} current age</label>
            <input class="field-input" id="taxP2Age" type="text" inputmode="numeric"
              value="${inp.person2Age ?? 50}" />
          </div>
          <div class="field">
            <label class="field-label" for="taxThresholdInflation">Tax threshold uprating (%)</label>
            <input class="field-input" id="taxThresholdInflation" type="text" inputmode="decimal" value="0" />
            <span class="field-note">0 = frozen (current policy)</span>
          </div>
        </div>
      </section>

    </div>

    <div class="tax-form-actions">
      <button id="runTaxBtn" class="btn btn-primary" type="button">Run tax model</button>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Read form values into engine input object
// ---------------------------------------------------------------------------

function parseNum(id, fallback = 0) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = parseFloat(String(el.value).replace(/,/g, ''));
  return Number.isFinite(v) ? v : fallback;
}

function parseInt2(id, fallback = 0) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = parseInt(String(el.value).replace(/,/g, ''), 10);
  return Number.isFinite(v) ? v : fallback;
}

export function buildTaxInputs() {
  const orderEl = document.getElementById('taxWrapperOrder');
  const orderStr = orderEl ? orderEl.value : 'ISA,GIA,Pension';
  const wrapperOrder = orderStr.split(',');

  return {
    years:                 parseInt2('taxYears', 30),
    growthRate:            parseNum('taxGrowthRate', 5) / 100,
    inflation:             parseNum('taxInflation', 2.7) / 100,
    spendingTarget:        parseNum('taxSpending', 40000),
    wrapperOrder,

    p1IsaBalance:          parseNum('taxP1Isa'),
    p1GiaBalance:          parseNum('taxP1Gia'),
    p1PensionBalance:      parseNum('taxP1Pension'),
    p1GiaCostBasis:        parseNum('taxP1GiaCost'),

    p2IsaBalance:          parseNum('taxP2Isa'),
    p2GiaBalance:          parseNum('taxP2Gia'),
    p2PensionBalance:      parseNum('taxP2Pension'),
    p2GiaCostBasis:        parseNum('taxP2GiaCost'),

    p1StatePensionAmount:  parseNum('taxP1SpAmount'),
    p1StatePensionYear:    parseInt2('taxP1SpYear'),
    p2StatePensionAmount:  parseNum('taxP2SpAmount'),
    p2StatePensionYear:    parseInt2('taxP2SpYear'),

    p1OtherIncomeAmount:   parseNum('taxP1OtherAmount'),
    p1OtherIncomeYears:    parseInt2('taxP1OtherYears'),
    p2OtherIncomeAmount:   parseNum('taxP2OtherAmount'),
    p2OtherIncomeYears:    parseInt2('taxP2OtherYears'),

    p1StartAge:            parseInt2('taxP1Age', 50),
    p2StartAge:            parseInt2('taxP2Age', 50),

    thresholdInflationRate: parseNum('taxThresholdInflation', 0) / 100,
  };
}
