import { DEFAULT_INPUTS, validateInputs } from './model/simulator.js';
import { runSimulationByMode } from './model/run-simulation-by-mode.js';
import { initialiseTabs } from './ui/tabs.js';
import { renderResultsView } from './ui/results-view.js';
import { createPlanForm } from './ui/plan-form.js';
import { createAdvancedForm } from './ui/advanced-form.js';
import { renderTaxForm, buildTaxInputs } from './ui/tax-form.js';
import { renderTaxView } from './ui/tax-view.js';
import { runTaxEngine } from './model/tax-engine.js';

const els = {
  years: document.getElementById('years'),

  initialPortfolio: document.getElementById('initialPortfolio'),
  initialWithdrawalRate: document.getElementById('initialWithdrawalRate'),
  initialSpending: document.getElementById('initialSpending'),
  comfortSpending: document.getElementById('comfortSpending'),
  minimumSpending: document.getElementById('minimumSpending'),
  annualFeeRate: document.getElementById('annualFeeRate'),

  equityAllocation: document.getElementById('equityAllocation'),
  bondAllocation: document.getElementById('bondAllocation'),
  cashlikeAllocation: document.getElementById('cashlikeAllocation'),
  cashAllocation: document.getElementById('cashAllocation'),
  allocationStatus: document.getElementById('allocationStatus'),
  allocationStatusTotal: document.getElementById('allocationStatusTotal'),
  allocationStatusMessage: document.getElementById('allocationStatusMessage'),
  rebalanceToTarget: document.getElementById('rebalanceToTarget'),

  equityReturn: document.getElementById('equityReturn'),
  equityVolatility: document.getElementById('equityVolatility'),
  bondReturn: document.getElementById('bondReturn'),
  bondVolatility: document.getElementById('bondVolatility'),
  cashlikeReturn: document.getElementById('cashlikeReturn'),
  cashlikeVolatility: document.getElementById('cashlikeVolatility'),
  inflation: document.getElementById('inflation'),

  person1Name: document.getElementById('person1Name'),
  portfolioPerson1Name: document.getElementById('portfolioPerson1Name'),
  portfolioPerson2Name: document.getElementById('portfolioPerson2Name'),
  portfolioPerson1Age: document.getElementById('portfolioPerson1Age'),
  portfolioPerson2Age: document.getElementById('portfolioPerson2Age'),
  portfolioHasPerson2: document.getElementById('portfolioHasPerson2'),
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
  maxSpendingNominal: document.getElementById('maxSpendingNominal'),
  simulationMode: document.getElementById('simulationMode'),
  historicalScenario: document.getElementById('historicalScenario'),
  monteCarloRunsRow: document.getElementById('monteCarloRunsRow'),
  historicalScenarioRow: document.getElementById('historicalScenarioRow'),
  monteCarloRunsPreset: document.getElementById('monteCarloRunsPreset'),
  monteCarloRuns: document.getElementById('monteCarloRuns'),
  skipInflationAfterNegative: document.getElementById('skipInflationAfterNegative'),

  chartModeNominal: document.getElementById('chartModeNominal'),
  chartModeReal: document.getElementById('chartModeReal'),
  guytonKlingerOn: document.getElementById('guytonKlingerOn'),
  guytonKlingerOff: document.getElementById('guytonKlingerOff'),
  showRealValues: document.getElementById('showRealValues'),
  showFullTable: document.getElementById('showFullTable'),
  showPlanOutlook: document.getElementById('showPlanOutlook'),

  continueToAssumptionsBtn: document.getElementById('continueToAssumptionsBtn'),
  portfolioValidationStatus: document.getElementById('portfolioValidationStatus'),
  runSimulationBtn: document.getElementById('runSimulationBtn'),
  errorBox: document.getElementById('errorBox'),

  summaryBand: document.getElementById('summaryBand'),
    
  summarySuccessRateCard: document.getElementById('summarySuccessRateCard'),
  summarySuccessRate: document.getElementById('summarySuccessRate'),
  summarySuccessRateLabel: document.getElementById('summarySuccessRateLabel'),
  summarySuccessRateDesc: document.getElementById('summarySuccessRateDesc'),

  summaryMedianEnd: document.getElementById('summaryMedianEnd'),
  summaryMedianEndLabel: document.getElementById('summaryMedianEndLabel'),
  summaryMedianEndDesc: document.getElementById('summaryMedianEndDesc'),

  summaryWorstStress: document.getElementById('summaryWorstStress'),
  summaryWorstStressLabel: document.getElementById('summaryWorstStressLabel'),
  summaryWorstStressDesc: document.getElementById('summaryWorstStressDesc'),

  summaryCashRunway: document.getElementById('summaryCashRunway'),
  summaryCashRunwayLabel: document.getElementById('summaryCashRunwayLabel'),
  summaryCashRunwayDesc: document.getElementById('summaryCashRunwayDesc'),

  portfolioChart: document.getElementById('portfolioChart'),
  portfolioHorizonSummary: document.getElementById('portfolioHorizonSummary'),
  resultsContextBar: document.getElementById('resultsContextBar'),
  planWarnings: document.getElementById('planWarnings'),
  planSummaryPanel: document.getElementById('planSummaryPanel'),
  retirementOutlookHero: document.getElementById('retirementOutlookHero'),
  planSummaryGrid: document.getElementById('planSummaryGrid'),
  spendingChart: document.getElementById('spendingChart'),
  tableCard: document.getElementById('tableCard'),
  tableModeSelector: document.getElementById('tableModeSelector'),
  tableViewSelector: document.getElementById('tableViewSelector'),
  resultsTableIntro: document.getElementById('resultsTableIntro'),
  resultsTable: document.getElementById('resultsTable'),
  resultsTableNote: document.getElementById('resultsTableNote'),
  resultsTableLegend: document.getElementById('resultsTableLegend'),
  assumptionsTabButton: document.querySelector('[data-tab-button="assumptions"]'),
  resultsTabButton: document.querySelector('[data-tab-button="results"]'),
  taxTabButton: document.querySelector('[data-tab-button="tax"]')
};

let latestResult = null;
let latestBaseInputs = null;
let latestTaxResult = null;
let worker = null;
let withdrawalInputMode = 'rate';
let currentTableView = 'median';
let currentTableMode = 'plan';
let portfolioAccounts = [];
let portfolioConfig = {
  hasPerson2: true
};
let portfolioPeople = {
  person1Name: '',
  person2Name: '',
  person1Age: 55,
  person2Age: 55
};
let hasMappedPortfolioToAssumptions = false;

const PORTFOLIO_STORAGE_KEY = 'retirement_portfolio_accounts_v1';
const PORTFOLIO_CONFIG_STORAGE_KEY = 'retirement_portfolio_config_v1';
const PORTFOLIO_PEOPLE_STORAGE_KEY = 'retirement_portfolio_people_v1';

function updateRunSimulationButtonState(activeTab) {
  if (!els.runSimulationBtn) return;

  const isAssumptionsTab = activeTab === 'assumptions';

  els.runSimulationBtn.classList.toggle('btn-primary', isAssumptionsTab);
  els.runSimulationBtn.classList.toggle('btn-secondary', !isAssumptionsTab);
  els.runSimulationBtn.classList.toggle('btn-run-simulation--active', isAssumptionsTab);
  els.runSimulationBtn.classList.toggle('btn-run-simulation--inactive', !isAssumptionsTab);
  els.runSimulationBtn.setAttribute('aria-disabled', String(!isAssumptionsTab));
}

function savePortfolioToStorage() {
  const activeAccounts = getActivePortfolioAccounts();

  localStorage.setItem(
    PORTFOLIO_STORAGE_KEY,
    JSON.stringify(activeAccounts)
  );
}

function loadPortfolioFromStorage() {
  const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      portfolioAccounts = parsed;
    }
  } catch (error) {
    console.warn('Failed to load portfolio from storage', error);
  }
}

const parsingHelpers = { formatInteger, parseLooseNumber, parseLooseInteger };

const tabs = initialiseTabs({
  defaultTab: 'portfolio',
  onChange: (tabName) => {
    document.body.classList.toggle('is-portfolio', tabName === 'portfolio');
    document.body.classList.toggle('is-results', tabName === 'results');
    document.body.classList.toggle('is-tax', tabName === 'tax');

    // Compact header only valid on results/tax — restore when leaving
    if (tabName !== 'results' && tabName !== 'tax') {
      document.querySelector('.top-header')?.classList.remove('top-header--compact');
      document.documentElement.style.setProperty('--header-height', '164px');
    }

    updateRunSimulationButtonState(tabName);

    // Summary band visible on results and tax
    if (els.summaryBand) {
      els.summaryBand.classList.toggle('hidden', tabName !== 'results');
    }

    if (tabName === 'results' && latestResult) {
      requestAnimationFrame(() => {
        renderAll();
      });
    }

    if (tabName === 'tax') {
      renderTaxForm(
        document.getElementById('taxFormContainer'),
        latestBaseInputs || null
      );
      if (latestTaxResult) {
        renderTaxResults();
      }
    }
  }
});

