import { normaliseInputs, simulatePath } from '../js/model/simulator.js';
import { withdrawFromBuckets } from '../js/model/cashflow.js';
import { runHistoricalScenario } from '../js/model/historical/historical-runner.js';

const output = document.getElementById('output');

function log(message) {
  output.textContent += message + '\n';
}

function assert(name, condition) {
  if (condition) {
    log(`PASS: ${name}`);
  } else {
    log(`FAIL: ${name}`);
  }
}

/* =========================
   TEST 1 — Normalisation
========================= */

(function testNormalisation() {
  const a = normaliseInputs({ equityReturn: 7 });
  const b = normaliseInputs({ equityReturn: 0.07 });

  assert(
    'equityReturn normalises correctly',
    Math.abs(a.equityReturn - b.equityReturn) < 1e-9
  );
})();

/* =========================
   TEST 2 — Withdrawal order
========================= */

(function testWithdrawalOrder() {
  const buckets = {
    cashlike: 100,
    bonds: 100,
    equities: 100
  };

  const withdrawn = withdrawFromBuckets(buckets, 150);

  assert('withdrawal amount correct', withdrawn === 150);
  assert('cash used first', buckets.cashlike === 0);
  assert('bonds used second', buckets.bonds === 50);
  assert('equities untouched', buckets.equities === 100);
})();

/* =========================
   TEST 3 — Historical path shape
========================= */

(async function testHistorical() {
  try {
    const result = await runHistoricalScenario({
      years: 5,
      historicalScenario: 1929
    });

    assert('historical returns rows exist', Array.isArray(result.yearlyRows));
    assert('historical has paths', Array.isArray(result.pathNominal));
    assert('historical has terminal value', typeof result.terminalNominal === 'number');
  } catch (e) {
    assert('historical run did not throw', false);
    console.error(e);
  }
})();