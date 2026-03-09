export function createPlanForm(elements, { formatInteger, parseLooseNumber, parseLooseInteger } = {}) {
  const planIntegerFieldIds = [
    'initialPortfolio',
    'initialSpending',
    'statePensionToday',
    'otherIncomeToday',
    'otherIncomeYears',
    'windfallAmount',
    'windfallYear'
  ];

  function applyDefaults(defaults) {
    const sharedStatePensionToday = resolveSharedStatePensionToday(defaults);

    setFieldValue('years', defaults.years);
    setFieldValue('initialPortfolio', defaults.initialPortfolio, true);
    setFieldValue('initialSpending', defaults.initialSpending, true);
    setFieldValue('equityAllocation', defaults.equityAllocation);
    setFieldValue('bondAllocation', defaults.bondAllocation);
    setFieldValue('cashlikeAllocation', defaults.cashlikeAllocation);
    elements.rebalanceToTarget.checked = defaults.rebalanceToTarget;

    setFieldValue('statePensionToday', sharedStatePensionToday, true);
    setFieldValue('otherIncomeToday', defaults.otherIncomeToday ?? 0, true);
    setFieldValue('otherIncomeYears', defaults.otherIncomeYears ?? 0, true);
    setFieldValue('windfallAmount', defaults.windfallAmount ?? 0, true);
    setFieldValue('windfallYear', defaults.windfallYear ?? 0, true);

    setFieldValue('person1Name', '');
    setFieldValue('person1Age', defaults.person1Age);
    setFieldValue('person1PensionAge', defaults.person1PensionAge);

    setFieldValue('person2Name', '');
    setFieldValue('person2Age', defaults.person2Age);
    setFieldValue('person2PensionAge', defaults.person2PensionAge);
  }

  function attachFormatting() {
    planIntegerFieldIds.forEach((fieldId) => {
      const input = elements[fieldId];
      if (!input) return;

      input.addEventListener('focus', () => {
        input.value = unformatNumberString(input.value);
      });

      input.addEventListener('blur', () => {
        const parser = fieldId.endsWith('Years') || fieldId.endsWith('Year')
          ? parseLooseInteger
          : parseLooseNumber;
        const value = parser(input.value);
        input.value = Number.isFinite(value) ? formatInteger(value) : '';
      });
    });
  }

  function readValues() {
    const sharedStatePensionToday = parseLooseNumber(elements.statePensionToday?.value);

    return {
      years: parseLooseInteger(elements.years.value),
      initialPortfolio: parseLooseNumber(elements.initialPortfolio.value),
      initialSpending: parseLooseNumber(elements.initialSpending.value),
      equityAllocation: parseLooseNumber(elements.equityAllocation.value),
      bondAllocation: parseLooseNumber(elements.bondAllocation.value),
      cashlikeAllocation: parseLooseNumber(elements.cashlikeAllocation.value),
      rebalanceToTarget: elements.rebalanceToTarget.checked,

      statePensionToday: sharedStatePensionToday,
      otherIncomeToday: parseLooseNumber(elements.otherIncomeToday?.value),
      otherIncomeYears: parseLooseInteger(elements.otherIncomeYears?.value),
      windfallAmount: parseLooseNumber(elements.windfallAmount?.value),
      windfallYear: parseLooseInteger(elements.windfallYear?.value),

      person1Name: String(elements.person1Name?.value ?? '').trim(),
      person1Age: parseLooseInteger(elements.person1Age.value),
      person1PensionAge: parseLooseInteger(elements.person1PensionAge.value),
      person1PensionToday: sharedStatePensionToday,

      person2Name: String(elements.person2Name?.value ?? '').trim(),
      person2Age: parseLooseInteger(elements.person2Age.value),
      person2PensionAge: parseLooseInteger(elements.person2PensionAge.value),
      person2PensionToday: sharedStatePensionToday
    };
  }

  function bindActions({ onRun, onReset } = {}) {
    if (typeof onRun === 'function') {
      elements.runSimulationBtn.addEventListener('click', onRun);
    }

    if (typeof onReset === 'function') {
      elements.resetDefaultsBtn.addEventListener('click', onReset);
    }
  }

  function setBusy(isBusy) {
    elements.runSimulationBtn.disabled = isBusy;
    elements.resetDefaultsBtn.disabled = isBusy;
    elements.runSimulationBtn.textContent = isBusy ? 'Running...' : 'Run simulation';
  }

  function setFieldValue(id, value, formatAsInteger = false) {
    if (!elements[id]) return;
    elements[id].value = formatAsInteger ? formatInteger(value) : String(value ?? '');
  }

  function resolveSharedStatePensionToday(defaults) {
    if (Number.isFinite(parseLooseNumber(defaults?.statePensionToday))) {
      return parseLooseNumber(defaults.statePensionToday);
    }

    if (Number.isFinite(parseLooseNumber(defaults?.person1PensionToday))) {
      return parseLooseNumber(defaults.person1PensionToday);
    }

    if (Number.isFinite(parseLooseNumber(defaults?.person2PensionToday))) {
      return parseLooseNumber(defaults.person2PensionToday);
    }

    return 0;
  }

  function unformatNumberString(value) {
    return String(value ?? '').replace(/,/g, '');
  }

  return {
    applyDefaults,
    attachFormatting,
    readValues,
    bindActions,
    setBusy
  };
}