const planForm = createPlanForm(els, parsingHelpers);
const advancedForm = createAdvancedForm(els, parsingHelpers);

initialise();

function formatOneDecimal(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return num.toFixed(1);
}

function savePortfolioConfigToStorage() {
  localStorage.setItem(
    PORTFOLIO_CONFIG_STORAGE_KEY,
    JSON.stringify(portfolioConfig)
  );
}

function loadPortfolioConfigFromStorage() {
  const saved = localStorage.getItem(PORTFOLIO_CONFIG_STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    if (parsed && typeof parsed === 'object') {
      portfolioConfig = {
        hasPerson2: Boolean(parsed.hasPerson2)
      };
    }
  } catch (error) {
    console.warn('Failed to load portfolio config', error);
  }
}

function savePortfolioPeopleToStorage() {
  localStorage.setItem(
    PORTFOLIO_PEOPLE_STORAGE_KEY,
    JSON.stringify(portfolioPeople)
  );
}

function syncPortfolioPeopleFromFields() {
  if (els.portfolioPerson1Name) {
    portfolioPeople.person1Name = els.portfolioPerson1Name.value;
  }

  if (els.portfolioPerson2Name) {
    portfolioPeople.person2Name = els.portfolioPerson2Name.value;
  }

  if (els.portfolioPerson1Age) {
    const nextAge = Number.parseInt(els.portfolioPerson1Age.value, 10);
    portfolioPeople.person1Age = Number.isFinite(nextAge) ? nextAge : 55;
  }

  if (els.portfolioPerson2Age) {
    const nextAge = Number.parseInt(els.portfolioPerson2Age.value, 10);
    portfolioPeople.person2Age = Number.isFinite(nextAge) ? nextAge : 55;
  }
}

function loadPortfolioPeopleFromStorage() {
  const saved = localStorage.getItem(PORTFOLIO_PEOPLE_STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    if (parsed && typeof parsed === 'object') {
      portfolioPeople = {
        person1Name: String(parsed.person1Name || ''),
        person2Name: String(parsed.person2Name || ''),
        person1Age: Number.isFinite(Number(parsed.person1Age)) ? Number(parsed.person1Age) : 55,
        person2Age: Number.isFinite(Number(parsed.person2Age)) ? Number(parsed.person2Age) : 55
      };
    }
  } catch (error) {
    console.warn('Failed to load portfolio people from storage', error);
  }
}

function renderPortfolioPeopleFields() {
  if (els.portfolioPerson1Name) {
    els.portfolioPerson1Name.value = portfolioPeople.person1Name || '';
  }

  if (els.portfolioPerson2Name) {
    els.portfolioPerson2Name.value = portfolioPeople.person2Name || '';
  }

  if (els.portfolioPerson1Age) {
    els.portfolioPerson1Age.value = portfolioPeople.person1Age ?? 55;
  }

  if (els.portfolioPerson2Age) {
    els.portfolioPerson2Age.value = portfolioPeople.person2Age ?? 55;
  }  
}

function initialise() {
  setupWorker();
  applyDefaults();
  loadPortfolioFromStorage();
  loadPortfolioConfigFromStorage();
  loadPortfolioPeopleFromStorage();
  attachEvents();
  setResultsViewDefaults();
  syncInitialSpendingFromRate();
  updateAllocationStatus();
  renderPortfolioPeopleFields();
  renderPortfolioTable();
  applyPerson2PortfolioRules();
  document.body.classList.add('is-portfolio');
  tabs.setActiveTab('portfolio');
  updateRunSimulationButtonState('portfolio');
  hasMappedPortfolioToAssumptions = false;

  // Compact header: observe the bottom edge of #summaryBand (above the tab panels).
  // When the summary band scrolls out of view, collapse the header.
  // This replaces the old toolbarSentinel which was inside the Results panel.
  const summaryBandEl = document.getElementById('summaryBand');
  const header = document.querySelector('.top-header');
  if (summaryBandEl && header) {
    new IntersectionObserver(
      ([entry]) => {
        const onResultsOrTax =
          document.body.classList.contains('is-results') ||
          document.body.classList.contains('is-tax');
        const compact = onResultsOrTax && !entry.isIntersecting;
        header.classList.toggle('top-header--compact', compact);
        document.documentElement.style.setProperty('--header-height', compact ? '56px' : '164px');
      },
      { threshold: 0 }
    ).observe(summaryBandEl);
  }
}

function resetResultsHeader() {
  if (els.summarySuccessRateLabel) {
    els.summarySuccessRateLabel.textContent = 'Plan reliability';
  }

  if (els.summarySuccessRate) {
    els.summarySuccessRate.textContent = '—';
  }

  if (els.summarySuccessRateDesc) {
    els.summarySuccessRateDesc.textContent =
      'Shows how often the plan sustains spending across simulated outcomes.';
  }

  if (els.summaryMedianEndLabel) {
    els.summaryMedianEndLabel.textContent = 'Expected outcome (median path)';
  }

  if (els.summaryMedianEnd) {
    els.summaryMedianEnd.textContent = '—';
  }

  if (els.summaryMedianEndDesc) {
    els.summaryMedianEndDesc.textContent =
      'After funding your planned spending throughout.';
  }

  if (els.summaryWorstStressLabel) {
    els.summaryWorstStressLabel.textContent = 'Worst observed outcome';
  }

  if (els.summaryWorstStress) {
    els.summaryWorstStress.textContent = '—';
  }

  if (els.summaryWorstStressDesc) {
    els.summaryWorstStressDesc.textContent =
      'Portfolio fully depleted in worst cases.';
  }

  if (els.summaryCashRunwayLabel) {
    els.summaryCashRunwayLabel.textContent = 'Spending shortfall risk';
  }

  if (els.summaryCashRunway) {
    els.summaryCashRunway.textContent = '—';
  }

  if (els.summaryCashRunwayDesc) {
    els.summaryCashRunwayDesc.textContent =
      'Shows whether weaker outcomes fall below the minimum spending level.';
}

  if (els.summarySuccessRateCard) {
    els.summarySuccessRateCard.classList.remove(
      'summary-card--green',
      'summary-card--amber',
      'summary-card--red',
      'is-strong',
      'is-weak',
      'is-watch'
    );
  }
}

function setupWorker() {
  try {
    worker = new Worker(new URL('./worker/worker.js', import.meta.url), { type: 'module' });

    worker.onmessage = (event) => {
      console.log('worker response', event.data);

      planForm.setBusy(false);

      if (!event.data?.ok) {
        console.error('worker error', event.data);
        showError(event.data?.error || 'Simulation failed.');
        return;
      }

      latestResult = event.data.result;
      console.log('latestResult set', latestResult);

      hideError();
      showResults();
    };

    worker.onerror = (error) => {
      console.error('worker.onerror', error);
      worker = null;
      planForm.setBusy(false);
      showError('Web Worker failed to load. Falling back to main-thread simulation.');
    };
  } catch (error) {
    console.error('setupWorker failed', error);
    worker = null;
  }
}

function applyDefaults() {
  planForm.applyDefaults(DEFAULT_INPUTS);
  advancedForm.applyDefaults(DEFAULT_INPUTS);
  latestBaseInputs = null;
  withdrawalInputMode = 'rate';
  currentTableView = 'median';
  currentTableMode = 'plan';

  if (els.initialWithdrawalRate && !String(els.initialWithdrawalRate.value || '').trim()) {
    els.initialWithdrawalRate.value = '4';
  }

  syncInitialSpendingFromRate();
}

function clearAssumptionsUi() {
  const textLikeFields = [
    els.years,
    els.initialPortfolio,
    els.initialWithdrawalRate,
    els.initialSpending,
    els.comfortSpending,
    els.minimumSpending,
    els.annualFeeRate,
    els.equityAllocation,
    els.bondAllocation,
    els.cashlikeAllocation,
    els.cashAllocation,
    els.equityReturn,
    els.equityVolatility,
    els.bondReturn,
    els.bondVolatility,
    els.cashlikeReturn,
    els.cashlikeVolatility,
    els.inflation,
    els.person1Name,
    els.person1Age,
    els.person1PensionAge,
    els.person2Name,
    els.person2Age,
    els.person2PensionAge,
    els.statePensionToday,
    els.person1OtherIncomeToday,
    els.person1OtherIncomeYears,
    els.person1WindfallAmount,
    els.person1WindfallYear,
    els.person2OtherIncomeToday,
    els.person2OtherIncomeYears,
    els.person2WindfallAmount,
    els.person2WindfallYear,
    els.upperGuardrail,
    els.lowerGuardrail,
    els.adjustmentSize,
    els.monteCarloRuns
  ].filter(Boolean);

  textLikeFields.forEach((field) => {
    field.value = '';
  });

  const checkboxFields = [
    els.rebalanceToTarget,
    els.person1GetsFullPension,
    els.person2GetsFullPension,
    els.skipInflationAfterNegative
  ].filter(Boolean);

  checkboxFields.forEach((field) => {
    field.checked = false;
  });

  if (els.simulationMode) {
    els.simulationMode.selectedIndex = 0;
  }

  if (els.historicalScenario) {
    els.historicalScenario.selectedIndex = 0;
  }

  latestBaseInputs = null;
  withdrawalInputMode = 'rate';

  if (els.initialWithdrawalRate && !String(els.initialWithdrawalRate.value || '').trim()) {
    els.initialWithdrawalRate.value = '4';
  }

  updateAllocationStatus();
  }

