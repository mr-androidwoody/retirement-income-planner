export function createPlanForm(elements, { formatInteger, parseLooseNumber, parseLooseInteger } = {}) {
  const planIntegerFieldIds = [
    'initialPortfolio',
    'initialSpending',
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

  const person2FieldIds = [
    'person2Name',
    'person2Age',
    'person2PensionAge',
    'person2OtherIncomeToday',
    'person2OtherIncomeYears',
    'person2WindfallAmount',
    'person2WindfallYear'
  ];

  function applyDefaults(defaults) {
    const sharedStatePensionToday = resolveSharedStatePensionToday(defaults);

    setFieldValue('years', defaults.years);
    setFieldValue('initialPortfolio', defaults.initialPortfolio, true);
    setFieldValue('initialSpending', defaults.initialSpending, true);
    setFieldValue('initialWithdrawalRate', '');
    setFieldValue('equityAllocation', defaults.equityAllocation);
    setFieldValue('bondAllocation', defaults.bondAllocation);
    setFieldValue('cashlikeAllocation', defaults.cashlikeAllocation);
    elements.rebalanceToTarget.checked = defaults.rebalanceToTarget;

    setFieldValue('statePensionToday', sharedStatePensionToday, true);

    setFieldValue('person1Name', '');
    setFieldValue('person1Age', defaults.person1Age);
    setFieldValue('person1PensionAge', defaults.person1PensionAge);
    elements.person1GetsFullPension.checked = resolveGetsFullPension(defaults, 'person1');
    setFieldValue('person1OtherIncomeToday', defaults.person1OtherIncomeToday ?? 0, true);
    setFieldValue('person1OtherIncomeYears', defaults.person1OtherIncomeYears ?? 0, true);
    setFieldValue('person1WindfallAmount', defaults.person1WindfallAmount ?? 0, true);
    setFieldValue('person1WindfallYear', defaults.person1WindfallYear ?? 0, true);

    if (elements.includePerson2) {
      elements.includePerson2.checked = resolveIncludePerson2(defaults);
    }

    setFieldValue('person2Name', '');
    setFieldValue('person2Age', defaults.person2Age);
    setFieldValue('person2PensionAge', defaults.person2PensionAge);
    elements.person2GetsFullPension.checked = resolveGetsFullPension(defaults, 'person2');
    setFieldValue('person2OtherIncomeToday', defaults.person2OtherIncomeToday ?? 0, true);
    setFieldValue('person2OtherIncomeYears', defaults.person2OtherIncomeYears ?? 0, true);
    setFieldValue('person2WindfallAmount', defaults.person2WindfallAmount ?? 0, true);
    setFieldValue('person2WindfallYear', defaults.person2WindfallYear ?? 0, true);

    syncPerson2State();
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

    if (elements.includePerson2) {
      elements.includePerson2.addEventListener('change', () => {
        syncPerson2State();
      });
    }
  }

  function readValues() {
    const fullStatePensionToday = parseLooseNumber(elements.statePensionToday?.value);

    const includePerson2 = Boolean(elements.includePerson2?.checked ?? true);

    const person1GetsFullPension = Boolean(elements.person1GetsFullPension?.checked);
    const person2GetsFullPension = includePerson2 && Boolean(elements.person2GetsFullPension?.checked);

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
      years: parseLooseInteger(elements.years.value),
      initialPortfolio: parseLooseNumber(elements.initialPortfolio.value),
      initialSpending: parseLooseNumber(elements.initialSpending.value),
      equityAllocation: parseLooseNumber(elements.equityAllocation.value),
      bondAllocation: parseLooseNumber(elements.bondAllocation.value),
      cashlikeAllocation: parseLooseNumber(elements.cashlikeAllocation.value),
      rebalanceToTarget: elements.rebalanceToTarget.checked,

      statePensionToday: fullStatePensionToday,

      person1Name: String(elements.person1Name?.value ?? '').trim(),
      person1Age: parseLooseInteger(elements.person1Age.value),
      person1PensionAge: parseLooseInteger(elements.person1PensionAge.value),
      person1PensionToday: person1GetsFullPension ? fullStatePensionToday : 0,
      person1GetsFullPension,
      person1OtherIncomeToday,
      person1OtherIncomeYears,
      person1WindfallAmount,
      person1WindfallYear,

      includePerson2,

      person2Name: includePerson2 ? String(elements.person2Name?.value ?? '').trim() : '',
      person2Age: includePerson2 ? parseLooseInteger(elements.person2Age.value) : 0,
      person2PensionAge: includePerson2 ? parseLooseInteger(elements.person2PensionAge.value) : 0,
      person2PensionToday: person2GetsFullPension ? fullStatePensionToday : 0,
      person2GetsFullPension,
      person2OtherIncomeToday,
      person2OtherIncomeYears,
      person2WindfallAmount,
      person2WindfallYear
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

  function syncPerson2State() {
    const includePerson2 = Boolean(elements.includePerson2?.checked ?? true);

    if (elements.person2Panel) {
      elements.person2Panel.classList.toggle('person-panel-disabled', !includePerson2);
    }

    person2FieldIds.forEach((fieldId) => {
      if (!elements[fieldId]) return;
      elements[fieldId].disabled = !includePerson2;
    });

    if (elements.person2GetsFullPension) {
      elements.person2GetsFullPension.disabled = !includePerson2;
      if (!includePerson2) {
        elements.person2GetsFullPension.checked = false;
      }
    }
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

  function resolveGetsFullPension(defaults, personKey) {
    const explicit = defaults?.[`${personKey}GetsFullPension`];
    if (typeof explicit === 'boolean') return explicit;

    const pensionToday = parseLooseNumber(defaults?.[`${personKey}PensionToday`]);
    return pensionToday > 0;
  }

  function resolveIncludePerson2(defaults) {
    if (typeof defaults?.includePerson2 === 'boolean') {
      return defaults.includePerson2;
    }

    const hasName = String(defaults?.person2Name ?? '').trim() !== '';
    const hasPension = parseLooseNumber(defaults?.person2PensionToday) > 0;
    const hasOtherIncome = parseLooseNumber(defaults?.person2OtherIncomeToday) > 0;
    const hasWindfall = parseLooseNumber(defaults?.person2WindfallAmount) > 0;

    return hasName || hasPension || hasOtherIncome || hasWindfall;
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