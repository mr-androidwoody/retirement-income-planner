const planIntegerFieldIds = [
  'initialPortfolio',
  'initialSpending',
  'comfortSpending',
  'minimumSpending',
  'statePensionToday',
  'person1OtherIncomeToday',
  'person1OtherIncomeYears',
  'person1WindfallAmount',
  'person1WindfallYear',
  'person2OtherIncomeToday',
  'person2OtherIncomeYears',
  'person2WindfallAmount',
  'person2WindfallYear'
];

function unformatNumberString(value) {
  return String(value ?? '').replace(/,/g, '').trim();
}

function setFieldValue(elements, fieldId, value, formatAsInteger = false, formatInteger = null) {
  const field = elements[fieldId];
  if (!field) return;

  if (value === null || value === undefined || value === '' || Number.isNaN(value)) {
    field.value = '';
    return;
  }

  if (formatAsInteger && typeof formatInteger === 'function') {
    field.value = formatInteger(Number(value));
    return;
  }

  field.value = value;
}

function resolveSharedStatePensionToday(defaults) {
  if (Number.isFinite(defaults.statePensionToday)) return defaults.statePensionToday;
  if (Number.isFinite(defaults.person1PensionToday)) return defaults.person1PensionToday;
  if (Number.isFinite(defaults.person2PensionToday)) return defaults.person2PensionToday;
  return 0;
}

function resolveGetsFullPension(defaults, personKey) {
  const explicitFlag = defaults[`${personKey}GetsFullPension`];
  if (typeof explicitFlag === 'boolean') return explicitFlag;
  return Number(defaults[`${personKey}PensionToday`] || 0) > 0;
}

function resolveIncludePerson2(defaults) {
  if (typeof defaults.includePerson2 === 'boolean') return defaults.includePerson2;

  const hasPerson2Data = [
    defaults.person2Age,
    defaults.person2PensionAge,
    defaults.person2PensionToday,
    defaults.person2OtherIncomeToday,
    defaults.person2OtherIncomeYears,
    defaults.person2WindfallAmount,
    defaults.person2WindfallYear
  ].some((value) => Number.isFinite(value) && value !== 0);

  return hasPerson2Data;
}