function setResultsViewDefaults() {
  if (els.chartModeNominal) els.chartModeNominal.checked = false;
  if (els.chartModeReal) els.chartModeReal.checked = true;
  if (els.showRealValues) els.showRealValues.checked = true;
  if (els.showFullTable) els.showFullTable.checked = true;
  if (els.showPlanOutlook) els.showPlanOutlook.checked = true;
}

function sanitiseInputs(rawInputs = {}) {
  return Object.fromEntries(
    Object.entries(rawInputs).filter(([, value]) => {
      if (value === '' || value === null || value === undefined) return false;
      if (typeof value === 'number' && !Number.isFinite(value)) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    })
  );
}

function prepareAndRunSimulation() {
  console.log('prepareAndRunSimulation start');

  const activeAccounts = getActivePortfolioAccounts();
  console.log('activeAccounts', activeAccounts);

  if (!activeAccounts.length) {
    console.log('stopped: no active accounts');
    showError('Build your portfolio first - add at least one account to run a simulation.');
    tabs.setActiveTab('portfolio');
    return;
  }

  const validationState = getPortfolioValidationState();
  console.log('validationState', validationState);

  if (!validationState.isReady) {
    console.log('stopped: portfolio validation failed');
    showError('Fix the highlighted portfolio issues before running a simulation.');
    tabs.setActiveTab('portfolio');
    return;
  }

  const totals = calculatePortfolioTotals(activeAccounts);
  console.log('totals', totals);

  const mappedInputs = mapPortfolioToInputs(totals);
  console.log('mappedInputs', mappedInputs);

  const currentInputs = sanitiseInputs(gatherInputs());
  console.log('currentInputs', currentInputs);

  latestBaseInputs = {
    ...mappedInputs,
    ...currentInputs
  };
  console.log('latestBaseInputs', latestBaseInputs);

  applyPortfolioInputsToAssumptions(latestBaseInputs);
  hasMappedPortfolioToAssumptions = true;

  hideError();
  console.log('calling runSimulation');
  runSimulation();
}

function continueToAssumptions() {
  const activeAccounts = getActivePortfolioAccounts();
  const validationState = getPortfolioValidationState();

  if (!activeAccounts.length) {
    showError('Add at least one account before continuing.');
    tabs.setActiveTab('portfolio');
    return false;
  }

  if (!validationState.isReady) {
    showError('Fix the highlighted portfolio issues before continuing.');
    tabs.setActiveTab('portfolio');
    return false;
  }

  const portfolioTotals = calculatePortfolioTotals(activeAccounts);
  const roundedPortfolioTotal =
    Math.round(portfolioTotals.allocations.equities) +
    Math.round(portfolioTotals.allocations.bonds) +
    Math.round(portfolioTotals.allocations.cashlike) +
    Math.round(portfolioTotals.allocations.cash);

  if (roundedPortfolioTotal < 99 || roundedPortfolioTotal > 101) {
    showError('Portfolio totals could not be mapped cleanly to Assumptions. Check your account allocations.');
    tabs.setActiveTab('portfolio');
    return false;
  }

  const mappedInputs = mapPortfolioToInputs(portfolioTotals);

  latestBaseInputs = {
    ...mappedInputs
  };

  applyPortfolioInputsToAssumptions(latestBaseInputs);
  hasMappedPortfolioToAssumptions = true;
  tabs.setActiveTab('assumptions');

  requestAnimationFrame(() => {
    hideError();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  return true;
}

function attachEvents() {
  if (els.portfolioHasPerson2) {
    els.portfolioHasPerson2.checked = portfolioConfig.hasPerson2;

    els.portfolioHasPerson2.addEventListener('change', (e) => {
      portfolioConfig.hasPerson2 = Boolean(e.target.checked);
    
      savePortfolioConfigToStorage();
    
      if (els.includePerson2) {
        els.includePerson2.checked = portfolioConfig.hasPerson2;
      }
    
      applyPerson2PortfolioRules();
      renderPortfolioTable();
    });
  }

  if (els.portfolioPerson1Name) {
    els.portfolioPerson1Name.addEventListener('input', (e) => {
      portfolioPeople.person1Name = e.target.value;
      savePortfolioPeopleToStorage();
      renderPortfolioTable();
    });
  }

  if (els.portfolioPerson2Name) {
    els.portfolioPerson2Name.addEventListener('input', (e) => {
      portfolioPeople.person2Name = e.target.value;
      savePortfolioPeopleToStorage();
      renderPortfolioTable();
    });
  }

  if (els.portfolioPerson1Age) {
    els.portfolioPerson1Age.addEventListener('input', (e) => {
      const nextAge = Number.parseInt(e.target.value, 10);
      portfolioPeople.person1Age = Number.isFinite(nextAge) ? nextAge : 55;
      savePortfolioPeopleToStorage();
    });
  }

  if (els.portfolioPerson2Age) {
    els.portfolioPerson2Age.addEventListener('input', (e) => {
      const nextAge = Number.parseInt(e.target.value, 10);
      portfolioPeople.person2Age = Number.isFinite(nextAge) ? nextAge : 55;
      savePortfolioPeopleToStorage();
    });
  }

if (els.continueToAssumptionsBtn) {
  els.continueToAssumptionsBtn.addEventListener('click', () => {
    continueToAssumptions();
  });
}

const addPortfolioAccountBtn = document.getElementById('addPortfolioAccountBtn');

if (addPortfolioAccountBtn) {
  addPortfolioAccountBtn.addEventListener('click', () => {
    addPortfolioAccount();
  });
}

const savePortfolioBtn = document.getElementById('savePortfolioBtn');

if (savePortfolioBtn) {
  savePortfolioBtn.addEventListener('click', () => {
    syncPortfolioPeopleFromFields();
    savePortfolioToStorage();
    savePortfolioConfigToStorage();
    savePortfolioPeopleToStorage();

    const originalLabel = savePortfolioBtn.textContent;

    savePortfolioBtn.textContent = 'Saved';
    savePortfolioBtn.classList.remove('btn-secondary');
    savePortfolioBtn.classList.add('btn-success');

    window.setTimeout(() => {
      savePortfolioBtn.textContent = originalLabel;
      savePortfolioBtn.classList.remove('btn-success');
      savePortfolioBtn.classList.add('btn-secondary');
    }, 1200);
  });
}

  const deletePortfolioBtn = document.getElementById('deletePortfolioBtn');
  const deleteConfirmEl = document.getElementById('deletePortfolioConfirm');
  const confirmDeleteBtn = document.getElementById('confirmDeletePortfolioBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeletePortfolioBtn');

  if (deletePortfolioBtn && deleteConfirmEl) {
    deletePortfolioBtn.addEventListener('click', () => {
      deleteConfirmEl.classList.remove('hidden');
      deletePortfolioBtn.classList.add('hidden');
    });
  }

  if (cancelDeleteBtn && deleteConfirmEl && deletePortfolioBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      deleteConfirmEl.classList.add('hidden');
      deletePortfolioBtn.classList.remove('hidden');
    });
  }

  if (confirmDeleteBtn && deleteConfirmEl && deletePortfolioBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      portfolioAccounts.length = 0;
      latestBaseInputs = null;
      hasMappedPortfolioToAssumptions = false;

      localStorage.removeItem(PORTFOLIO_STORAGE_KEY);
      localStorage.removeItem(PORTFOLIO_CONFIG_STORAGE_KEY);
      localStorage.removeItem(PORTFOLIO_PEOPLE_STORAGE_KEY);

      hideError();
      renderPortfolioTable();

      deleteConfirmEl.classList.add('hidden');
      deletePortfolioBtn.classList.remove('hidden');
    });
  }

  planForm.attachFormatting();
  advancedForm.attachFormatting();

  planForm.bindActions({
    onRun: () => {
      prepareAndRunSimulation();
    },
    onReset: () => {
      applyDefaults();
      clearAssumptionsUi();
      setResultsViewDefaults();
      updateAllocationStatus();
      applyPerson2PortfolioRules();
      renderPortfolioPeopleFields();
      hasMappedPortfolioToAssumptions = false;

      latestResult = null;
      latestBaseInputs = null;
      latestTaxResult = null;
      currentTableView = 'median';
      currentTableMode = 'plan';

      resetResultsHeader();

      hideError();
      tabs.setActiveTab('portfolio');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  advancedForm.bindDisplayEvents({
    onViewChange: () => {
      if (latestResult) {
        renderAll();
      }
    }
  });

  attachWithdrawalRateSync();
  attachChartModeEvents();
  attachGuytonKlingerEvents();
  attachResultsTabGuard();
  attachAssumptionsTabGuard();
  attachTaxTabEvents();

  window.addEventListener(
    'resize',
    debounce(() => {
      if (latestResult) {
        renderAll();
      }
    }, 100)
  );

  if (els.showPlanOutlook) {
    els.showPlanOutlook.addEventListener('change', () => {
      togglePlanOutlook();
    });
  }

  attachAllocationStatusEvents();
}

// ---------------------------------------------------------------------------
// Tax tab events
// ---------------------------------------------------------------------------

function attachTaxTabEvents() {
  // Run tax button (rendered dynamically by renderTaxForm — use delegation)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'runTaxBtn') {
      const inputs = buildTaxInputs();
      latestTaxResult = runTaxEngine(inputs);
      renderTaxResults();
    }
  });

  // Real/Nominal toggle
  document.querySelectorAll('input[name="taxMode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (latestTaxResult) renderTaxResults();
    });
  });
}

