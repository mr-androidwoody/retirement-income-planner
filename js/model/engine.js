function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normaliseAllocation(value) {
  const number = toNumber(value, 0);
  return number > 1 ? number / 100 : number;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getInputYears(inputs) {
  return Math.max(
    0,
    Math.floor(
      toNumber(
        inputs.simulationYears ??
          inputs.years ??
          inputs.planLength ??
          inputs.retirementYears ??
          30,
        30
      )
    )
  );
}

function getStartingPortfolio(inputs) {
  return Math.max(
    0,
    toNumber(
      inputs.startingPortfolio ??
        inputs.initialPortfolio ??
        inputs.portfolioValue ??
        inputs.initialValue ??
        0,
      0
    )
  );
}

function getStartingAge(inputs) {
  return toNumber(
    inputs.startingAge ??
      inputs.currentAge ??
      inputs.age ??
      60,
    60
  );
}

function getAnnualSpending(inputs) {
  return Math.max(
    0,
    toNumber(
      inputs.annualSpending ??
        inputs.targetSpending ??
        inputs.spending ??
        0,
      0
    )
  );
}

function getAnnualFees(inputs) {
  const raw = toNumber(
    inputs.annualFees ??
      inputs.fees ??
      inputs.portfolioFees ??
      0,
    0
  );

  return raw > 1 ? raw / 100 : raw;
}

function getAllocations(inputs) {
  const equity = normaliseAllocation(
    inputs.equityAllocation ?? inputs.equitiesAllocation ?? 0.6
  );
  const bond = normaliseAllocation(
    inputs.bondAllocation ?? inputs.bondsAllocation ?? 0.4
  );
  const cash = normaliseAllocation(
    inputs.cashAllocation ?? 0
  );

  const total = equity + bond + cash;

  if (total <= 0) {
    return { equity: 0.6, bond: 0.4, cash: 0 };
  }

  return {
    equity: equity / total,
    bond: bond / total,
    cash: cash / total
  };
}

function buildIncomeStreams(inputs) {
  const streams = [];

  if (Array.isArray(inputs.incomes)) {
    for (const income of inputs.incomes) {
      if (!income || typeof income !== "object") continue;

      streams.push({
        name: income.name ?? "Income",
        amount: Math.max(0, toNumber(income.amount, 0)),
        startAge: toNumber(income.startAge, 0),
        endAge: toNumber(income.endAge, Number.POSITIVE_INFINITY),
        inflationLinked: Boolean(income.inflationLinked ?? true)
      });
    }
  }

  const statePensionAmount = toNumber(
    inputs.statePensionAnnual ??
      inputs.statePension ??
      inputs.statePensionAmount ??
      0,
    0
  );

  if (statePensionAmount > 0) {
    streams.push({
      name: "State pension",
      amount: statePensionAmount,
      startAge: toNumber(
        inputs.statePensionAge ??
          inputs.statePensionStartAge ??
          67,
        67
      ),
      endAge: Number.POSITIVE_INFINITY,
      inflationLinked: true
    });
  }

  return streams;
}

function getInflationAdjustedAmount(baseAmount, inflationIndex, inflationLinked) {
  if (!inflationLinked) return baseAmount;
  return baseAmount * inflationIndex;
}

function getIncomeForYear({ age, inflationIndex, incomeStreams }) {
  let total = 0;

  for (const stream of incomeStreams) {
    if (age < stream.startAge || age > stream.endAge) continue;

    total += getInflationAdjustedAmount(
      stream.amount,
      inflationIndex,
      stream.inflationLinked
    );
  }

  return total;
}

export function simulateScenario({ inputs, returnsProvider, metadata = {} }) {
  if (!returnsProvider || typeof returnsProvider.getYearReturns !== "function") {
    throw new Error("simulateScenario requires a returnsProvider with getYearReturns(yearIndex).");
  }

  const years = getInputYears(inputs);
  const startingPortfolio = getStartingPortfolio(inputs);
  const startingAge = getStartingAge(inputs);
  const baseAnnualSpending = getAnnualSpending(inputs);
  const annualFees = clamp(getAnnualFees(inputs), 0, 1);
  const allocation = getAllocations(inputs);
  const incomeStreams = buildIncomeStreams(inputs);

  let portfolio = startingPortfolio;
  let inflationIndex = 1;
  let depleted = false;
  let depletionYear = null;

  const yearlyRows = [];
  const pathNominal = [];
  const pathReal = [];

  for (let yearIndex = 0; yearIndex < years; yearIndex += 1) {
    const age = startingAge + yearIndex;

    const yearReturns = returnsProvider.getYearReturns(yearIndex) ?? {};
    const equityReturn = toNumber(yearReturns.equityReturn, 0);
    const bondReturn = toNumber(yearReturns.bondReturn, 0);
    const cashReturn = toNumber(yearReturns.cashReturn, 0);
    const inflation = toNumber(yearReturns.inflation, 0);

    if (yearIndex > 0) {
      inflationIndex *= 1 + inflation;
    }

    const targetSpending = baseAnnualSpending * inflationIndex;
    const income = getIncomeForYear({
      age,
      inflationIndex,
      incomeStreams
    });

    const startingValue = portfolio;

    const weightedReturn =
      allocation.equity * equityReturn +
      allocation.bond * bondReturn +
      allocation.cash * cashReturn;

    const grossGrowth = startingValue * weightedReturn;
    const beforeFees = startingValue + grossGrowth;
    const feeAmount = Math.max(0, beforeFees * annualFees);
    const afterFees = Math.max(0, beforeFees - feeAmount);

    const portfolioWithdrawal = Math.max(0, targetSpending - income);
    const endingValue = Math.max(0, afterFees - portfolioWithdrawal);
    const actualSpending = income + Math.min(afterFees, portfolioWithdrawal);
    const shortfall = Math.max(0, targetSpending - actualSpending);

    if (!depleted && endingValue <= 0 && shortfall > 0) {
      depleted = true;
      depletionYear = yearIndex;
    }

    portfolio = endingValue;

    const realEndingValue =
      inflationIndex > 0 ? endingValue / inflationIndex : endingValue;

    yearlyRows.push({
      year: yearIndex,
      age,
      startingValue: roundCurrency(startingValue),
      targetSpending: roundCurrency(targetSpending),
      actualSpending: roundCurrency(actualSpending),
      shortfall: roundCurrency(shortfall),
      income: roundCurrency(income),
      portfolioWithdrawal: roundCurrency(Math.min(afterFees, portfolioWithdrawal)),
      grossGrowth: roundCurrency(grossGrowth),
      feeAmount: roundCurrency(feeAmount),
      portfolioReturn: weightedReturn,
      equityReturn,
      bondReturn,
      cashReturn,
      inflation,
      endingValue: roundCurrency(endingValue),
      endingValueReal: roundCurrency(realEndingValue)
    });

    pathNominal.push(roundCurrency(endingValue));
    pathReal.push(roundCurrency(realEndingValue));
  }

  const terminalNominal = pathNominal.length > 0 ? pathNominal[pathNominal.length - 1] : roundCurrency(startingPortfolio);
  const terminalReal = pathReal.length > 0 ? pathReal[pathReal.length - 1] : roundCurrency(startingPortfolio);
  const minimumWealth = pathNominal.length > 0 ? Math.min(...pathNominal) : roundCurrency(startingPortfolio);

  return {
    type: "single",
    mode: metadata.mode ?? "deterministic",
    label: metadata.label ?? null,
    startYear: metadata.startYear ?? null,
    endYear: metadata.endYear ?? null,
    depleted,
    depletionYear,
    terminalNominal,
    terminalReal,
    minimumWealth,
    pathNominal,
    pathReal,
    yearlyRows,
    assumptions: {
      years,
      startingPortfolio: roundCurrency(startingPortfolio),
      annualSpending: roundCurrency(baseAnnualSpending),
      annualFees,
      allocation
    }
  };
}