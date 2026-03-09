import { DEFAULT_INPUTS, runRetirementSimulation, validateInputs } from './model/simulator.js';
import { initialiseTabs } from './ui/tabs.js';
import { renderResultsView } from './ui/results-view.js';
import { createPlanForm } from './ui/plan-form.js';
import { createAdvancedForm } from './ui/advanced-form.js';

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

  person1Name: document.getElementById('person1Name'),
  person1Age: document.getElementById('person1Age'),
  person1PensionAge: document.getElementById('person1PensionAge'),

  person2Name: document.getElementById('person2Name'),
  person2Age: document.getElementById('person2Age'),
  person2PensionAge: document.getElementById('person2PensionAge'),

  statePensionToday: document.getElementById('statePensionToday'),
  otherIncomeToday: document.getElementById('otherIncomeToday'),
  otherIncomeYears: document.getElementById('otherIncomeYears'),
  windfallAmount: document.getElementById('windfallAmount'),
  windfallYear: document.getElementById('windfallYear'),

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

const parsingHelpers = {
  formatInteger,
  parseLooseNumber,
  parseLooseInteger
};

const planForm = createPlanForm(els, parsingHelpers);
const advancedForm = createAdvancedForm(els, parsingHelpers);

let worker = null;
let latestResult = null;

initialise();

function initialise() {
  setupWorker();
  applyDefaults();
  attachEvents();
  tabs.setActiveTab('plan');
}

function setupWorker() {
  try {
    worker = new Worker(new URL('./worker/worker.js', import.meta.url), { type: 'module' });

    worker.onmessage = (event) => {
      planForm.setBusy(false);

      if (!event.data?.ok) {
        showError(event.data?.error || 'Simulation failed.');
        return;
      }

      latestResult = event.data.result;
      hideError();
      renderAll();
      tabs.setActiveTab('results');
      scrollToTop();
    };

    worker.onerror = () => {
      worker = null;
      planForm.setBusy(false);
      showError('Web Worker failed to load. Falling back to main-thread simulation.');
    };
  } catch {
    worker = null;
  }
}

function applyDefaults() {
  planForm.applyDefaults(DEFAULT_INPUTS);
  advancedForm.applyDefaults(DEFAULT_INPUTS);
}

function attachEvents() {
  planForm.attachFormatting();
  advancedForm.attachFormatting();

  planForm.bindActions({
    onRun: runSimulation,
    onReset: () => {
      applyDefaults();
      hideError();
      tabs.setActiveTab('plan');
      scrollToTop();
    }
  });

  advancedForm.bindDisplayEvents({
    onViewChange: renderAll
  });

  window.addEventListener(
    'resize',
    debounce(() => {
      if (latestResult) renderAll();
    }, 100)
  );
}

function gatherInputs() {
  return {
    ...planForm.readValues(),
    ...advancedForm.readValues()
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
  planForm.setBusy(true);
  updateResultMeta(mergedInputs);

  if (worker) {
    worker.postMessage({ type: 'run', inputs: mergedInputs });
    return;
  }

  try {
    latestResult = runRetirementSimulation(mergedInputs);
    planForm.setBusy(false);
    renderAll();
    tabs.setActiveTab('results');
    scrollToTop();
  } catch (error) {
    planForm.setBusy(false);
    showError(error instanceof Error ? error.message : 'Simulation failed.');
  }
}

function renderAll() {
  if (!latestResult) return;

  renderResultsView({
    result: latestResult,
    elements: els,
    useReal: Boolean(els.showRealValues?.checked),
    showFullTable: Boolean(els.showFullTable?.checked),
    formatters: {
      formatCurrency,
      formatPercent,
      formatYears
    }
  });

  updateResultMeta(latestResult.inputs || gatherInputs());
}

function updateResultMeta(inputs) {
  if (!els.resultMeta) return;

  const runs = formatInteger(inputs.monteCarloRuns);
  const seed =
    inputs.seed === null || inputs.seed === undefined || Number.isNaN(inputs.seed)
      ? 'random'
      : formatInteger(inputs.seed);
  const basis = els.showRealValues?.checked ? 'real' : 'nominal';

  els.resultMeta.textContent = `${runs} runs • seed ${seed} • ${basis} view`;
}

function showError(message) {
  if (!els.errorBox) return;
  els.errorBox.style.display = 'block';
  els.errorBox.textContent = message;
  scrollToTop();
}

function hideError() {
  if (!els.errorBox) return;
  els.errorBox.style.display = 'none';
  els.errorBox.textContent = '';
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
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

function formatInteger(value) {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 0
  }).format(value);
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