import {
  formatInteger,
  parseLooseInteger,
  parseLooseNumber,
  setFieldValue,
  unformatNumberString
} from '../utils/formatters.js';

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

export function createPlanForm(elements, defaults) {
  function syncPerson2State() {
    const include = Boolean(elements.includePerson2?.checked ?? true);

    if (elements.person2Fields) {
      elements.person2Fields.classList.toggle('hidden', !include);
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

  function applyDefaults(nextDefaults) {
    const sharedStatePensionToday = resolveSharedStatePensionToday(nextDefaults);

    setFieldValue('years', nextDefaults.years);
    setFieldValue('initialPortfolio', nextDefaults.initialPortfolio, true);
    setFieldValue('initialSpending', nextDefaults.initialSpending, true);
    setFieldValue(
      'comfortSpending',
      nextDefaults.comfortSpending ?? Math.round((nextDefaults.initialSpending ?? 0) * 0.9),
      true
    );
    setFieldValue(
      'minimumSpending',
      nextDefaults.minimumSpending ?? Math.round((nextDefaults.initialSpending ?? 0) * 0.75),
      true
    );
    setFieldValue('initialWithdrawalRate', '');
    setFieldValue('equityAllocation', nextDefaults.equityAllocation);
    setFieldValue('bondAllocation', nextDefaults.bondAllocation);
    setFieldValue('cashlikeAllocation', nextDefaults.cashlikeAllocation);
    elements.rebalanceToTarget.checked = nextDefaults.rebalanceToTarget;

    setFieldValue('statePensionToday', sharedStatePensionToday, true);

    setFieldValue('person1Name', '');
    setFieldValue('person1Age', nextDefaults.person1Age);
    setFieldValue('person1PensionAge', nextDefaults.person1PensionAge);
    elements.person1GetsFullPension.checked = resolveGetsFullPension(nextDefaults, 'person1');
    setFieldValue('person1OtherIncomeToday', nextDefaults.person1OtherIncomeToday ?? 0, true);
    setFieldValue('person1OtherIncomeYears', nextDefaults.person1OtherIncomeYears ?? 0, true);
    setFieldValue('person1WindfallAmount', nextDefaults.person1WindfallAmount ?? 0, true);
    setFieldValue('person1WindfallYear', nextDefaults.person1WindfallYear ?? 0, true);

    if (elements.includePerson2) {
      elements.includePerson2.checked = resolveIncludePerson2(nextDefaults);
    }

    setFieldValue('person2Name', '');
    setFieldValue('person2Age', nextDefaults.person2Age);
    setFieldValue('person2PensionAge', nextDefaults.person2PensionAge);
    elements.person2GetsFullPension.checked = resolveGetsFullPension(nextDefaults, 'person2');
    setFieldValue('person2OtherIncomeToday', nextDefaults.person2OtherIncomeToday ?? 0, true);
    setFieldValue('person2OtherIncomeYears', nextDefaults.person2OtherIncomeYears ?? 0, true);
    setFieldValue('person2WindfallAmount', nextDefaults.person2WindfallAmount ?? 0, true);
    setFieldValue('person2WindfallYear', nextDefaults.person2WindfallYear ?? 0, true);

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

    if (elements.initialSpending) {
      elements.initialSpending.addEventListener('blur', () => {
        const spending = parseLooseNumber(elements.initialSpending.value);
        if (!Number.isFinite(spending)) return;

        if (elements.comfortSpending && !elements.comfortSpending.value) {
          elements.comfortSpending.value = formatInteger(Math.round(spending * 0.9));
        }

        if (elements.minimumSpending && !elements.minimumSpending.value) {
          elements.minimumSpending.value = formatInteger(Math.round(spending * 0.75));
        }
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
      comfortSpending: parseLooseNumber(elements.comfortSpending?.value),
      minimumSpending: parseLooseNumber(elements.minimumSpending?.value),
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

  function initialise() {
    applyDefaults(defaults);
    attachFormatting();
  }

  initialise();

  return {
    applyDefaults,
    readValues,
    syncPerson2State
  };
}