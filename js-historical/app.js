import { DEFAULT_INPUTS, runRetirementSimulation, validateInputs } from '../js/model/simulator.js';
import { initialiseTabs } from '../js/ui/tabs.js';
import { renderResultsView } from '../js/ui/results-view.js';
import { createPlanForm } from '../js/ui/plan-form.js';
import { createAdvancedForm } from '../js/ui/advanced-form.js';

const els = {
  years: document.getElementById('years'),

  initialPortfolio: document.getElementById('initialPortfolio'),
  initialWithdrawalRate: document.getElementById('initialWithdrawalRate'),
  initialSpending: document.getElementById('initialSpending'),
  comfortSpending: document.getElementById('comfortSpending'),
  minimumSpending: document.getElementById('minimumSpending'),

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

  includePerson2: document.getElementById('includePerson2'),
  person2Panel: document.getElementById('person2Panel'),
  person2Name: document.getElementById('person2Name'),
  person2Age: document.getElementById('person2Age'),
  person2PensionAge: document.getElementById('person2PensionAge'),

  statePensionToday: document.getElementById('statePensionToday'),
  person1GetsFullPension: document.getElementById('person1GetsFullPension'),
  person1OtherIncomeToday: document.getElementById('person1OtherIncomeToday'),
  person1OtherIncomeYears: document.getElementById('person1OtherIncomeYears'),
  person1WindfallAmount: document.getElementById('person1WindfallAmount'),
  person1WindfallYear: document.getElementById('person1WindfallYear'),

  person2GetsFullPension: document.getElementById('person2GetsFullPension'),
  person2OtherIncomeToday: document.getElementById('person2OtherIncomeToday'),
  person2OtherIncomeYears: document.getElementById('person2OtherIncomeYears'),
  person2WindfallAmount: document.getElementById('person2WindfallAmount'),
  person2WindfallYear: document.getElementById('person2WindfallYear'),

  upperGuardrail: document.getElementById('upperGuardrail'),
  lowerGuardrail: document.getElementById('lowerGuardrail'),
  adjustmentSize: document.getElementById('adjustmentSize'),
  monteCarloRuns: document.getElementById('monteCarloRuns'),
  seed: document.getElementById('seed'),
  skipInflationAfterNegative: document.getElementById('skipInflationAfterNegative'),

  chartModeNominal: document.getElementById('chartModeNominal'),
  chartModeReal: document.getElementById('chartModeReal'),
  guytonKlingerOn: document.getElementById('guytonKlingerOn'),
  guytonKlingerOff: document.getElementById('guytonKlingerOff'),
  showRealValues: document.getElementById('showRealValues'),
  showFullTable: document.getElementById('showFullTable'),

  runSimulationBtn: document.getElementById('runSimulationBtn'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
  errorBox: document.getElementById('errorBox'),

  summarySuccessRateCard: document.getElementById('summarySuccessRateCard'),
  summarySuccessRate: document.getElementById('summarySuccessRate'),
  summaryMedianEnd: document.getElementById('summaryMedianEnd'),
  summaryWorstStress: document.getElementById('summaryWorstStress'),
  summaryWorstStressDesc: document.getElementById('summaryWorstStressDesc'),
  summaryCashRunway: document.getElementById('summaryCashRunway'),

  portfolioChart: document.getElementById('portfolioChart'),
  portfolioHorizonSummary: document.getElementById('portfolioHorizonSummary'),
  planWarnings: document.getElementById('planWarnings'),
  planSummaryPanel: document.getElementById('planSummaryPanel'),
  retirementOutlookHero: document.getElementById('retirementOutlookHero'),
  planSummaryGrid: document.getElementById('planSummaryGrid'),
  spendingChart: document.getElementById('spendingChart'),
  tableCard: document.getElementById('tableCard'),
  resultsTable: document.getElementById('resultsTable'),
  deterministicNote: document.getElementById('deterministicNote'),
  resultsLegend: document.getElementById('resultsLegend')
};

let latestResult = null;
let latestBaseInputs = null;
let worker = null;
let withdrawalInputMode = 'amount';

const parsingHelpers = { formatInteger, parseLooseNumber, parseLooseInteger };

const tabs = initialiseTabs({
  defaultTab: 'inputs',
  onChange: (tabName) => {
    if (tabName === 'results' && latestResult) {
      requestAnimationFrame(() => {
        renderAll();
      });
    }
  }
});

const planForm = createPlanForm(els, parsingHelpers);
const advancedForm = createAdvancedForm(els, parsingHelpers);

initialise();

function initialise() {
  setupWorker();
  applyDefaults();
  attachEvents();
  setResultsViewDefaults();
  syncInitialWithdrawalRateFromAmount();
  tabs.setActiveTab('inputs');
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
      showResults();
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
  latestBaseInputs = null;
  withdrawalInputMode = 'amount';
  syncInitialWithdrawalRateFromAmount();
}

function setResultsViewDefaults() {
  if (els.chartModeNominal) els.chartModeNominal.checked = true;
  if (els.chartModeReal) els.chartModeReal.checked = false;
  if (els.showRealValues) els.showRealValues.checked = false;
  if (els.showFullTable) els.showFullTable.checked = true;
  if (els.guytonKlingerOn) els.guytonKlingerOn.checked = true;
  if (els.guytonKlingerOff) els.guytonKlingerOff.checked = false;
}

function attachEvents() {
  planForm.attachFormatting();
  advancedForm.attachFormatting();

  planForm.bindActions({
    onRun: runSimulation,
    onReset: () => {
      applyDefaults();
      setResultsViewDefaults();
      hideError();
      tabs.setActiveTab('inputs');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  advancedForm.bindDisplayEvents({
    onViewChange: () => {
      if (latestResult) renderAll();
    }
  });

  attachWithdrawalRateSync();
  attachChartModeEvents();
  attachGuytonKlingerEvents();

  window.addEventListener(
    'resize',
    debounce(() => {
      if (latestResult) renderAll();
    }, 100)
  );
}

function attachWithdrawalRateSync() {
  if (els.initialWithdrawalRate) {
    els.initialWithdrawalRate.addEventListener('input', () => {
      withdrawalInputMode = 'rate';
      syncInitialSpendingFromRate();
    });

    els.initialWithdrawalRate.addEventListener('change', () => {
      withdrawalInputMode = 'rate';
      syncInitialSpendingFromRate();
    });
  }

  if (els.initialSpending) {
    els.initialSpending.addEventListener('input', () => {
      withdrawalInputMode = 'amount';
      syncInitialWithdrawalRateFromAmount();
    });

    els.initialSpending.addEventListener('change', () => {
      withdrawalInputMode = 'amount';
      syncInitialWithdrawalRateFromAmount();
    });
  }

  if (els.initialPortfolio) {
    els.initialPortfolio.addEventListener('input', () => {
      if (withdrawalInputMode === 'rate') {
        syncInitialSpendingFromRate();
      } else {
        syncInitialWithdrawalRateFromAmount();
      }
    });

    els.initialPortfolio.addEventListener('change', () => {
      if (withdrawalInputMode === 'rate') {
        syncInitialSpendingFromRate();
      } else {
        syncInitialWithdrawalRateFromAmount();
      }
    });
  }
}

function attachChartModeEvents() {
  const updateMode = () => {
    if (!els.showRealValues) return;
    els.showRealValues.checked = Boolean(els.chartModeReal?.checked);

    if (latestResult) {
      renderAll();
    }
  };

  if (els.chartModeNominal) {
    els.chartModeNominal.addEventListener('change', updateMode);
  }

  if (els.chartModeReal) {
    els.chartModeReal.addEventListener('change', updateMode);
  }
}

function attachGuytonKlingerEvents() {
  const rerun = () => {
    if (!latestBaseInputs) return;
    rerunResultsWithCurrentOptions();
  };

  if (els.guytonKlingerOn) {
    els.guytonKlingerOn.addEventListener('change', rerun);
  }

  if (els.guytonKlingerOff) {
    els.guytonKlingerOff.addEventListener('change', rerun);
  }
}

function syncInitialWithdrawalRateFromAmount() {
  if (!els.initialWithdrawalRate || !els.initialPortfolio || !els.initialSpending) return;

  const portfolio = parseLooseNumber(els.initialPortfolio.value);
  const spending = parseLooseNumber(els.initialSpending.value);

  if (!Number.isFinite(portfolio) || portfolio <= 0 || !Number.isFinite(spending) || spending < 0) {
    els.initialWithdrawalRate.value = '';
    return;
  }

  const rate = (spending / portfolio) * 100;
  els.initialWithdrawalRate.value = formatRate(rate);
}

function syncInitialSpendingFromRate() {
  if (!els.initialWithdrawalRate || !els.initialPortfolio || !els.initialSpending) return;

  const portfolio = parseLooseNumber(els.initialPortfolio.value);
  const rate = parseLooseNumber(els.initialWithdrawalRate.value);

  if (!Number.isFinite(portfolio) || portfolio < 0 || !Number.isFinite(rate) || rate < 0) {
    return;
  }

  const spending = portfolio * (rate / 100);
  els.initialSpending.value = formatInteger(Math.round(spending));
}

function gatherInputs() {
  const inputs = {
    ...planForm.readValues(),
    ...advancedForm.readValues()
  };

  if (els.initialSpending) {
    const spending = parseLooseNumber(els.initialSpending.value);
    if (Number.isFinite(spending)) {
      inputs.initialSpending = spending;
    }
  }

  return inputs;
}

function getResultsOverrideInputs(baseInputs) {
  return {
    ...baseInputs,
    enableGuardrails: Boolean(els.guytonKlingerOn?.checked)
  };
}

function runSimulation() {
  const inputs = gatherInputs();
  const mergedInputs = { ...DEFAULT_INPUTS, ...inputs };
  const errors = validateInputs(mergedInputs);

  if (errors.length > 0) {
    showError(errors.join(' '));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  hideError();
  latestBaseInputs = mergedInputs;
  planForm.setBusy(true);

  const effectiveInputs = getResultsOverrideInputs(mergedInputs);

  if (worker) {
    worker.postMessage({ type: 'run', inputs: effectiveInputs });
    return;
  }

  try {
    latestResult = runRetirementSimulation(effectiveInputs);
    planForm.setBusy(false);
    showResults();
  } catch (error) {
    planForm.setBusy(false);
    showError(error instanceof Error ? error.message : 'Simulation failed.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function rerunResultsWithCurrentOptions() {
  if (!latestBaseInputs) return;

  const effectiveInputs = getResultsOverrideInputs(latestBaseInputs);
  const errors = validateInputs(effectiveInputs);

  if (errors.length > 0) {
    showError(errors.join(' '));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  hideError();

  if (worker) {
    planForm.setBusy(true);
    worker.postMessage({ type: 'run', inputs: effectiveInputs });
    return;
  }

  try {
    latestResult = runRetirementSimulation(effectiveInputs);
    renderAll();
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Simulation failed.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function showResults() {
  tabs.setActiveTab('results');

  requestAnimationFrame(() => {
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
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

  applySuccessRateTone(latestResult.monteCarlo?.successRate ?? null);
}

function applySuccessRateTone(successRate) {
  if (!els.summarySuccessRateCard) return;

  els.summarySuccessRateCard.classList.remove(
    'summary-card--green',
    'summary-card--amber',
    'summary-card--red'
  );

  if (!Number.isFinite(successRate)) return;

  if (successRate >= 0.9) {
    els.summarySuccessRateCard.classList.add('summary-card--green');
  } else if (successRate >= 0.75) {
    els.summarySuccessRateCard.classList.add('summary-card--amber');
  } else {
    els.summarySuccessRateCard.classList.add('summary-card--red');
  }
}

function showError(message) {
  if (!els.errorBox) return;
  els.errorBox.style.display = 'block';
  els.errorBox.textContent = message;
}

function hideError() {
  if (!els.errorBox) return;
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

function formatInteger(value) {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);
}

function formatRate(value) {
  if (!Number.isFinite(value)) return '';
  return Number(value.toFixed(2)).toString();
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