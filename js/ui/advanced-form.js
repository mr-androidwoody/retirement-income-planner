export function createAdvancedForm(elements, { formatInteger, parseLooseNumber, parseLooseInteger } = {}) {
  const advancedIntegerFieldIds = ['monteCarloRuns'];

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

    if (elements.skipInflationAfterNegative) {
      elements.skipInflationAfterNegative.checked = defaults.skipInflationAfterNegative;
    }

    if (elements.showRealValues) {
      elements.showRealValues.checked = defaults.showRealValues;
    }
  }

  function attachFormatting() {
    advancedIntegerFieldIds.forEach((fieldId) => {
      const input = elements[fieldId];
      if (!input) return;

      input.addEventListener('focus', () => {
        input.value = unformatNumberString(input.value);
      });

      input.addEventListener('blur', () => {
        const value = parseLooseNumber(input.value);
        input.value = Number.isFinite(value) ? formatInteger(value) : '';
      });
    });
  }

  function readValues() {
  return {
    equityReturn: parseLooseNumber(elements.equityReturn.value) / 100,
    equityVolatility: parseLooseNumber(elements.equityVolatility.value) / 100,
    bondReturn: parseLooseNumber(elements.bondReturn.value) / 100,
    bondVolatility: parseLooseNumber(elements.bondVolatility.value) / 100,
    cashlikeReturn: parseLooseNumber(elements.cashlikeReturn.value) / 100,
    cashlikeVolatility: parseLooseNumber(elements.cashlikeVolatility.value) / 100,
    inflation: parseLooseNumber(elements.inflation.value) / 100,

    upperGuardrail: parseLooseNumber(elements.upperGuardrail.value) / 100,
    lowerGuardrail: parseLooseNumber(elements.lowerGuardrail.value) / 100,
    adjustmentSize: parseLooseNumber(elements.adjustmentSize.value) / 100,

    monteCarloRuns: parseLooseInteger(elements.monteCarloRuns.value),

    skipInflationAfterNegative: Boolean(elements.skipInflationAfterNegative?.checked),
    showRealValues: Boolean(elements.showRealValues?.checked)
  };
}

  function bindDisplayEvents({ onViewChange } = {}) {
    if (typeof onViewChange !== 'function') return;

    if (elements.showRealValues) {
      elements.showRealValues.addEventListener('change', onViewChange);
    }
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