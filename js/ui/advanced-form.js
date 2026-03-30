export function createAdvancedForm(elements, { formatInteger, parseLooseNumber, parseLooseInteger } = {}) {
  const advancedIntegerFieldIds = ['monteCarloRuns'];
 
  function applyDefaults(defaults) {
    if (elements.simulationMode && defaults.simulationMode) {
      elements.simulationMode.value = defaults.simulationMode;
    }
 
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
      simulationMode: elements.simulationMode?.value || '',
 
      equityReturn: parseLooseNumber(elements.equityReturn.value),
      equityVolatility: parseLooseNumber(elements.equityVolatility.value),
      bondReturn: parseLooseNumber(elements.bondReturn.value),
      bondVolatility: parseLooseNumber(elements.bondVolatility.value),
      cashlikeReturn: parseLooseNumber(elements.cashlikeReturn.value),
      cashlikeVolatility: parseLooseNumber(elements.cashlikeVolatility.value),
      inflation: parseLooseNumber(elements.inflation.value),
      inflationVolatility: 0.0175,
 
      upperGuardrail: parseLooseNumber(elements.upperGuardrail.value),
      lowerGuardrail: parseLooseNumber(elements.lowerGuardrail.value),
      adjustmentSize: parseLooseNumber(elements.adjustmentSize.value),
 
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