function renderTaxResults() {
  if (!latestTaxResult) return;
  const panel = document.getElementById('taxResultsPanel');
  if (panel) panel.removeAttribute('hidden');
  const useReal = document.getElementById('taxModeReal')?.checked !== false;
  renderTaxView({
    result: latestTaxResult,
    summaryContainer: document.getElementById('taxSummaryContainer'),
    tableEl: document.getElementById('taxYearTable'),
    useReal,
    formatCurrency,
  });
}

function attachAllocationStatusEvents() {
  const allocationInputs = [
    els.equityAllocation,
    els.bondAllocation,
    els.cashlikeAllocation,
    els.cashAllocation  
  ].filter(Boolean);

  allocationInputs.forEach((input) => {
    input.addEventListener('input', updateAllocationStatus);
    input.addEventListener('change', updateAllocationStatus);
  });

}

function updateAllocationStatus() {
  if (!els.allocationStatus || !els.allocationStatusTotal || !els.allocationStatusMessage) {
    return;
  }

  const equity = parseLooseNumber(els.equityAllocation?.value);
  const bond = parseLooseNumber(els.bondAllocation?.value);
  const cashlike = parseLooseNumber(els.cashlikeAllocation?.value);
  const cash = parseLooseNumber(els.cashAllocation?.value);

  const total =
    (Number.isFinite(equity) ? equity : 0) +
    (Number.isFinite(bond) ? bond : 0) +
    (Number.isFinite(cashlike) ? cashlike : 0) +
    (Number.isFinite(cash) ? cash : 0);

  const roundedTotal = Math.round(total);

  els.allocationStatus.classList.remove(
    'allocation-status--balanced',
    'allocation-status--under',
    'allocation-status--over'
  );

  els.allocationStatusTotal.textContent = `${roundedTotal}%`;

  if (roundedTotal === 100) {
    els.allocationStatus.classList.add('allocation-status--balanced');
    els.allocationStatusMessage.textContent = 'Balanced';
    return;
  }

  if (roundedTotal < 100) {
    els.allocationStatus.classList.add('allocation-status--under');
    els.allocationStatusMessage.textContent = `${100 - roundedTotal}% left to allocate`;
    return;
  }

  els.allocationStatus.classList.add('allocation-status--over');
  els.allocationStatusMessage.textContent = `${roundedTotal - 100}% overallocated`;
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

  document.querySelectorAll('[data-step-target="initialWithdrawalRate"]').forEach((button) => {
    button.addEventListener('click', () => {
      withdrawalInputMode = 'rate';
      requestAnimationFrame(() => {
        syncInitialSpendingFromRate();
      });
    });
  });

  document.querySelectorAll('[data-step-target="initialSpending"]').forEach((button) => {
    button.addEventListener('click', () => {
      withdrawalInputMode = 'amount';
      requestAnimationFrame(() => {
        syncInitialWithdrawalRateFromAmount();
      });
    });
  });
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

function attachResultsTabGuard() {
  if (!els.resultsTabButton) return;

  els.resultsTabButton.addEventListener(
    'click',
    (event) => {
      if (latestResult) {
        hideError();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      tabs.setActiveTab('portfolio');
      showError('Before you can view your results, you need to run a simulation.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    true
  );
}

function attachAssumptionsTabGuard() {
  if (!els.assumptionsTabButton) return;

  els.assumptionsTabButton.addEventListener(
    'click',
    (event) => {
      if (hasMappedPortfolioToAssumptions) {
        hideError();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      continueToAssumptions();
    },
    true
  );
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

  if (typeof planForm.syncDefaultSpendingFloors === 'function') {
    planForm.syncDefaultSpendingFloors();
  }
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

  if (els.historicalScenario) {
    const selectedIndex = els.historicalScenario.selectedIndex;
    const selectedOption =
      selectedIndex >= 0 ? els.historicalScenario.options[selectedIndex] : null;

    inputs.historicalScenarioLabel = selectedOption?.text?.trim() || '';
  }

  return inputs;
}

function getResultsOverrideInputs(baseInputs) {
  return {
    ...baseInputs,
    enableGuardrails: Boolean(els.guytonKlingerOn?.checked)
  };
}

function normaliseAllocationInputsForSimulation(inputs) {
  const equity = Math.round(Number(inputs.equityAllocation) || 0);
  const bond = Math.round(Number(inputs.bondAllocation) || 0);
  const cashlike = Math.round(Number(inputs.cashlikeAllocation) || 0);
  const cash = 100 - equity - bond - cashlike;

  return {
    ...inputs,
    equityAllocation: equity,
    bondAllocation: bond,
    cashlikeAllocation: cashlike,
    cashAllocation: cash
  };
}

function runSimulation() {
  console.log('runSimulation start');

  try {
    const inputs = gatherInputs();
    console.log('runSimulation gathered inputs', inputs);

    const mergedInputs = normaliseAllocationInputsForSimulation({
      ...DEFAULT_INPUTS,
      ...sanitiseInputs(latestBaseInputs || gatherInputs())
    });
    console.log('runSimulation mergedInputs', mergedInputs);

    const errors = validateInputs(mergedInputs);
    console.log('runSimulation validation errors JSON', JSON.stringify(errors, null, 2));
    console.log('runSimulation mergedInputs JSON', JSON.stringify(mergedInputs, null, 2));
    
    if (errors.length > 0) {
      console.error('Validation failed');
      errors.forEach((error, index) => {
        console.error(`Error ${index + 1}:`, error);
      });
      console.log('Merged inputs snapshot:', mergedInputs);
    
      showError(errors.join(' '));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (errors.length > 0) {
      showError(errors.join(' '));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    hideError();
    latestBaseInputs = mergedInputs;
    currentTableView = 'median';
    currentTableMode = 'plan';
    planForm.setBusy(true);

    const effectiveInputs = getResultsOverrideInputs(mergedInputs);
    console.log('runSimulation effectiveInputs', effectiveInputs);

    if (worker) {
      console.log('posting to worker', { type: 'run', inputs: effectiveInputs });
      worker.postMessage({ type: 'run', inputs: effectiveInputs });
      console.log('posted to worker');
      return;
    }

    console.log('no worker, using main thread fallback');

    Promise.resolve(
      runSimulationByMode({
        mode: effectiveInputs.simulationMode || 'monteCarlo',
        inputs: effectiveInputs
      })
    )
      .then((result) => {
        latestResult = result;
        planForm.setBusy(false);
        showResults();
      })
      .catch((error) => {
        console.error('runSimulation async error', error);
        planForm.setBusy(false);
        showError(error instanceof Error ? error.message : 'Simulation failed.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  } catch (error) {
    console.error('runSimulation crashed', error);
    planForm.setBusy(false);
    showError(error instanceof Error ? error.message : 'Simulation failed.');
  }
}

function rerunResultsWithCurrentOptions() {
  if (!latestBaseInputs) return;

  const effectiveInputs = getResultsOverrideInputs(
    normaliseAllocationInputsForSimulation(latestBaseInputs)
  );
  const errors = validateInputs(effectiveInputs);

  if (errors.length > 0) {
    showError(errors.join(' '));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  hideError();

  if (worker) {
    console.log('posting to worker', { type: 'run', inputs: effectiveInputs });
    worker.postMessage({ type: 'run', inputs: effectiveInputs });
    console.log('posted to worker');
    return;
  }

  console.log('no worker, using main-thread fallback');

  try {
    Promise.resolve(
      runSimulationByMode({
        mode: effectiveInputs.simulationMode || 'monteCarlo',
        inputs: effectiveInputs
      })
    )
      .then((result) => {
        latestResult = result;
        renderAll();
      })
      .catch((error) => {
        showError(error instanceof Error ? error.message : 'Simulation failed.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Simulation failed.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function showResults() {
  setResultsViewDefaults();
  tabs.setActiveTab('results');

  requestAnimationFrame(() => {
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function renderAll() {
  if (!latestResult) return;

  try {
    console.log('renderAll start', latestResult);

    renderResultsView({
      result: latestResult,
      elements: els,
      useReal: els.chartModeReal?.checked !== false,
      showFullTable: Boolean(els.showFullTable?.checked),
      tableView: currentTableView,
      tableMode: currentTableMode,
      formatters: {
        formatCurrency,
        formatPercent,
        formatYears
      }
    });
    console.log('renderResultsView done');

    applySuccessRateTone(latestResult.monteCarlo?.successRate ?? null);
    console.log('applySuccessRateTone done');

    attachTableModeSelector();
    console.log('attachTableModeSelector done');

    attachTableViewSelector();
    console.log('attachTableViewSelector done');

    togglePlanOutlook();
    console.log('togglePlanOutlook done');
  } catch (error) {
    console.error('renderAll failed', error);
    showError(error instanceof Error ? error.message : 'Results rendering failed.');
  }
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

  els.errorBox.textContent = message;
  els.errorBox.classList.remove('hidden');
}

function hideError() {
  if (!els.errorBox) return;

  els.errorBox.textContent = '';
  els.errorBox.classList.add('hidden');
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

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalisePortfolioValue(value) {
  const parsed = parseLooseNumber(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function normalisePortfolioPercent(value) {
  const parsed = parseLooseNumber(value);
  if (!Number.isFinite(parsed)) return 0;
  return clampNumber(Math.round(parsed), 0, 100);
}

function getActivePortfolioAccounts() {
  if (portfolioConfig.hasPerson2) {
    return portfolioAccounts;
  }

  return portfolioAccounts.filter((account) => account.owner !== 'Person 2');
}

function getPortfolioRowIssues(account) {
  const issues = [];

  const value = Number(account?.value);
  const allocationTotal = getPortfolioRowAllocationTotal(account);

  if (!Number.isFinite(value) || value < 0) {
    issues.push('Value must be £0 or more');
  }

  if (allocationTotal !== 100) {
    if (allocationTotal < 100) {
      issues.push(`Allocate ${100 - allocationTotal}% more`);
    } else {
      issues.push(`Reduce allocation by ${allocationTotal - 100}%`);
    }
  }

  return issues;
}

function getPortfolioValidationState() {
  const activeAccounts = getActivePortfolioAccounts();

  if (!activeAccounts.length) {
    return {
      isReady: false,
      issueCount: 1,
      message: 'Add at least one account'
    };
  }

  let issueCount = 0;

  activeAccounts.forEach((account) => {
    issueCount += getPortfolioRowIssues(account).length;
  });

  if (issueCount === 0) {
    return {
      isReady: true,
      issueCount: 0,
      message: 'Portfolio ready'
    };
  }

  return {
    isReady: false,
    issueCount,
    message: `Fix ${issueCount} issue${issueCount === 1 ? '' : 's'}`
  };
}

function updatePortfolioValidationUI() {
  const statusEl = els.portfolioValidationStatus;
  const continueBtn = els.continueToAssumptionsBtn;
  const state = getPortfolioValidationState();

  if (statusEl) {
    statusEl.textContent = state.message;
    statusEl.classList.toggle('is-valid', state.isReady);
    statusEl.classList.toggle('is-invalid', !state.isReady);
  }

  if (continueBtn) {
    continueBtn.disabled = !state.isReady;
    continueBtn.setAttribute('aria-disabled', String(!state.isReady));
  }
}

function stepPortfolioAccount(id, field, direction, stepSize) {
  const account = portfolioAccounts.find((item) => item.id === id);
  if (!account) return;

  const step = Number(stepSize) || 1;
  const delta = direction * step;

  if (field === 'value') {
    const nextValue = (Number(account.value) || 0) + delta;
    updatePortfolioAccount(id, field, Math.max(0, nextValue));
    return;
  }

  if (field.startsWith('allocation.')) {
    const key = field.split('.')[1];
    const currentValue = Number(account.allocation?.[key]) || 0;
    const nextValue = clampNumber(currentValue + delta, 0, 100);
    updatePortfolioAccount(id, field, nextValue);
  }
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

function attachTableModeSelector() {
  const selector = els.tableModeSelector;
  if (!selector) return;

  selector.querySelectorAll('button[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextMode = button.dataset.mode;

      if (!nextMode || nextMode === currentTableMode) return;

      currentTableMode = nextMode;
      renderAll();
    });
  });
}

function attachTableViewSelector() {
  const selectorContainers = document.querySelectorAll('.table-view-selector');

  if (!selectorContainers.length) return;

  selectorContainers.forEach((container) => {
    if (container.dataset.bound === 'true') return;

    container.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-view]');
      if (!button) return;

      const nextView = button.dataset.view;
      if (!nextView || nextView === currentTableView) return;

      currentTableView = nextView;
      renderAll();
    });

    container.dataset.bound = 'true';
  });
}

function togglePlanOutlook() {
  if (!els.planSummaryPanel) return;

  const show = Boolean(els.showPlanOutlook?.checked);

  els.planSummaryPanel.style.display = show ? '' : 'none';
}

function debounce(fn, delay) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  };
}

function addPortfolioAccount() {
  portfolioAccounts.push({
    id: Date.now(),
    isPlaceholder: true,
    name: '',
    wrapper: 'ISA',
    owner: 'Person 1',
    value: 0,
    allocation: {
      equities: 60,
      bonds: 30,
      cashlike: 10,
      cash: 0
    }
  });

  renderPortfolioTable();
}

function updatePortfolioAccount(id, field, value) {
  const account = portfolioAccounts.find((item) => item.id === id);
  if (!account) return;
    
  account.isPlaceholder = false;  

  if (field.startsWith('allocation.')) {
    const key = field.split('.')[1];
    account.allocation[key] = normalisePortfolioPercent(value);
  } else if (field === 'value') {
    account.value = normalisePortfolioValue(value);
  } else {
    account[field] = value;
  }

  savePortfolioToStorage();
  renderPortfolioTable();
}

function removePortfolioAccount(id) {
  portfolioAccounts = portfolioAccounts.filter((item) => item.id !== id);
  savePortfolioToStorage();
  renderPortfolioTable();
}

function getPortfolioRowAllocationTotal(account) {
  return (
    (Number(account.allocation?.equities) || 0) +
    (Number(account.allocation?.bonds) || 0) +
    (Number(account.allocation?.cashlike) || 0) +
    (Number(account.allocation?.cash) || 0)
  );
}

function isPortfolioRowValid(account) {
  const value = Number(account.value);
  const allocationTotal = getPortfolioRowAllocationTotal(account);

  return Number.isFinite(value) && value >= 0 && allocationTotal === 100;
}

function calculatePortfolioTotals(portfolioAccounts) {
  const activeAccounts = portfolioAccounts.filter((account) => !account.isPlaceholder);

  const totals = {
    totalValue: 0,
    allocations: {
      equities: 0,
      bonds: 0,
      cashlike: 0,
      cash: 0
    },
    wrappers: {
      ISA: 0,
      SIPP: 0,
      GIA: 0,
      Cash: 0,
      QMMF: 0
    }
  };

  let weightedEquities = 0;
  let weightedBonds = 0;
  let weightedCashlike = 0;
  let weightedCash = 0;

  activeAccounts.forEach((account) => {
    const value = Number(account.value) || 0;

    totals.totalValue += value;

    if (Object.prototype.hasOwnProperty.call(totals.wrappers, account.wrapper)) {
      totals.wrappers[account.wrapper] += value;
    }

    weightedEquities += value * ((Number(account.allocation?.equities) || 0) / 100);
    weightedBonds += value * ((Number(account.allocation?.bonds) || 0) / 100);
    weightedCashlike += value * ((Number(account.allocation?.cashlike) || 0) / 100);
    weightedCash += value * ((Number(account.allocation?.cash) || 0) / 100);
  });

  if (totals.totalValue > 0) {
    totals.allocations.equities = (weightedEquities / totals.totalValue) * 100;
    totals.allocations.bonds = (weightedBonds / totals.totalValue) * 100;
    totals.allocations.cashlike = (weightedCashlike / totals.totalValue) * 100;
    totals.allocations.cash = (weightedCash / totals.totalValue) * 100;
  }

  return totals;
}

function mapPortfolioToInputs(totals) {
  const hasPerson2 = Boolean(portfolioConfig.hasPerson2);

  const safeTotal = Number(totals?.totalValue) || 0;

  return {
    years: 30,

    initialPortfolio: safeTotal,

    initialWithdrawalRate: 4,

    initialSpending: safeTotal * 0.04,
    comfortSpending: safeTotal * 0.04 * 0.9,
    minimumSpending: safeTotal * 0.04 * 0.75,

    annualFeeRate: 0.27, // percentage points — must match DEFAULT_INPUTS convention; normaliseInputs converts to decimal

    equityAllocation: Number(totals?.allocations?.equities) || 0,
    bondAllocation: Number(totals?.allocations?.bonds) || 0,
    cashlikeAllocation: Number(totals?.allocations?.cashlike) || 0,
    cashAllocation: Number(totals?.allocations?.cash) || 0,

    rebalanceToTarget: true,

    equityReturn: DEFAULT_INPUTS.equityReturn,
    equityVolatility: DEFAULT_INPUTS.equityVolatility,
    bondReturn: DEFAULT_INPUTS.bondReturn,
    bondVolatility: DEFAULT_INPUTS.bondVolatility,
    cashlikeReturn: DEFAULT_INPUTS.cashlikeReturn,
    cashlikeVolatility: DEFAULT_INPUTS.cashlikeVolatility,
    inflation: DEFAULT_INPUTS.inflation,

    person1Name: String(portfolioPeople.person1Name || ''),
    person1Age: Number(portfolioPeople.person1Age) || 50,
    person1PensionAge: 67,

    person2Name: String(portfolioPeople.person2Name || ''),
    person2Age: Number(portfolioPeople.person2Age) || 50,
    person2PensionAge: 67,

    includePerson2: hasPerson2,

    statePensionToday: 12547,

    person1GetsFullPension: true,
    person2GetsFullPension: true,

    person1OtherIncomeToday: 0,
    person1OtherIncomeYears: 0,
    person1WindfallAmount: 0,
    person1WindfallYear: 0,

    person2OtherIncomeToday: 0,
    person2OtherIncomeYears: 0,
    person2WindfallAmount: 0,
    person2WindfallYear: 0,

    upperGuardrail: 20,
    maxSpendingNominal: 0,
    lowerGuardrail: 20,
    adjustmentSize: 10,

    simulationMode: 'monteCarlo',
    monteCarloRuns: 10000,

    skipInflationAfterNegative: false
  };
}

function applyPortfolioInputsToAssumptions(inputs) {
  if (!inputs || typeof inputs !== 'object') return;

  planForm.applyDefaults(inputs);
  advancedForm.applyDefaults(inputs);

  if (els.years) {
    els.years.value = String(Number(inputs.years) || '');
  }

  if (els.initialPortfolio) {
    els.initialPortfolio.value = formatInteger(
      Math.round(Number(inputs.initialPortfolio) || 0)
    );
  }

  if (els.initialWithdrawalRate) {
    const nextRate = Number(inputs.initialWithdrawalRate);

    if (Number.isFinite(nextRate)) {
      els.initialWithdrawalRate.value = formatRate(nextRate);
    } else if (!String(els.initialWithdrawalRate.value || '').trim()) {
      els.initialWithdrawalRate.value = '4';
    }
  }

  if (els.initialSpending) {
    els.initialSpending.value = Number.isFinite(Number(inputs.initialSpending))
      ? formatInteger(Math.round(Number(inputs.initialSpending)))
      : '';
  }

  if (els.comfortSpending) {
    els.comfortSpending.value = Number.isFinite(Number(inputs.comfortSpending))
      ? formatInteger(Math.round(Number(inputs.comfortSpending)))
      : '';
  }

  if (els.minimumSpending) {
    els.minimumSpending.value = Number.isFinite(Number(inputs.minimumSpending))
      ? formatInteger(Math.round(Number(inputs.minimumSpending)))
      : '';
  }

  if (els.annualFeeRate) {
    els.annualFeeRate.value = Number.isFinite(Number(inputs.annualFeeRate))
      ? String(inputs.annualFeeRate)
      : '';
  }

  if (els.equityAllocation) {
  els.equityAllocation.value = formatOneDecimal(inputs.equityAllocation);
  }

  if (els.bondAllocation) {
    els.bondAllocation.value = formatOneDecimal(inputs.bondAllocation);
  }

  if (els.cashlikeAllocation) {
    els.cashlikeAllocation.value = formatOneDecimal(inputs.cashlikeAllocation);
  }

  if (els.cashAllocation) {
    els.cashAllocation.value = formatOneDecimal(inputs.cashAllocation);
  }

  if (els.rebalanceToTarget) {
    els.rebalanceToTarget.checked = Boolean(inputs.rebalanceToTarget);
  }

  if (els.equityReturn) {
    els.equityReturn.value = Number.isFinite(Number(inputs.equityReturn))
      ? String(inputs.equityReturn)
      : '';
  }

  if (els.equityVolatility) {
    els.equityVolatility.value = Number.isFinite(Number(inputs.equityVolatility))
      ? String(inputs.equityVolatility)
      : '';
  }

  if (els.bondReturn) {
    els.bondReturn.value = Number.isFinite(Number(inputs.bondReturn))
      ? String(inputs.bondReturn)
      : '';
  }

  if (els.bondVolatility) {
    els.bondVolatility.value = Number.isFinite(Number(inputs.bondVolatility))
      ? String(inputs.bondVolatility)
      : '';
  }

  if (els.cashlikeReturn) {
    els.cashlikeReturn.value = Number.isFinite(Number(inputs.cashlikeReturn))
      ? String(inputs.cashlikeReturn)
      : '';
  }

  if (els.cashlikeVolatility) {
    els.cashlikeVolatility.value = Number.isFinite(Number(inputs.cashlikeVolatility))
      ? String(inputs.cashlikeVolatility)
      : '';
  }

  if (els.inflation) {
    els.inflation.value = Number.isFinite(Number(inputs.inflation))
      ? String(inputs.inflation)
      : '';
  }

  if (els.person1Name) {
    els.person1Name.value = String(inputs.person1Name || '');
  }

  if (els.person2Name) {
    els.person2Name.value = String(inputs.person2Name || '');
  }

  if (els.person1Age) {
    els.person1Age.value = String(Number(inputs.person1Age) || 55);
    els.person1Age.readOnly = true;
  }

  if (els.person1PensionAge) {
    els.person1PensionAge.value = String(Number(inputs.person1PensionAge) || 67);
  }

  if (els.person2Age) {
    els.person2Age.value = String(Number(inputs.person2Age) || 55);
    els.person2Age.readOnly = true;
  }

  if (els.person2PensionAge) {
    els.person2PensionAge.value = String(Number(inputs.person2PensionAge) || 67);
  }

  if (els.includePerson2) {
    els.includePerson2.checked = Boolean(inputs.includePerson2);
    els.includePerson2.disabled = true;
  }

  applyPerson2PortfolioRules();

  if (els.statePensionToday) {
    els.statePensionToday.value = Number.isFinite(Number(inputs.statePensionToday))
      ? formatInteger(Math.round(Number(inputs.statePensionToday)))
      : '';
  }

  if (els.person1GetsFullPension) {
    els.person1GetsFullPension.checked = Boolean(inputs.person1GetsFullPension);
  }

  if (els.person1OtherIncomeToday) {
    els.person1OtherIncomeToday.value = Number.isFinite(Number(inputs.person1OtherIncomeToday))
      ? formatInteger(Math.round(Number(inputs.person1OtherIncomeToday)))
      : '';
  }

  if (els.person1OtherIncomeYears) {
    els.person1OtherIncomeYears.value = Number.isFinite(Number(inputs.person1OtherIncomeYears))
      ? String(inputs.person1OtherIncomeYears)
      : '';
  }

  if (els.person1WindfallAmount) {
    els.person1WindfallAmount.value = Number.isFinite(Number(inputs.person1WindfallAmount))
      ? formatInteger(Math.round(Number(inputs.person1WindfallAmount)))
      : '';
  }

  if (els.person1WindfallYear) {
    els.person1WindfallYear.value = Number.isFinite(Number(inputs.person1WindfallYear))
      ? String(inputs.person1WindfallYear)
      : '';
  }

  if (els.person2GetsFullPension) {
    els.person2GetsFullPension.checked = Boolean(inputs.person2GetsFullPension);
  }

  if (els.person2OtherIncomeToday) {
    els.person2OtherIncomeToday.value = Number.isFinite(Number(inputs.person2OtherIncomeToday))
      ? formatInteger(Math.round(Number(inputs.person2OtherIncomeToday)))
      : '';
  }

  if (els.person2OtherIncomeYears) {
    els.person2OtherIncomeYears.value = Number.isFinite(Number(inputs.person2OtherIncomeYears))
      ? String(inputs.person2OtherIncomeYears)
      : '';
  }

  if (els.person2WindfallAmount) {
    els.person2WindfallAmount.value = Number.isFinite(Number(inputs.person2WindfallAmount))
      ? formatInteger(Math.round(Number(inputs.person2WindfallAmount)))
      : '';
  }

  if (els.person2WindfallYear) {
    els.person2WindfallYear.value = Number.isFinite(Number(inputs.person2WindfallYear))
      ? String(inputs.person2WindfallYear)
      : '';
  }

  if (els.upperGuardrail) {
    els.upperGuardrail.value = Number.isFinite(Number(inputs.upperGuardrail))
      ? String(inputs.upperGuardrail)
      : '';
  }

  if (els.lowerGuardrail) {
    els.lowerGuardrail.value = Number.isFinite(Number(inputs.lowerGuardrail))
      ? String(inputs.lowerGuardrail)
      : '';
  }

  if (els.adjustmentSize) {
    els.adjustmentSize.value = Number.isFinite(Number(inputs.adjustmentSize))
      ? String(inputs.adjustmentSize)
      : '';
  }

  if (els.maxSpendingNominal) {
    els.maxSpendingNominal.value = Number.isFinite(Number(inputs.maxSpendingNominal)) && inputs.maxSpendingNominal > 0
      ? Math.round(Number(inputs.maxSpendingNominal)).toLocaleString('en-GB')
      : '';
  }

  if (els.simulationMode && inputs.simulationMode != null) {
    els.simulationMode.value = String(inputs.simulationMode);
  }

  if (els.monteCarloRuns) {
      els.monteCarloRuns.value = Number.isFinite(Number(inputs.monteCarloRuns))
        ? formatInteger(Math.round(Number(inputs.monteCarloRuns)))
        : '';
    }

  if (els.skipInflationAfterNegative) {
    els.skipInflationAfterNegative.checked = Boolean(inputs.skipInflationAfterNegative);
  }

  updateAllocationStatus();

  if (withdrawalInputMode === 'rate') {
    syncInitialSpendingFromRate();
  } else {
    syncInitialWithdrawalRateFromAmount();
  }

  if (typeof planForm.syncDefaultSpendingFloors === 'function') {
    planForm.syncDefaultSpendingFloors();
  }
}
    
function clearPortfolioInputsFromAssumptions() {
  if (els.initialPortfolio) {
    els.initialPortfolio.value = '';
  }

  if (els.equityAllocation) els.equityAllocation.value = '';
  if (els.bondAllocation) els.bondAllocation.value = '';
  if (els.cashlikeAllocation) els.cashlikeAllocation.value = '';
  if (els.cashAllocation) els.cashAllocation.value = '';

  if (els.person1Name) {
    els.person1Name.value = '';
  }

  if (els.person2Name) {
    els.person2Name.value = '';
  }

  if (els.person1Age) {
    els.person1Age.value = '';
    els.person1Age.readOnly = true;
  }

  if (els.person2Age) {
    els.person2Age.value = '';
    els.person2Age.readOnly = true;
  }

  if (els.includePerson2) {
    els.includePerson2.checked = Boolean(portfolioConfig.hasPerson2);
    els.includePerson2.disabled = true;
  }

  if (els.person2Panel) {
    els.person2Panel.style.display = portfolioConfig.hasPerson2 ? '' : 'none';
  }

  updateAllocationStatus();
  hideError();
}

function updatePortfolioSummaryCards() {
  const activeAccounts = getActivePortfolioAccounts();
  const totals = calculatePortfolioTotals(activeAccounts);

  const investmentValueEl = document.getElementById('portfolioTotalValue');
  const allocationEl = document.getElementById('portfolioAllocationTotals');
  const wrappersEl = document.getElementById('portfolioWrapperTotals');

  if (investmentValueEl) {
    investmentValueEl.textContent = formatCurrency(totals.totalValue);
  }

  if (allocationEl) {
    const allocationTotal =
      totals.allocations.equities +
      totals.allocations.bonds +
      totals.allocations.cashlike +
      totals.allocations.cash;

    const roundedAllocationTotal = Number(allocationTotal.toFixed(1));
    const isBalanced = roundedAllocationTotal === 100;

    const allocationState = isBalanced
      ? 'Balanced'
      : roundedAllocationTotal < 100
        ? `${(100 - roundedAllocationTotal).toFixed(1)}% under`
        : `${(roundedAllocationTotal - 100).toFixed(1)}% over`;

    const allocationStateClass = isBalanced
      ? 'is-balanced'
      : 'is-off';

    allocationEl.innerHTML = `
      <div><span>Equities</span><span class="value">${totals.allocations.equities.toFixed(1)}%</span></div>
      <div><span>Bonds</span><span class="value">${totals.allocations.bonds.toFixed(1)}%</span></div>
      <div><span>Cashlike</span><span class="value">${totals.allocations.cashlike.toFixed(1)}%</span></div>
      <div><span>Cash</span><span class="value">${totals.allocations.cash.toFixed(1)}%</span></div>
      <div class="portfolio-summary-total-row ${allocationStateClass}">
        <span>Total allocation</span>
        <span class="value">${roundedAllocationTotal.toFixed(1)}% ${allocationState}</span>
      </div>
    `;
  }

  if (wrappersEl) {
    wrappersEl.innerHTML = `
      <div><span>ISA</span><span class="value">${formatCurrency(totals.wrappers.ISA)}</span></div>
      <div><span>SIPP</span><span class="value">${formatCurrency(totals.wrappers.SIPP)}</span></div>
      <div><span>GIA</span><span class="value">${formatCurrency(totals.wrappers.GIA)}</span></div>
      <div><span>Cash</span><span class="value">${formatCurrency(totals.wrappers.Cash)}</span></div>
      <div><span>QMMF</span><span class="value">${formatCurrency(totals.wrappers.QMMF)}</span></div>
    `;
  }
}

function getPortfolioOwnerLabel(owner) {
  if (owner === 'Person 1') {
    return (portfolioPeople.person1Name || '').trim() || 'Person 1';
  }

  if (owner === 'Person 2') {
    return (portfolioPeople.person2Name || '').trim() || 'Person 2';
  }

  return owner;
}

function renderPortfolioTable() {
  const tbody = document.getElementById('portfolioTableBody');
  if (!tbody) return;

  const activeAccounts = getActivePortfolioAccounts();

  if (activeAccounts.length === 0) {
    tbody.innerHTML = `
      <tr class="portfolio-row-empty">
        <td colspan="10">No accounts added yet.</td>
      </tr>
    `;
    updatePortfolioSummaryCards();
    updatePortfolioValidationUI();
    return;
  }

  tbody.innerHTML = '';

  activeAccounts.forEach((account) => {
    const row = document.createElement('tr');
    const allocationTotal = getPortfolioRowAllocationTotal(account);
    const rowIssues = getPortfolioRowIssues(account);
    const isValid = rowIssues.length === 0;

    row.className = `portfolio-row ${isValid ? '' : 'portfolio-row-invalid'}`;

    row.innerHTML = `
      <td>
        <input
          type="text"
          value="${account.name || ''}"
          placeholder="Enter account name"
          data-id="${account.id}"
          data-field="name"
        />
      </td>

      <td>
        <select data-id="${account.id}" data-field="wrapper">
          <option value="ISA" ${account.wrapper === 'ISA' ? 'selected' : ''}>ISA</option>
          <option value="SIPP" ${account.wrapper === 'SIPP' ? 'selected' : ''}>SIPP</option>
          <option value="GIA" ${account.wrapper === 'GIA' ? 'selected' : ''}>GIA</option>
          <option value="Cash" ${account.wrapper === 'Cash' ? 'selected' : ''}>Cash</option>
          <option value="QMMF" ${account.wrapper === 'QMMF' ? 'selected' : ''}>QMMF</option>
        </select>
      </td>

      <td>
        <select data-id="${account.id}" data-field="owner">
          <option value="Person 1" ${account.owner === 'Person 1' ? 'selected' : ''}>${getPortfolioOwnerLabel('Person 1')}</option>
          ${portfolioConfig.hasPerson2 ? `
            <option value="Person 2" ${account.owner === 'Person 2' ? 'selected' : ''}>${getPortfolioOwnerLabel('Person 2')}</option>
          ` : ''}
          <option value="Joint" ${account.owner === 'Joint' ? 'selected' : ''}>Joint</option>
        </select>
      </td>

      <td>
        <div class="stepper-input stepper-input--table">
          <button
            type="button"
            class="stepper-btn"
            data-action="portfolio-step"
            data-id="${account.id}"
            data-field="value"
            data-step-direction="-1"
            data-step-size="5000"
            aria-label="Decrease value by £5,000"
          >−</button>
          <input
            type="text"
            value="${formatInteger(account.value)}"
            data-id="${account.id}"
            data-field="value"
            inputmode="numeric"
          />
          <button
            type="button"
            class="stepper-btn"
            data-action="portfolio-step"
            data-id="${account.id}"
            data-field="value"
            data-step-direction="1"
            data-step-size="5000"
            aria-label="Increase value by £5,000"
          >+</button>
        </div>
      </td>

      <td>
        <div class="stepper-input stepper-input--table">
          <button
            type="button"
            class="stepper-btn"
            data-action="portfolio-step"
            data-id="${account.id}"
            data-field="allocation.equities"
            data-step-direction="-1"
            data-step-size="1"
            aria-label="Decrease equity allocation by 1%"
          >−</button>
          <input
            type="number"
            value="${account.allocation.equities}"
            data-id="${account.id}"
            data-field="allocation.equities"
            min="0"
            max="100"
            step="1"
          />
          <button
            type="button"
            class="stepper-btn"
            data-action="portfolio-step"
            data-id="${account.id}"
            data-field="allocation.equities"
            data-step-direction="1"
            data-step-size="1"
            aria-label="Increase equity allocation by 1%"
          >+</button>
        </div>
      </td>

      <td>
        <div class="stepper-input stepper-input--table">
          <button
            type="button"
            class="stepper-btn"
            data-action="portfolio-step"
            data-id="${account.id}"
            data-field="allocation.bonds"
            data-step-direction="-1"
            data-step-size="1"
            aria-label="Decrease bond allocation by 1%"
          >−</button>
          <input
            type="number"
            value="${account.allocation.bonds}"
            data-id="${account.id}"
            data-field="allocation.bonds"
            min="0"
            max="100"
            step="1"
          />
          <button
            type="button"
            class="stepper-btn"
            data-action="portfolio-step"
            data-id="${account.id}"
            data-field="allocation.bonds"
            data-step-direction="1"
            data-step-size="1"
            aria-label="Increase bond allocation by 1%"
          >+</button>
        </div>
      </td>

      <td>
        <div class="stepper-input stepper-input--table">
          <button
            type="button"
            class="stepper-btn"
            data-action="portfolio-step"
            data-id="${account.id}"
            data-field="allocation.cashlike"
            data-step-direction="-1"
            data-step-size="1"
            aria-label="Decrease cashlike allocation by 1%"
          >−</button>
          <input
            type="number"
            value="${account.allocation.cashlike}"
            data-id="${account.id}"
            data-field="allocation.cashlike"
            min="0"
            max="100"
            step="1"
          />
          <button
            type="button"
            class="stepper-btn"
            data-action="portfolio-step"
            data-id="${account.id}"
            data-field="allocation.cashlike"
            data-step-direction="1"
            data-step-size="1"
            aria-label="Increase cashlike allocation by 1%"
          >+</button>
        </div>
      </td>

      <td>
        <div class="stepper-input stepper-input--table">
          <button
            type="button"
            class="stepper-btn"
            data-action="portfolio-step"
            data-id="${account.id}"
            data-field="allocation.cash"
            data-step-direction="-1"
            data-step-size="1"
            aria-label="Decrease cash allocation by 1%"
          >−</button>
          <input
            type="number"
            value="${account.allocation.cash}"
            data-id="${account.id}"
            data-field="allocation.cash"
            min="0"
            max="100"
            step="1"
          />
          <button
            type="button"
            class="stepper-btn"
            data-action="portfolio-step"
            data-id="${account.id}"
            data-field="allocation.cash"
            data-step-direction="1"
            data-step-size="1"
            aria-label="Increase cash allocation by 1%"
          >+</button>
        </div>
      </td>

      <td class="${isValid ? 'portfolio-total-cell' : 'portfolio-total-cell portfolio-total-cell-invalid'}">
        <div class="portfolio-total-cell__value">${allocationTotal}%</div>
        ${rowIssues.length ? `
          <div class="portfolio-row-error">${rowIssues.join(' · ')}</div>
        ` : `
          <div class="portfolio-row-ok">Ready</div>
        `}
      </td>

      <td>
        <button type="button" class="btn btn-secondary" data-action="delete" data-id="${account.id}">
          Remove
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  attachPortfolioTableRowEvents();
  updatePortfolioSummaryCards();
  updatePortfolioValidationUI();
}

function applyPerson2PortfolioRules() {
  const hasPerson2 = Boolean(portfolioConfig.hasPerson2);

  if (els.portfolioHasPerson2) {
    els.portfolioHasPerson2.checked = hasPerson2;
  }

  if (els.includePerson2) {
    els.includePerson2.checked = hasPerson2;
    els.includePerson2.disabled = true;
  }

  if (els.person2Panel) {
    els.person2Panel.setAttribute('aria-disabled', String(!hasPerson2));
    els.person2Panel.style.display = '';
    els.person2Panel.style.opacity = hasPerson2 ? '1' : '0.5';
  }

  [
    els.person2Name,
    els.person2Age,
    els.person2PensionAge,
    els.person2GetsFullPension,
    els.person2OtherIncomeToday,
    els.person2OtherIncomeYears,
    els.person2WindfallAmount,
    els.person2WindfallYear
  ].forEach((field) => {
    if (!field) return;
    field.disabled = !hasPerson2;
  });

  [
  els.portfolioPerson2Name,
  els.portfolioPerson2Age
  ].forEach((field) => {
    if (!field) return;
    field.disabled = !hasPerson2;
    field.style.opacity = hasPerson2 ? '1' : '0.5';
  });

  const portfolioPerson2Blocks = [
    els.portfolioPerson2Name?.closest('.portfolio-person-block'),
    els.portfolioPerson2Age?.closest('.portfolio-person-block')
  ].filter(Boolean);

  [...new Set(portfolioPerson2Blocks)].forEach((block) => {
    block.style.opacity = hasPerson2 ? '1' : '0.5';
    block.setAttribute('aria-disabled', String(!hasPerson2));
  });

  updatePortfolioValidationUI();
}

function attachPortfolioTableRowEvents() {
  const tbody = document.getElementById('portfolioTableBody');
  if (!tbody) return;

  const inputs = tbody.querySelectorAll('input');
  const selects = tbody.querySelectorAll('select');
  const deleteButtons = tbody.querySelectorAll('button[data-action="delete"]');
  const stepButtons = tbody.querySelectorAll('button[data-action="portfolio-step"]');

  inputs.forEach((input) => {
    input.addEventListener('focus', () => {
      const field = input.dataset.field;

      if (!field || field === 'name') return;

      input.dataset.previousValue = input.value;
      input.value = '';
    });

    input.addEventListener('input', () => {
      const field = input.dataset.field;
      if (!field) return;
    });

    input.addEventListener('blur', () => {
      const id = Number(input.dataset.id);
      const field = input.dataset.field;
      const rawValue = input.value.trim();
      const previousValue = input.dataset.previousValue ?? '';

      if (!field) return;

      if (field === 'name') {
        updatePortfolioAccount(id, field, rawValue);
        return;
      }

      if (field === 'value') {
        const nextValue = rawValue === '' ? previousValue : rawValue;
        input.value = nextValue;
        updatePortfolioAccount(id, field, nextValue);
        return;
      }

      if (field.startsWith('allocation.')) {
        const nextValue = rawValue === '' ? previousValue : rawValue;
        input.value = nextValue;
        updatePortfolioAccount(id, field, normalisePortfolioPercent(nextValue));
      }
    });

    input.addEventListener('change', () => {
      const id = Number(input.dataset.id);
      const field = input.dataset.field;
      const rawValue = input.value.trim();
      const previousValue = input.dataset.previousValue ?? '';

      if (!field) return;

      if (field === 'name') {
        updatePortfolioAccount(id, field, rawValue);
        return;
      }

      if (field === 'value') {
        const nextValue = rawValue === '' ? previousValue : rawValue;
        input.value = nextValue;
        updatePortfolioAccount(id, field, nextValue);
        return;
      }

      if (field.startsWith('allocation.')) {
        const nextValue = rawValue === '' ? previousValue : rawValue;
        input.value = nextValue;
        updatePortfolioAccount(id, field, normalisePortfolioPercent(nextValue));
      }
    });
  });

  selects.forEach((select) => {
    select.addEventListener('change', (e) => {
      const id = Number(e.target.dataset.id);
      const field = e.target.dataset.field;
      updatePortfolioAccount(id, field, e.target.value);
    });
  });

  deleteButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      removePortfolioAccount(Number(e.currentTarget.dataset.id));
    });
  });

  stepButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const field = e.currentTarget.dataset.field;
      const direction = Number(e.currentTarget.dataset.stepDirection);
      const stepSize = Number(e.currentTarget.dataset.stepSize);

      stepPortfolioAccount(id, field, direction, stepSize);
    });
  });
}
