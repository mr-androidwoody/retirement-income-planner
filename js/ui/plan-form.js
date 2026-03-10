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

    setFieldValue('person1Name', defaults.person1Name ?? '');
    setFieldValue('person1Age', defaults.person1Age);
    setFieldValue('person1PensionAge', defaults.person1PensionAge);
    elements.person1GetsFullPension.checked = resolveGetsFullPension(defaults, 'person1');
    setFieldValue('person1OtherIncomeToday', defaults.person1OtherIncomeToday ?? 0, true);
    setFieldValue('person1OtherIncomeYears', defaults.person1OtherIncomeYears ?? 0, true);
    setFieldValue('person1WindfallAmount', defaults.person1WindfallAmount ?? 0, true);
    setFieldValue('person1WindfallYear', defaults.person1WindfallYear ?? 0, true);

    setFieldValue('person2Name', defaults.person2Name ?? '');
    setFieldValue('person2Age', defaults.person2Age);
    setFieldValue('person2PensionAge', defaults.person2PensionAge);
    elements.person2GetsFullPension.checked = resolveGetsFullPension(defaults, 'person2');
    setFieldValue('person2OtherIncomeToday', defaults.person2OtherIncomeToday ?? 0, true);
    setFieldValue('person2OtherIncomeYears', defaults.person2OtherIncomeYears ?? 0, true);
    setFieldValue('person2WindfallAmount', defaults.person2WindfallAmount ?? 0, true);
    setFieldValue('person2WindfallYear', defaults.person2WindfallYear ?? 0, true);
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
    const fullStatePensionToday = parseLooseNumber(elements.statePensionToday?.value);

    const person1GetsFullPension = Boolean(elements.person1GetsFullPension?.checked);
    const person2GetsFullPension = Boolean(elements.person2GetsFullPension?.checked);

    const person1OtherIncomeToday = parseLooseNumber(elements.person1OtherIncomeToday?.value);
    const person1OtherIncomeYears = parseLooseInteger(elements.person1OtherIncomeYears?.value);
    const person1WindfallAmount = parseLooseNumber(elements.person1WindfallAmount?.value);
    const person1WindfallYear = parseLooseInteger(elements.person1WindfallYear?.value);

    const person2OtherIncomeToday = parseLooseNumber(elements.person2OtherIncomeToday?.value);
    const person2OtherIncomeYears = parseLooseInteger(elements.person2OtherIncomeYears?.value);
    const person2WindfallAmount = parseLooseNumber(elements.person2WindfallAmount?.value);
    const person2WindfallYear = parseLooseInteger(elements.person2WindfallYear?.value);

    const aggregatedStatePensionToday =
      (person1GetsFullPension ? fullStatePensionToday : 0) +
      (person2GetsFullPension ? fullStatePensionToday : 0);

    const aggregatedOtherIncomeToday =
      person1OtherIncomeToday + person2OtherIncomeToday;

    const aggregatedOtherIncomeYears = Math.max(
      normaliseInteger(person1OtherIncomeYears),
      normaliseInteger(person2OtherIncomeYears)
    );

    const aggregatedWindfallAmount =
      person1WindfallAmount + person2WindfallAmount;

    const aggregatedWindfallYear = resolveAggregatedWindfallYear(
      { amount: person1WindfallAmount, year: person1WindfallYear },
      { amount: person2WindfallAmount, year: person2WindfallYear }
    );

    return {
      years: parseLooseInteger(elements.years.value),
      initialPortfolio: parseLooseNumber(elements.initialPortfolio.value),
      initialSpending: parseLooseNumber(elements.initialSpending.value),
      equityAllocation: parseLooseNumber(elements.equityAllocation.value),
      bondAllocation: parseLooseNumber(elements.bondAllocation.value),
      cashlikeAllocation: parseLooseNumber(elements.cashlikeAllocation.value),
      rebalanceToTarget: elements.rebalanceToTarget.checked,

      statePensionToday: aggregatedStatePensionToday,
      otherIncomeToday: aggregatedOtherIncomeToday,
      otherIncomeYears: aggregatedOtherIncomeYears,
      windfallAmount: aggregatedWindfallAmount,
      windfallYear: aggregatedWindfallYear,

      person1Name: String(elements.person1Name?.value ?? '').trim(),
      person1Age: parseLooseInteger(elements.person1Age.value),
      person1PensionAge: parseLooseInteger(elements.person1PensionAge.value),
      person1PensionToday: person1GetsFullPension ? fullStatePensionToday : 0,
      person1GetsFullPension,
      person1OtherIncomeToday,
      person1OtherIncomeYears,
      person1WindfallAmount,
      person1WindfallYear,

      person2Name: String(elements.person2Name?.value ?? '').trim(),
      person2Age: parseLooseInteger(elements.person2Age.value),
      person2PensionAge: parseLooseInteger(elements.person2PensionAge.value),
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

  function resolveAggregatedWindfallYear(person1, person2) {
    const person1HasWindfall = normaliseNumber(person1.amount) > 0;
    const person2HasWindfall = normaliseNumber(person2.amount) > 0;

    if (!person1HasWindfall && !person2HasWindfall) return 0;
    if (person1HasWindfall && !person2HasWindfall) return normaliseInteger(person1.year);
    if (!person1HasWindfall && person2HasWindfall) return normaliseInteger(person2.year);

    return Math.min(
      normaliseInteger(person1.year),
      normaliseInteger(person2.year)
    );
  }

  function normaliseNumber(value) {
    return Number.isFinite(value) ? value : 0;
  }

  function normaliseInteger(value) {
    return Number.isFinite(value) ? value : 0;
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