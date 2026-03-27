import { DEFAULT_INPUTS, validateInputs } from './model/simulator.js';
import { runSimulationByMode } from './model/run-simulation-by-mode.js';
import { initialiseTabs } from './ui/tabs.js';
import { renderResultsView } from './ui/results-view.js';
import { createPlanForm } from './ui/plan-form.js';
import { createAdvancedForm } from './ui/advanced-form.js';

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
  runSimulationBtn: document.getElementById('runSimulationBtn'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
  errorBox: document.getElementById('errorBox'),

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
  resultsTabButton: document.querySelector('[data-tab-button="results"]')
};

let latestResult = null;
let latestBaseInputs = null;
let worker = null;
let withdrawalInputMode = 'amount';
let currentTableView = 'median';
let currentTableMode = 'plan';
let portfolioAccounts = [];
let portfolioConfig = {
  hasPerson2: true
};
let portfolioPeople = {
  person1Name: '',
  person2Name: ''
};

const PORTFOLIO_STORAGE_KEY = 'retirement_portfolio_accounts_v1';
const PORTFOLIO_CONFIG_STORAGE_KEY = 'retirement_portfolio_config_v1';
const PORTFOLIO_PEOPLE_STORAGE_KEY = 'retirement_portfolio_people_v1';


function savePortfolioToStorage() {
  localStorage.setItem(
    PORTFOLIO_STORAGE_KEY,
    JSON.stringify(portfolioAccounts)
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

function loadPortfolioPeopleFromStorage() {
  const saved = localStorage.getItem(PORTFOLIO_PEOPLE_STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    if (parsed && typeof parsed === 'object') {
      portfolioPeople = {
        person1Name: String(parsed.person1Name || ''),
        person2Name: String(parsed.person2Name || '')
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
}

function initialise() {
  setupWorker();
  applyDefaults();
  loadPortfolioFromStorage();
  loadPortfolioConfigFromStorage();
  loadPortfolioPeopleFromStorage();  
  attachEvents();
  setResultsViewDefaults();
  syncInitialWithdrawalRateFromAmount();
  updateAllocationStatus();
  renderPortfolioPeopleFields();
  renderPortfolioTable();
  applyPerson2PortfolioRules();
  document.body.classList.add('is-portfolio');
  tabs.setActiveTab('portfolio');
}

function resetResultsHeader() {
  if (els.summarySuccessRateLabel) {
    els.summarySuccessRateLabel.textContent = 'Plan success rate';
  }

  if (els.summarySuccessRate) {
    els.summarySuccessRate.textContent = '—';
  }

  if (els.summarySuccessRateDesc) {
    els.summarySuccessRateDesc.textContent =
      'Share of simulated paths that avoid depletion across the full plan.';
  }

  if (els.summaryMedianEndLabel) {
    els.summaryMedianEndLabel.textContent = 'Median end portfolio';
  }

  if (els.summaryMedianEnd) {
    els.summaryMedianEnd.textContent = '—';
  }

  if (els.summaryMedianEndDesc) {
    els.summaryMedianEndDesc.textContent =
      'Middle simulated outcome at the end of the retirement horizon.';
  }

  if (els.summaryWorstStressLabel) {
    els.summaryWorstStressLabel.textContent = 'Worst stress scenario';
  }

  if (els.summaryWorstStress) {
    els.summaryWorstStress.textContent = '—';
  }

  if (els.summaryWorstStressDesc) {
    els.summaryWorstStressDesc.textContent =
      'Lowest ending portfolio across the deterministic stress paths.';
  }

  if (els.summaryCashRunwayLabel) {
    els.summaryCashRunwayLabel.textContent = 'Cash runway at start';
  }

  if (els.summaryCashRunway) {
    els.summaryCashRunway.textContent = '—';
  }

  if (els.summaryCashRunwayDesc) {
    els.summaryCashRunwayDesc.textContent =
      'Years the opening cashlike bucket could fund net withdrawals before refill.';
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
  currentTableView = 'median';
  currentTableMode = 'plan';
  syncInitialWithdrawalRateFromAmount();
}

function setResultsViewDefaults() {
  if (els.chartModeNominal) els.chartModeNominal.checked = false;
  if (els.chartModeReal) els.chartModeReal.checked = true;
  if (els.showRealValues) els.showRealValues.checked = true;
  if (els.showFullTable) els.showFullTable.checked = true;
  if (els.showPlanOutlook) els.showPlanOutlook.checked = true;
  if (els.guytonKlingerOn) els.guytonKlingerOn.checked = true;
  if (els.guytonKlingerOff) els.guytonKlingerOff.checked = false;
}

function attachEvents() {
  if (els.portfolioHasPerson2) {
    els.portfolioHasPerson2.checked = portfolioConfig.hasPerson2;

    els.portfolioHasPerson2.addEventListener('change', (e) => {
      portfolioConfig.hasPerson2 = Boolean(e.target.checked);

      if (!portfolioConfig.hasPerson2) {
        portfolioPeople.person2Name = '';

        if (els.portfolioPerson2Name) {
          els.portfolioPerson2Name.value = '';
        }
      }

      savePortfolioConfigToStorage();
      savePortfolioPeopleToStorage();

      applyPerson2PortfolioRules();
      renderPortfolioTable();
    });
  }

  if (els.portfolioPerson1Name) {
    els.portfolioPerson1Name.addEventListener('input', (e) => {
      portfolioPeople.person1Name = e.target.value;
      savePortfolioPeopleToStorage();
    });
  }

  if (els.portfolioPerson2Name) {
    els.portfolioPerson2Name.addEventListener('input', (e) => {
      portfolioPeople.person2Name = e.target.value;
      savePortfolioPeopleToStorage();
    });
  }

  if (els.includePerson2) {
    els.includePerson2.addEventListener('change', () => {
      if (!portfolioConfig.hasPerson2) {
        els.includePerson2.checked = false;
      }

      if (els.person2Panel) {
        els.person2Panel.style.display = els.includePerson2.checked ? '' : 'none';
      }
    });
  }

  if (els.continueToAssumptionsBtn) {
    els.continueToAssumptionsBtn.addEventListener('click', () => {
      const validationState = getPortfolioValidationState();

    if (!portfolioAccounts.length) {
      showError('Add at least one account before continuing.');
      tabs.setActiveTab('portfolio');
      return;
    }
    
    if (!validationState.isReady) {
      showError('Fix the highlighted portfolio issues before continuing.');
      tabs.setActiveTab('portfolio');
      return;
    }

      const portfolioTotals = calculatePortfolioTotals(portfolioAccounts);
      const roundedPortfolioTotal =
        Math.round(portfolioTotals.allocations.equities) +
        Math.round(portfolioTotals.allocations.bonds) +
        Math.round(portfolioTotals.allocations.cashlike) +
        Math.round(portfolioTotals.allocations.cash);

      if (roundedPortfolioTotal < 99 || roundedPortfolioTotal > 101) {
        showError('Portfolio totals could not be mapped cleanly to Assumptions. Check your account allocations.');
        return;
      }
        
      const totals = portfolioTotals;
      const mappedInputs = mapPortfolioToInputs(totals);

      const currentInputs = {
        ...DEFAULT_INPUTS,
        ...gatherInputs()
      };

      latestBaseInputs = {
        ...currentInputs,
        ...mappedInputs
      };

      applyPortfolioInputsToAssumptions(mappedInputs);
      tabs.setActiveTab('assumptions');

      requestAnimationFrame(() => {
        hideError();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
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
      savePortfolioToStorage();
      savePortfolioConfigToStorage();
      savePortfolioPeopleToStorage();

      const originalLabel = savePortfolioBtn.textContent;
      savePortfolioBtn.textContent = 'Saved';

      window.setTimeout(() => {
        savePortfolioBtn.textContent = originalLabel;
      }, 1200);
    });
  }

  planForm.attachFormatting();
  advancedForm.attachFormatting();

  planForm.bindActions({
    onRun: runSimulation,
    onReset: () => {
      applyDefaults();
      setResultsViewDefaults();
      updateAllocationStatus();
      applyPerson2PortfolioRules();
      renderPortfolioPeopleFields();

      latestResult = null;
      latestBaseInputs = null;
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
      if (latestResult) renderAll();
    }
  });

  attachWithdrawalRateSync();
  attachChartModeEvents();
  attachGuytonKlingerEvents();
  attachResultsTabGuard();

  window.addEventListener(
    'resize',
    debounce(() => {
      if (latestResult) renderAll();
    }, 100)
  );

  if (els.showPlanOutlook) {
    els.showPlanOutlook.addEventListener('change', () => {
      togglePlanOutlook();
    });
  }

  attachAllocationStatusEvents();
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
  const inputs = gatherInputs();
  const mergedInputs = normaliseAllocationInputsForSimulation({
    ...DEFAULT_INPUTS,
    ...inputs
  });
  const errors = validateInputs(mergedInputs);

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

  if (worker) {
    worker.postMessage({ type: 'run', inputs: effectiveInputs });
    return;
  }

  try {
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
        planForm.setBusy(false);
        showError(error instanceof Error ? error.message : 'Simulation failed.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  } catch (error) {
    planForm.setBusy(false);
    showError(error instanceof Error ? error.message : 'Simulation failed.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    planForm.setBusy(true);
    worker.postMessage({ type: 'run', inputs: effectiveInputs });
    return;
  }

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
    tableView: currentTableView,
    tableMode: currentTableMode,
    formatters: {
      formatCurrency,
      formatPercent,
      formatYears
    }
  });

  applySuccessRateTone(latestResult.monteCarlo?.successRate ?? null);

  attachTableModeSelector();
  attachTableViewSelector();
  togglePlanOutlook();
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

function getPortfolioRowIssues(account) {
  const issues = [];
  const value = Number(account.value);
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
  if (!portfolioAccounts.length) {
    return {
      isReady: false,
      issueCount: 1,
      message: 'Add at least one account'
    };
  }

  let issueCount = 0;

  portfolioAccounts.forEach((account) => {
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
    name: 'New account',
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

  savePortfolioToStorage();
  renderPortfolioTable();
}

function updatePortfolioAccount(id, field, value) {
  const account = portfolioAccounts.find((item) => item.id === id);
  if (!account) return;

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

  portfolioAccounts.forEach((account) => {
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
  return {
    initialPortfolio: totals.totalValue,
    equityAllocation: totals.allocations.equities,
    bondAllocation: totals.allocations.bonds,
    cashlikeAllocation: totals.allocations.cashlike,
    cashAllocation: totals.allocations.cash,
    hasPerson2: portfolioConfig.hasPerson2,
    includePerson2: portfolioConfig.hasPerson2,
    person1Name: String(portfolioPeople.person1Name || '').trim(),
    person2Name: String(portfolioPeople.person2Name || '').trim()
  };
}

function applyPortfolioInputsToAssumptions(mapped) {
  if (els.initialPortfolio) {
    els.initialPortfolio.value = formatInteger(Math.round(mapped.initialPortfolio || 0));
  }

  const equity = Math.round(mapped.equityAllocation || 0);
  const bond = Math.round(mapped.bondAllocation || 0);
  const cashlike = Math.round(mapped.cashlikeAllocation || 0);
  const cash = 100 - equity - bond - cashlike;

  if (els.equityAllocation) els.equityAllocation.value = equity;
  if (els.bondAllocation) els.bondAllocation.value = bond;
  if (els.cashlikeAllocation) els.cashlikeAllocation.value = cashlike;
  if (els.cashAllocation) els.cashAllocation.value = cash;

  if (els.person1Name) {
    els.person1Name.value = mapped.person1Name || '';
  }

  if (els.person2Name) {
    els.person2Name.value = mapped.person2Name || '';
  }

  if (els.includePerson2) {
    els.includePerson2.checked = Boolean(mapped.includePerson2);
    els.includePerson2.disabled = !mapped.hasPerson2;
  }

  if (els.person2Panel) {
    els.person2Panel.style.display = mapped.includePerson2 ? '' : 'none';
  }

  updateAllocationStatus();

  if (withdrawalInputMode === 'rate') {
    syncInitialSpendingFromRate();
  } else {
    syncInitialWithdrawalRateFromAmount();
  }

  hideError();
}

function updatePortfolioSummaryCards() {
  const totals = calculatePortfolioTotals(portfolioAccounts);

  const investmentValueEl = document.getElementById('portfolioTotalValue');
  const allocationEl = document.getElementById('portfolioAllocationTotals');
  const wrappersEl = document.getElementById('portfolioWrapperTotals');

  if (investmentValueEl) {
    investmentValueEl.textContent = formatCurrency(totals.totalValue);
  }

  if (allocationEl) {
    allocationEl.innerHTML = `
      <div><span>Equities</span><span class="value">${totals.allocations.equities.toFixed(1)}%</span></div>
      <div><span>Bonds</span><span class="value">${totals.allocations.bonds.toFixed(1)}%</span></div>
      <div><span>Cashlike</span><span class="value">${totals.allocations.cashlike.toFixed(1)}%</span></div>
      <div><span>Cash</span><span class="value">${totals.allocations.cash.toFixed(1)}%</span></div>
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

function renderPortfolioTable() {
  const tbody = document.getElementById('portfolioTableBody');
  if (!tbody) return;

  if (portfolioAccounts.length === 0) {
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

  portfolioAccounts.forEach((account) => {
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
          <option value="Person 1" ${account.owner === 'Person 1' ? 'selected' : ''}>Person 1</option>
          ${portfolioConfig.hasPerson2 ? `
            <option value="Person 2" ${account.owner === 'Person 2' ? 'selected' : ''}>Person 2</option>
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
  const hasPerson2 = portfolioConfig.hasPerson2;

  // Sync assumptions toggle
  if (els.includePerson2) {
    els.includePerson2.checked = hasPerson2;
    els.includePerson2.disabled = !hasPerson2;
  }

  // Show / hide panel
  if (els.person2Panel) {
    els.person2Panel.style.display = hasPerson2 ? '' : 'none';
  }

  // Clean invalid account owners
  if (!hasPerson2) {
    portfolioAccounts.forEach((account) => {
      if (account.owner === 'Person 2') {
        account.owner = 'Person 1';
      }
    });

    savePortfolioToStorage();
    renderPortfolioTable();
  }
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
      if (input.dataset.field === 'value') {
        const numericValue = parseLooseNumber(input.value);
        input.value = Number.isFinite(numericValue) ? String(Math.round(numericValue)) : '';
      }
    });

    input.addEventListener('input', () => {
      const id = Number(input.dataset.id);
      const field = input.dataset.field;
      if (!field) return;

      if (field.startsWith('allocation.')) {
        const clamped = normalisePortfolioPercent(input.value);
        updatePortfolioAccount(id, field, clamped);
      }
    });

    input.addEventListener('blur', () => {
      const id = Number(input.dataset.id);
      const field = input.dataset.field;
      const rawValue = input.value.trim();

      if (!field) return;

      if (field === 'name') {
        updatePortfolioAccount(id, field, rawValue);
        return;
      }

      if (field === 'value') {
        updatePortfolioAccount(id, field, rawValue);
        return;
      }

      if (field.startsWith('allocation.')) {
        updatePortfolioAccount(id, field, normalisePortfolioPercent(rawValue));
      }
    });

    input.addEventListener('change', () => {
      const id = Number(input.dataset.id);
      const field = input.dataset.field;
      const rawValue = input.value.trim();

      if (!field) return;

      if (field === 'name') {
        updatePortfolioAccount(id, field, rawValue);
        return;
      }

      if (field === 'value') {
        updatePortfolioAccount(id, field, rawValue);
        return;
      }

      if (field.startsWith('allocation.')) {
        updatePortfolioAccount(id, field, normalisePortfolioPercent(rawValue));
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

/* Portfolio: remove global header */
body.is-portfolio .top-header{
  display:none;
}

body.is-portfolio .page-content{
  padding-top:24px;
}