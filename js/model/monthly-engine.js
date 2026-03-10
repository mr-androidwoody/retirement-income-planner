import {
  initialiseBuckets,
  applyAssetReturns,
  withdrawFromBuckets,
  rebalanceBuckets,
  totalPortfolio
} from './cashflow.js';

export function runMonthlyEngine(inputs) {
  const allocations = {
    equities: inputs.equityAllocation,
    bonds: inputs.bondAllocation,
    cashlike: inputs.cashlikeAllocation
  };

  let buckets = initialiseBuckets(inputs.initialPortfolio, allocations);
  let spending = inputs.initialSpending;
  let inflationIndex = 1;
  const ledger = [];

  for (let month = 1; month <= inputs.years * 12; month += 1) {
    const monthIndex = month - 1;
    const yearIndex = Math.floor(monthIndex / 12);
    const monthInYear = monthIndex % 12;

    const monthlyReturns = {
      equities: Math.pow(1 + inputs.equityReturn, 1 / 12) - 1,
      bonds: Math.pow(1 + inputs.bondReturn, 1 / 12) - 1,
      cashlike: Math.pow(1 + inputs.cashlikeReturn, 1 / 12) - 1
    };

    const monthlyInflation = Math.pow(1 + inputs.inflation, 1 / 12) - 1;

    const start = totalPortfolio(buckets);

    const p1Eligible = inputs.person1Age + yearIndex >= inputs.person1PensionAge;
    const p2Eligible = inputs.person2Age + yearIndex >= inputs.person2PensionAge;

    const pensionAnnual =
      (p1Eligible ? inputs.person1PensionToday * inflationIndex : 0) +
      (p2Eligible ? inputs.person2PensionToday * inflationIndex : 0);

    const otherIncomeAnnual =
      yearIndex < inputs.otherIncomeYears
        ? inputs.otherIncomeToday * inflationIndex
        : 0;

    const windfallAnnual =
      monthInYear === 0 && inputs.windfallYear > 0 && yearIndex + 1 === inputs.windfallYear
        ? inputs.windfallAmount
        : 0;

    const pensionMonthly = pensionAnnual / 12;
    const otherIncomeMonthly = otherIncomeAnnual / 12;
    const windfallMonthly = windfallAnnual;

    const targetSpendingMonthly = spending / 12;
    const totalIncomeMonthly = pensionMonthly + otherIncomeMonthly + windfallMonthly;

    const requiredWithdrawal = Math.max(0, targetSpendingMonthly - totalIncomeMonthly);
    const actualWithdrawal = withdrawFromBuckets(buckets, requiredWithdrawal);

    const actualSpendingMonthly = totalIncomeMonthly + actualWithdrawal;

    const surplusIncome = Math.max(0, totalIncomeMonthly - targetSpendingMonthly);
    if (surplusIncome > 0) {
      buckets.cashlike += surplusIncome;
    }

    applyAssetReturns(buckets, monthlyReturns);

    if (monthInYear === 11 && inputs.rebalanceToTarget) {
      buckets = rebalanceBuckets(buckets, allocations);
    }

    ledger.push({
      month,
      year: yearIndex + 1,
      startPortfolioNominal: start,
      targetSpendingNominal: targetSpendingMonthly,
      spendingNominal: actualSpendingMonthly,
      statePensionNominal: pensionMonthly,
      otherIncomeNominal: otherIncomeMonthly,
      windfallNominal: windfallMonthly,
      withdrawalNominal: actualWithdrawal,
      endPortfolioNominal: totalPortfolio(buckets),
      inflationIndex
    });

    inflationIndex *= 1 + monthlyInflation;

    if (monthInYear === 11) {
      spending *= 1 + inputs.inflation;
    }
  }

  return ledger;
}