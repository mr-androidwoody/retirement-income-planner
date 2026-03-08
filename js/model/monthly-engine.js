import { rebalance, totalPortfolio, weightedReturn, withdrawFromBuckets } from './cashflow.js';

export function runMonthlyPath(inputs, mode) {
  const targets = {
    equity: inputs.equityAllocation / 100,
    bond: inputs.bondAllocation / 100,
    cashlike: inputs.cashlikeAllocation / 100
  };

  let balances = {
    equity: inputs.initialPortfolio * targets.equity,
    bond: inputs.initialPortfolio * targets.bond,
    cashlike: inputs.initialPortfolio * targets.cashlike
  };

  const months = [];
  const initialWithdrawalRate = inputs.initialPortfolio > 0 ? inputs.initialSpending / inputs.initialPortfolio : 0;
  let annualSpending = inputs.initialSpending;
  let depleted = false;
  let depletionYear = null;
  let inflationIndexStartOfYear = 1;
  let previousAnnualPortfolioReturn = null;

  for (let yearIndex = 0; yearIndex < inputs.years; yearIndex += 1) {
    const yearNumber = yearIndex + 1;
    const annualInflationRate = getYearInflationRate(inputs, mode, yearIndex);
    const annualReturns = getYearAssetReturns(inputs, mode, yearIndex);

    const startPortfolio = totalPortfolio(balances);

    if (yearIndex > 0) {
      const skipInflation =
        inputs.skipInflationAfterNegative && previousAnnualPortfolioReturn !== null && previousAnnualPortfolioReturn < 0;

      if (!skipInflation) {
        annualSpending *= 1 + annualInflationRate;
      }

      if (startPortfolio > 0) {
        const currentWithdrawalRate = annualSpending / startPortfolio;
        if (currentWithdrawalRate > initialWithdrawalRate * (1 + inputs.upperGuardrail)) {
          annualSpending *= 1 - inputs.adjustmentSize;
        } else if (currentWithdrawalRate < initialWithdrawalRate * (1 - inputs.lowerGuardrail)) {
          annualSpending *= 1 + inputs.adjustmentSize;
        }
      }
    }

    const monthlyInflationRate = annualToMonthlyRate(annualInflationRate);
    const monthlyReturns = {
      equity: annualToMonthlyRate(annualReturns.equity),
      bond: annualToMonthlyRate(annualReturns.bond),
      cashlike: annualToMonthlyRate(annualReturns.cashlike)
    };

    const annualCompoundedReturnParts = [];

    for (let monthInYear = 0; monthInYear < 12; monthInYear += 1) {
      const absoluteMonth = yearIndex * 12 + monthInYear;
      const monthNumber = absoluteMonth + 1;
      const startOfMonthBalances = { ...balances };
      const startPortfolioMonth = totalPortfolio(startOfMonthBalances);
      const inflationIndexStartOfMonth = inflationIndexStartOfYear * (1 + monthlyInflationRate) ** monthInYear;

      const person1PensionMonthly = getMonthlyStatePension({
        currentAge: inputs.person1Age,
        pensionAge: inputs.person1PensionAge,
        pensionToday: inputs.person1PensionToday,
        absoluteMonth,
        inflationIndexStartOfMonth
      });
      const person2PensionMonthly = getMonthlyStatePension({
        currentAge: inputs.person2Age,
        pensionAge: inputs.person2PensionAge,
        pensionToday: inputs.person2PensionToday,
        absoluteMonth,
        inflationIndexStartOfMonth
      });

      const monthlySpending = annualSpending / 12;
      const totalStatePensionMonthly = person1PensionMonthly + person2PensionMonthly;
      const withdrawalNeeded = Math.max(0, monthlySpending - totalStatePensionMonthly);
      const withdrawalActual = withdrawFromBuckets(balances, withdrawalNeeded);

      if (withdrawalActual < withdrawalNeeded && !depleted) {
        depleted = true;
        depletionYear = yearNumber;
      }

      const afterWithdrawalBalances = { ...balances };
      const afterWithdrawalTotal = totalPortfolio(afterWithdrawalBalances);
      const portfolioReturnBeforeGrowth = weightedReturn(afterWithdrawalBalances, monthlyReturns);
      annualCompoundedReturnParts.push(1 + portfolioReturnBeforeGrowth);

      balances = {
        equity: Math.max(0, balances.equity * (1 + monthlyReturns.equity)),
        bond: Math.max(0, balances.bond * (1 + monthlyReturns.bond)),
        cashlike: Math.max(0, balances.cashlike * (1 + monthlyReturns.cashlike))
      };

      const endPortfolioBeforeRebalance = totalPortfolio(balances);
      const shouldRebalance = inputs.rebalanceToTarget && monthInYear === 11;
      if (shouldRebalance) {
        balances = rebalance(balances, targets);
      }

      const inflationIndexEndOfMonth = inflationIndexStartOfMonth * (1 + monthlyInflationRate);
      const age1 = inputs.person1Age + absoluteMonth / 12;
      const age2 = inputs.person2Age + absoluteMonth / 12;

      months.push({
        month: monthNumber,
        year: yearNumber,
        monthInYear: monthInYear + 1,
        age1,
        age2,
        annualSpendingNominal: annualSpending,
        monthlySpendingNominal: monthlySpending,
        statePensionNominal: totalStatePensionMonthly,
        withdrawalNominal: withdrawalActual,
        inflationRateMonthly: monthlyInflationRate,
        inflationRateAnnual: annualInflationRate,
        monthlyReturns,
        portfolioReturn: afterWithdrawalTotal > 0 ? portfolioReturnBeforeGrowth : 0,
        startBalancesNominal: startOfMonthBalances,
        afterWithdrawalBalancesNominal: afterWithdrawalBalances,
        endBalancesNominal: { ...balances },
        startPortfolioNominal: startPortfolioMonth,
        endPortfolioBeforeRebalanceNominal: endPortfolioBeforeRebalance,
        endPortfolioNominal: totalPortfolio(balances),
        inflationIndexStartOfMonth,
        inflationIndexEndOfMonth,
        rebalanced: shouldRebalance
      });

      if (depleted) {
        balances = { equity: 0, bond: 0, cashlike: 0 };
      }
    }

    previousAnnualPortfolioReturn = annualCompoundedReturnParts.reduce((acc, value) => acc * value, 1) - 1;
    inflationIndexStartOfYear *= 1 + annualInflationRate;
  }

  return {
    months,
    depleted,
    depletionYear
  };
}

