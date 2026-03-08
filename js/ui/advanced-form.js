export function createAdvancedForm(elements, { formatInteger, parseLooseNumber, parseLooseInteger } = {}) {
  const advancedIntegerFieldIds = ['monteCarloRuns', 'seed'];

  function applyDefaults(defaults) {
    setFieldValue('equityReturn', defaults.equityReturn);
    setFieldValue('equityVolatility', defaults.equityVolatility);
    setFieldValue('bondReturn', defaults.bondReturn);
    setFieldValue('bondVolatility', defaults.bondVolatility);
    setFieldValue('cashlikeReturn', defaults.cashlikeReturn);
    setFieldValue('cashlikeVolatility', defaults.cashlikeVolatility);
    setFieldValue('inflation', defaults.inflation);
    setFieldValue('upperGuardrail', defaults.upperGuardrail);
    setFieldValue('lowerGuardrail', defaults.lowerGuardrail);
    setFieldValue('adjustmentSize', defaults.adjustmentSize);
    setFieldValue('monteCarloRuns', defaults.monteCarloRuns, true);
    elements.seed.value = '';
    elements.skipInflationAfterNegative.checked = defaults.skipInflationAfterNegative;
    elements.showRealValues.checked = defaults.showRealValues;
    elements.showFullTable.checked = defaults.showFullTable;
  }

  function attachFormatting() {
    advancedIntegerFieldIds.forEach((fieldId) => {
      const input = elements[fieldId];
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

  function readValues() {
    return {
      equityReturn: parseLooseNumber(elements.equityReturn.value),
      equityVolatility: parseLooseNumber(elements.equityVolatility.value),
      bondReturn: parseLooseNumber(elements.bondReturn.value),
      bondVolatility: parseLooseNumber(elements.bondVolatility.value),
      cashlikeReturn: parseLooseNumber(elements.cashlikeReturn.value),
      cashlikeVolatility: parseLooseNumber(elements.cashlikeVolatility.value),
      inflation: parseLooseNumber(elements.inflation.value),
      upperGuardrail: parseLooseNumber(elements.upperGuardrail.value),
      lowerGuardrail: parseLooseNumber(elements.lowerGuardrail.value),
      adjustmentSize: parseLooseNumber(elements.adjustmentSize.value),
      monteCarloRuns: parseLooseInteger(elements.monteCarloRuns.value),
      seed: elements.seed.value.trim() === '' ? null : parseLooseInteger(elements.seed.value),
      skipInflationAfterNegative: elements.skipInflationAfterNegative.checked,
      showRealValues: elements.showRealValues.checked,
      showFullTable: elements.showFullTable.checked
    };
  }

  function bindDisplayEvents({ onViewChange } = {}) {
    if (typeof onViewChange !== 'function') return;

    elements.showRealValues.addEventListener('change', onViewChange);
    elements.showFullTable.addEventListener('change', onViewChange);
  }

  function setFieldValue(id, value, formatAsInteger = false) {
    if (!elements[id]) return;
    elements[id].value = formatAsInteger ? formatInteger(value) : String(value);
  }

  function unformatNumberString(value) {
    return String(value ?? '').replace(/,/g, '');
  }

  return {
    applyDefaults,
    attachFormatting,
    readValues,
    bindDisplayEvents
  };
}
