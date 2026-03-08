import { DEFAULT_INPUTS, runRetirementSimulation, validateInputs } from './model/simulator.js';
import { initialiseTabs } from './ui/tabs.js';
import { renderResultsView } from './ui/results-view.js';

const formattedIntegerFieldIds = [
  'initialPortfolio',
  'initialSpending',
  'person1PensionToday',
  'person2PensionToday',
  'monteCarloRuns',
  'seed'
];

const els = {
  years: document.getElementById('years'),
  initialPortfolio: document.getElementById('initialPortfolio'),
  initialSpending: document.getElementById('initialSpending'),
  equityAllocation: document.getElementById('equityAllocation'),
  bondAllocation: document.getElementById('bondAllocation'),
  cashlikeAllocation: document.getElementById('cashlikeAllocation'),
  rebalanceToTarget: document.getElementById('rebalanceToTarget'),
  equityReturn: document.getElementById('equityReturn'),
  equityVolatility: document.getElementById('equityVolatility'),
  bondReturn: document.getElementById('bondReturn'),
  bondVolatility: document.getElementById('bondVolatility'),
  cashlikeReturn: document.getElementById('cashlikeReturn'),
  cashlikeVolatility: document.getElementById('cashlikeVolatility'),
  inflation: document.getElementById('inflation'),
  person1Age: document.getElementById('person1Age'),
  person1PensionAge: document.getElementById('person1PensionAge'),
  person1PensionToday: document.getElementById('person1PensionToday'),
  person2Age: document.getElementById('person2Age'),
  person2PensionAge: document.getElementById('person2PensionAge'),
  person2PensionToday: document.getElementById('person2PensionToday'),
  upperGuardrail: document.getElementById('upperGuardrail'),
  lowerGuardrail: document.getElementById('lowerGuardrail'),
  adjustmentSize: document.getElementById('adjustmentSize'),
  monteCarloRuns: document.getElementById('monteCarloRuns'),
  seed: document.getElementById('seed'),
  skipInflationAfterNegative: document.getElementById('skipInflationAfterNegative'),
  showRealValues: document.getElementById('showRealValues'),
  showFullTable: document.getElementById('showFullTable'),
  runSimulationBtn: document.getElementById('runSimulationBtn'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
  errorBox: document.getElementById('errorBox'),
  summarySuccessRate: document.getElementById('summarySuccessRate'),
  summaryMedianEnd: document.getElementById('summaryMedianEnd'),
  summaryWorstStress: document.getElementById('summaryWorstStress'),
  summaryWorstStressDesc: document.getElementById('summaryWorstStressDesc'),
  summaryCashRunway: document.getElementById('summaryCashRunway'),
  portfolioChart: document.getElementById('portfolioChart'),
  spendingChart: document.getElementById('spendingChart'),
  tableCard: document.getElementById('tableCard'),
  resultsTable: document.getElementById('resultsTable'),
  resultMeta: document.getElementById('resultMeta')
};

const tabs = initialiseTabs({ defaultTab: 'plan' });
let worker = null;
let latestResult = null;

initialise();

function initialise() {
  setupWorker();
  applyDefaults();
  attachFormatting();
  attachEvents();
  runSimulation();
}

function setupWorker() {
  try {
    worker = new Worker(new URL('./worker/worker.js', import.meta.url), { type: 'module' });

    worker.onmessage = (event) => {
      setBusy(false);

      if (!event.data?.ok) {
        showError(event.data?.error || 'Simulation failed.');
        return;
      }

      latestResult = event.data.result;
      hideError();
      renderAll();
      tabs.setActiveTab('results');
    };

    worker.onerror = () => {
      worker = null;
      setBusy(false);
      showError('Web Worker failed to load. Falling back to main-thread simulation.');
    };
  } catch {
    worker = null;
  }
}

function applyDefaults() {
  setFieldValue('years', DEFAULT_INPUTS.years);
  setFieldValue('initialPortfolio', DEFAULT_INPUTS.initialPortfolio, true);
  setFieldValue('initialSpending', DEFAULT_INPUTS.initialSpending, true);
  setFieldValue('equityAllocation', DEFAULT_INPUTS.equityAllocation);
  setFieldValue('bondAllocation', DEFAULT_INPUTS.bondAllocation);
  setFieldValue('cashlikeAllocation', DEFAULT_INPUTS.cashlikeAllocation);
  els.rebalanceToTarget.checked = DEFAULT_INPUTS.rebalanceToTarget;
  setFieldValue('equityReturn', DEFAULT_INPUTS.equityReturn);
  setFieldValue('equityVolatility', DEFAULT_INPUTS.equityVolatility);
  setFieldValue('bondReturn', DEFAULT_INPUTS.bondReturn);
  setFieldValue('bondVolatility', DEFAULT_INPUTS.bondVolatility);
  setFieldValue('cashlikeReturn', DEFAULT_INPUTS.cashlikeReturn);
  setFieldValue('cashlikeVolatility', DEFAULT_INPUTS.cashlikeVolatility);
  setFieldValue('inflation', DEFAULT_INPUTS.inflation);
  setFieldValue('person1Age', DEFAULT_INPUTS.person1Age);
  setFieldValue('person1PensionAge', DEFAULT_INPUTS.person1PensionAge);
  setFieldValue('person1PensionToday', DEFAULT_INPUTS.person1PensionToday, true);
  setFieldValue('person2Age', DEFAULT_INPUTS.person2Age);
  setFieldValue('person2PensionAge', DEFAULT_INPUTS.person2PensionAge);
  setFieldValue('person2PensionToday', DEFAULT_INPUTS.person2PensionToday, true);
  setFieldValue('upperGuardrail', DEFAULT_INPUTS.upperGuardrail);
  setFieldValue('lowerGuardrail', DEFAULT_INPUTS.lowerGuardrail);
  setFieldValue('adjustmentSize', DEFAULT_INPUTS.adjustmentSize);
  setFieldValue('monteCarloRuns', DEFAULT_INPUTS.monteCarloRuns, true);
  els.seed.value = '';
  els.skipInflationAfterNegative.checked = DEFAULT_INPUTS.skipInflationAfterNegative;
  els.showRealValues.checked = DEFAULT_INPUTS.showRealValues;
  els.showFullTable.checked = DEFAULT_INPUTS.showFullTable;
}

function attachFormatting() {
  formattedIntegerFieldIds.forEach((fieldId) => {
    const input = els[fieldId];
    if (!input) return;

    input.addEventListener('focus', () => {
      input.value = unformatNumberString(input.value);
    });

    input.addEventListener('blur', () => {
      if (fieldId === 'seed' && input.value.trim() === '') {
        input.value = '';
        return;
      }

      const value = parseLooseNumber(input.value);
      input.value = Number.isFinite(value) ? formatInteger(value) : '';
    });
  });
}

function attachEvents() {
  els.runSimulationBtn.addEventListener('click', runSimulation);

  els.resetDefaultsBtn.addEventListener('click', () => {
    applyDefaults();
    runSimulation();
  });

  els.showRealValues.addEventListener('change', renderAll);
  els.showFullTable.addEventListener('change', renderAll);

  window.addEventListener('resize', debounce(() => {
    if (latestResult) renderAll();
  }, 100));
}

function gatherInputs() {
  return {
    years: parseLooseInteger(els.years.value),
    initialPortfolio: parseLooseNumber(els.initialPortfolio.value),
    initialSpending: parseLooseNumber(els.initialSpending.value),
    equityAllocation: parseLooseNumber(els.equityAllocation.value),
    bondAllocation: parseLooseNumber(els.bondAllocation.value),
    cashlikeAllocation: parseLooseNumber(els.cashlikeAllocation.value),
    rebalanceToTarget: els.rebalanceToTarget.checked,
    equityReturn: parseLooseNumber(els.equityReturn.value),
    equityVolatility: parseLooseNumber(els.equityVolatility.value),
    bondReturn: parseLooseNumber(els.bondReturn.value),
    bondVolatility: parseLooseNumber(els.bondVolatility.value),
    cashlikeReturn: parseLooseNumber(els.cashlikeReturn.value),
    cashlikeVolatility: parseLooseNumber(els.cashlikeVolatility.value),
    inflation: parseLooseNumber(els.inflation.value),
    person1Age: parseLooseInteger(els.person1Age.value),
    person1PensionAge: parseLooseInteger(els.person1PensionAge.value),
    person1PensionToday: parseLooseNumber(els.person1PensionToday.value),
    person2Age: parseLooseInteger(els.person2Age.value),
    person2PensionAge: parseLooseInteger(els.person2PensionAge.value),
    person2PensionToday: parseLooseNumber(els.person2PensionToday.value),
    upperGuardrail: parseLooseNumber(els.upperGuardrail.value),
    lowerGuardrail: parseLooseNumber(els.lowerGuardrail.value),
    adjustmentSize: parseLooseNumber(els.adjustmentSize.value),
    monteCarloRuns: parseLooseInteger(els.monteCarloRuns.value),
    seed: els.seed.value.trim() === '' ? null : parseLooseInteger(els.seed.value),
    skipInflationAfterNegative: els.skipInflationAfterNegative.checked,
    showRealValues: els.showRealValues.checked,
    showFullTable: els.showFullTable.checked
  };
}

function runSimulation() {
  const inputs = gatherInputs();
  const mergedInputs = { ...DEFAULT_INPUTS, ...inputs };
  const errors = validateInputs(mergedInputs);

  if (errors.length > 0) {
    showError(errors.join(' '));
    return;
  }

  hideError();
  setBusy(true);
  updateResultMeta(mergedInputs);

  if (worker) {
    worker.postMessage({ type: 'run', inputs });
    return;
  }

  try {
    latestResult = runRetirementSimulation(inputs);
    setBusy(false);
    renderAll();
    tabs.setActiveTab('results');
  } catch (error) {
    setBusy(false);
    showError(error instanceof Error ? error.message : 'Simulation failed.');
  }
}

function renderAll() {
  if (!latestResult) return;

  renderResultsView({
    result: latestResult,
    elements: els,
    useReal: els.showRealValues.checked,
    showFullTable: els.showFullTable.checked,
    formatters: { formatCurrency, formatPercent, formatYears }
  });

  updateResultMeta(latestResult.inputs || gatherInputs());
}

function updateResultMeta(inputs) {
  if (!els.resultMeta) return;

  const runs = formatInteger(inputs.monteCarloRuns);
  const seed = inputs.seed === null || inputs.seed === undefined || Number.isNaN(inputs.seed) ? 'random' : formatInteger(inputs.seed);
  const basis = els.showRealValues.checked ? 'real' : 'nominal';
  els.resultMeta.textContent = `${runs} runs • seed ${seed} • ${basis} view`;
}

function setFieldValue(id, value, formatAsInteger = false) {
  if (!els[id]) return;
  els[id].value = formatAsInteger ? formatInteger(value) : String(value);
}

function setBusy(isBusy) {
  els.runSimulationBtn.disabled = isBusy;
  els.resetDefaultsBtn.disabled = isBusy;
  els.runSimulationBtn.textContent = isBusy ? 'Running...' : 'Run simulation';
}

function showError(message) {
  els.errorBox.style.display = 'block';
  els.errorBox.textContent = message;
}

function hideError() {
  els.errorBox.style.display = 'none';
  els.errorBox.textContent = '';
}

function parseLooseNumber(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return Number(cleaned);
}

function parseLooseInteger(value) {
  const numeric = parseLooseNumber(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : NaN;
}

function unformatNumberString(value) {
  return String(value ?? '').replace(/,/g, '');
}

function formatInteger(value) {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function formatYears(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)} years`;
}

function debounce(fn, delay) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  };
}