function getMonthlyStatePension({ currentAge, pensionAge, pensionToday, absoluteMonth, inflationIndexStartOfMonth }) {
  const monthsUntilPension = Math.max(0, Math.round((pensionAge - currentAge) * 12));
  if (absoluteMonth < monthsUntilPension) {
    return 0;
  }

  return (pensionToday * inflationIndexStartOfMonth) / 12;
}

function annualToMonthlyRate(annualRate) {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function getYearInflationRate(inputs, mode, yearIndex) {
  if (mode.type === 'scenario') {
    return mode.scenario.inflationRates[yearIndex] ?? inputs.inflation;
  }

  if (mode.type === 'montecarlo') {
    return clamp(randomNormal(mode.rng, inputs.inflation, Math.max(0.0025, inputs.inflation * 0.35)), -0.01, 0.12);
  }

  return inputs.inflation;
}

function getYearAssetReturns(inputs, mode, yearIndex) {
  if (mode.type === 'scenario') {
    return {
      equity: mode.scenario.equityReturns[yearIndex] ?? inputs.equityReturn,
      bond: mode.scenario.bondReturns[yearIndex] ?? inputs.bondReturn,
      cashlike: mode.scenario.cashlikeReturns[yearIndex] ?? inputs.cashlikeReturn
    };
  }

  if (mode.type === 'montecarlo') {
    return {
      equity: clamp(randomNormal(mode.rng, inputs.equityReturn, inputs.equityVolatility), -0.95, 1.5),
      bond: clamp(randomNormal(mode.rng, inputs.bondReturn, inputs.bondVolatility), -0.6, 0.6),
      cashlike: clamp(randomNormal(mode.rng, inputs.cashlikeReturn, inputs.cashlikeVolatility), -0.1, 0.2)
    };
  }

  return {
    equity: inputs.equityReturn,
    bond: inputs.bondReturn,
    cashlike: inputs.cashlikeReturn
  };
}

function randomNormal(rng, mean, standardDeviation) {
  let u = 0;
  let v = 0;

  while (u === 0) u = rng();
  while (v === 0) v = rng();

  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * standardDeviation;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