export function createPlanForm(
  elements,
  { formatInteger, parseLooseNumber, parseLooseInteger } = {}
) {
  let comfortFloorOverridden = false;
  let minimumFloorOverridden = false;

  function syncDefaultSpendingFloors() {
    const spending = parseLooseNumber(elements.initialSpending?.value);
    if (!Number.isFinite(spending)) return;

    if (elements.comfortSpending && !comfortFloorOverridden) {
      elements.comfortSpending.value = formatInteger(Math.round(spending * 0.9));
    }

    if (elements.minimumSpending && !minimumFloorOverridden) {
      elements.minimumSpending.value = formatInteger(Math.round(spending * 0.75));
    }
  }

  function stepIntegerField(fieldId, direction, stepSize = 1000) {
    const field = elements[fieldId];
    if (!field) return;

    const currentValue = parseLooseNumber(field.value);
    const safeCurrent = Number.isFinite(currentValue) ? currentValue : 0;
    const nextValue = Math.max(0, safeCurrent + direction * stepSize);

    const isDecimal = stepSize < 1;

    if (isDecimal) {
      field.value = Number(nextValue.toFixed(2));
    } else {
      field.value = formatInteger(nextValue);
    }

    if (fieldId === 'comfortSpending') {
      comfortFloorOverridden = true;
    }

    if (fieldId === 'minimumSpending') {
      minimumFloorOverridden = true;
    }

    if (fieldId === 'initialSpending') {
    syncDefaultSpendingFloors();
    }
  }

  function syncPerson2State() {
    const include = Boolean(elements.includePerson2?.checked ?? true);

    if (elements.person2Panel) {
      elements.person2Panel.classList.toggle('hidden', !include);
    }

    if (elements.person2Name) elements.person2Name.disabled = !include;
    if (elements.person2Age) elements.person2Age.disabled = !include;
    if (elements.person2PensionAge) elements.person2PensionAge.disabled = !include;
    if (elements.person2GetsFullPension) elements.person2GetsFullPension.disabled = !include;
    if (elements.person2OtherIncomeToday) elements.person2OtherIncomeToday.disabled = !include;
    if (elements.person2OtherIncomeYears) elements.person2OtherIncomeYears.disabled = !include;
    if (elements.person2WindfallAmount) elements.person2WindfallAmount.disabled = !include;
    if (elements.person2WindfallYear) elements.person2WindfallYear.disabled = !include;
  }

  function syncSimulationModeUI() {
    const mode = String(elements.simulationMode?.value ?? 'monteCarlo');

    if (elements.monteCarloRunsRow) {
      elements.monteCarloRunsRow.classList.toggle('hidden', mode !== 'monteCarlo');
    }

    if (elements.historicalScenarioRow) {
      elements.historicalScenarioRow.classList.toggle('hidden', mode !== 'historical');
    }
  }

  function applyDefaults(defaults) {
    const sharedStatePensionToday = resolveSharedStatePensionToday(defaults);

    setFieldValue(elements, 'years', defaults.years);
    setFieldValue(elements, 'initialPortfolio', defaults.initialPortfolio, true, formatInteger);
    setFieldValue(elements, 'initialSpending', defaults.initialSpending, true, formatInteger);

    setFieldValue(
      elements,
      'comfortSpending',
      defaults.comfortSpending ?? '',
      true,
      formatInteger
    );

    setFieldValue(
      elements,
      'minimumSpending',
      defaults.minimumSpending ?? '',
      true,
      formatInteger
    );

    setFieldValue(elements, 'initialWithdrawalRate', '');
    setFieldValue(elements, 'equityAllocation', defaults.equityAllocation);
    setFieldValue(elements, 'bondAllocation', defaults.bondAllocation);
    setFieldValue(elements, 'cashlikeAllocation', defaults.cashlikeAllocation);

    if (elements.rebalanceToTarget) {
      elements.rebalanceToTarget.checked = Boolean(defaults.rebalanceToTarget);
    }

    if (elements.simulationMode) {
      elements.simulationMode.value = defaults.simulationMode ?? 'monteCarlo';
    }

    if (elements.historicalScenario) {
      elements.historicalScenario.value = defaults.historicalScenario ?? '1929';
    }

    setFieldValue(
      elements,
      'statePensionToday',
      sharedStatePensionToday,
      true,
      formatInteger
    );

    setFieldValue(elements, 'person1Name', '');
    setFieldValue(elements, 'person1Age', defaults.person1Age);
    setFieldValue(elements, 'person1PensionAge', defaults.person1PensionAge);

    if (elements.person1GetsFullPension) {
      elements.person1GetsFullPension.checked = resolveGetsFullPension(defaults, 'person1');
    }

    setFieldValue(
      elements,
      'person1OtherIncomeToday',
      defaults.person1OtherIncomeToday ?? 0,
      true,
      formatInteger
    );
    setFieldValue(
      elements,
      'person1OtherIncomeYears',
      defaults.person1OtherIncomeYears ?? 0,
      true,
      formatInteger
    );
    setFieldValue(
      elements,
      'person1WindfallAmount',
      defaults.person1WindfallAmount ?? 0,
      true,
      formatInteger
    );
    setFieldValue(
      elements,
      'person1WindfallYear',
      defaults.person1WindfallYear ?? 0,
      true,
      formatInteger
    );

    if (elements.includePerson2) {
      elements.includePerson2.checked = resolveIncludePerson2(defaults);
    }

    setFieldValue(elements, 'person2Name', '');
    setFieldValue(elements, 'person2Age', defaults.person2Age);
    setFieldValue(elements, 'person2PensionAge', defaults.person2PensionAge);

    if (elements.person2GetsFullPension) {
      elements.person2GetsFullPension.checked = resolveGetsFullPension(defaults, 'person2');
    }

    setFieldValue(
      elements,
      'person2OtherIncomeToday',
      defaults.person2OtherIncomeToday ?? 0,
      true,
      formatInteger
    );
    setFieldValue(
      elements,
      'person2OtherIncomeYears',
      defaults.person2OtherIncomeYears ?? 0,
      true,
      formatInteger
    );
    setFieldValue(
      elements,
      'person2WindfallAmount',
      defaults.person2WindfallAmount ?? 0,
      true,
      formatInteger
    );
    setFieldValue(
      elements,
      'person2WindfallYear',
      defaults.person2WindfallYear ?? 0,
      true,
      formatInteger
    );

    planIntegerFieldIds.forEach((fieldId) => {
      const field = elements[fieldId];
      if (!field) return;

      const value = parseLooseNumber(field.value);
      if (Number.isFinite(value)) {
        field.value = formatInteger(value);
      }
    });

    comfortFloorOverridden = false;
    minimumFloorOverridden = false;
    syncDefaultSpendingFloors();

    syncPerson2State();
    syncSimulationModeUI();
  }

  function attachFormatting() {
    planIntegerFieldIds.forEach((fieldId) => {
      const input = elements[fieldId];
      if (!input) return;

      input.addEventListener('focus', () => {
        input.value = unformatNumberString(input.value);
      });

      input.addEventListener('blur', () => {
        const parser =
          fieldId.endsWith('Years') || fieldId.endsWith('Year')
            ? parseLooseInteger
            : parseLooseNumber;

        const value = parser(input.value);
        input.value = Number.isFinite(value) ? formatInteger(value) : '';
      });
    });

    if (elements.includePerson2) {
      elements.includePerson2.addEventListener('change', () => {
        syncPerson2State();
      });
    }

    if (elements.simulationMode) {
      elements.simulationMode.addEventListener('change', () => {
        syncSimulationModeUI();
      });
    }

    if (elements.comfortSpending) {
      elements.comfortSpending.addEventListener('input', () => {
        comfortFloorOverridden = true;
      });
    }

    if (elements.minimumSpending) {
      elements.minimumSpending.addEventListener('input', () => {
        minimumFloorOverridden = true;
      });
    }

    if (elements.initialSpending) {
      elements.initialSpending.addEventListener('input', () => {
        syncDefaultSpendingFloors();
      });

      elements.initialSpending.addEventListener('blur', () => {
        syncDefaultSpendingFloors();
      });
    }

    document.querySelectorAll('[data-step-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const fieldId = button.dataset.stepTarget;
        const direction = Number(button.dataset.stepDirection);
        const stepSize = Number(button.dataset.stepSize || 1000);

        if (!fieldId || !Number.isFinite(direction)) return;
        stepIntegerField(fieldId, direction, stepSize);
      });
    });

    syncSimulationModeUI();
  }

  function bindActions({ onRun, onReset } = {}) {
    if (elements.runSimulationBtn && typeof onRun === 'function') {
      elements.runSimulationBtn.addEventListener('click', (event) => {
        event.preventDefault();
        onRun();
      });
    }

    if (elements.resetDefaultsBtn && typeof onReset === 'function') {
      elements.resetDefaultsBtn.addEventListener('click', (event) => {
        event.preventDefault();
        onReset();
      });
    }
  }

  function setBusy(isBusy) {
    if (elements.runSimulationBtn) {
      elements.runSimulationBtn.disabled = Boolean(isBusy);
    }

    if (elements.resetDefaultsBtn) {
      elements.resetDefaultsBtn.disabled = Boolean(isBusy);
    }
  }

  function readValues() {
    const fullStatePensionToday = parseLooseNumber(elements.statePensionToday?.value);

    const includePerson2 = Boolean(elements.includePerson2?.checked ?? true);

    const person1GetsFullPension = Boolean(elements.person1GetsFullPension?.checked);
    const person2GetsFullPension =
      includePerson2 && Boolean(elements.person2GetsFullPension?.checked);

    const person1OtherIncomeToday = parseLooseNumber(elements.person1OtherIncomeToday?.value);
    const person1OtherIncomeYears = parseLooseInteger(elements.person1OtherIncomeYears?.value);
    const person1WindfallAmount = parseLooseNumber(elements.person1WindfallAmount?.value);
    const person1WindfallYear = parseLooseInteger(elements.person1WindfallYear?.value);

    const person2OtherIncomeToday = includePerson2
      ? parseLooseNumber(elements.person2OtherIncomeToday?.value)
      : 0;
    const person2OtherIncomeYears = includePerson2
      ? parseLooseInteger(elements.person2OtherIncomeYears?.value)
      : 0;
    const person2WindfallAmount = includePerson2
      ? parseLooseNumber(elements.person2WindfallAmount?.value)
      : 0;
    const person2WindfallYear = includePerson2
      ? parseLooseInteger(elements.person2WindfallYear?.value)
      : 0;

    return {
      years: parseLooseInteger(elements.years?.value),
      initialPortfolio: parseLooseNumber(elements.initialPortfolio?.value),
      initialSpending: parseLooseNumber(elements.initialSpending?.value),
      comfortSpending: parseLooseNumber(elements.comfortSpending?.value),
      minimumSpending: parseLooseNumber(elements.minimumSpending?.value),
      equityAllocation: parseLooseNumber(elements.equityAllocation?.value),
      bondAllocation: parseLooseNumber(elements.bondAllocation?.value),
      cashlikeAllocation: parseLooseNumber(elements.cashlikeAllocation?.value),
      rebalanceToTarget: Boolean(elements.rebalanceToTarget?.checked),

      statePensionToday: fullStatePensionToday,

      person1Name: String(elements.person1Name?.value ?? '').trim(),
      person1Age: parseLooseInteger(elements.person1Age?.value),
      person1PensionAge: parseLooseInteger(elements.person1PensionAge?.value),
      person1PensionToday: person1GetsFullPension ? fullStatePensionToday : 0,
      person1GetsFullPension,
      person1OtherIncomeToday,
      person1OtherIncomeYears,
      person1WindfallAmount,
      person1WindfallYear,

      includePerson2,

      person2Name: includePerson2 ? String(elements.person2Name?.value ?? '').trim() : '',
      person2Age: includePerson2 ? parseLooseInteger(elements.person2Age?.value) : 0,
      person2PensionAge: includePerson2 ? parseLooseInteger(elements.person2PensionAge?.value) : 0,
      person2PensionToday: person2GetsFullPension ? fullStatePensionToday : 0,
      person2GetsFullPension,
      person2OtherIncomeToday,
      person2OtherIncomeYears,
      person2WindfallAmount,
      person2WindfallYear,

      simulationMode: String(elements.simulationMode?.value ?? 'monteCarlo'),
      historicalScenario: String(elements.historicalScenario?.value ?? '1929')
    };
  }

  return {
    applyDefaults,
    attachFormatting,
    bindActions,
    readValues,
    setBusy,
    syncPerson2State
  };
}