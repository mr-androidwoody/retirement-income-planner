export function adaptHistoricalRows(rows, inputs = {}) {
  const person1Age = toFiniteNumber(inputs.person1Age);
  const person2Age = toFiniteNumber(inputs.person2Age);
  const includePerson2 = Boolean(inputs.includePerson2);

  let inflationIndex = 1;

  return rows.map((row, index) => {
    const inflation = 1 + toFiniteNumber(row.inflation);
    const safeInflationIndex = inflationIndex > 0 ? inflationIndex : 1;

    const adaptedRow = {
      year: index + 1,

      age1: person1Age > 0 ? person1Age + index : '—',
      age2: includePerson2 && person2Age > 0 ? person2Age + index : '',

      startPortfolioNominal: toFiniteNumber(row.startPortfolio),
      endPortfolioNominal: toFiniteNumber(row.endPortfolio),

      startPortfolioReal: toFiniteNumber(row.startPortfolio) / safeInflationIndex,
      endPortfolioReal: toFiniteNumber(row.endPortfolio) / safeInflationIndex,

      targetSpendingNominal: toFiniteNumber(row.targetSpending),
      spendingNominal: toFiniteNumber(row.actualSpending),

      targetSpendingReal: toFiniteNumber(row.targetSpending) / safeInflationIndex,
      spendingReal: toFiniteNumber(row.actualSpending) / safeInflationIndex,

      withdrawalNominal: toFiniteNumber(row.portfolioWithdrawal),
      withdrawalReal: toFiniteNumber(row.portfolioWithdrawal) / safeInflationIndex,

      statePensionNominal: toFiniteNumber(row.statePension),
      statePensionReal: toFiniteNumber(row.statePension) / safeInflationIndex,

      otherIncomeNominal: toFiniteNumber(row.otherIncome),
      otherIncomeReal: toFiniteNumber(row.otherIncome) / safeInflationIndex,

      windfallNominal: toFiniteNumber(row.windfall),
      windfallReal: toFiniteNumber(row.windfall) / safeInflationIndex,

      spendingCutPercent: toFiniteNumber(row.cut),
      depleted: Boolean(row.depleted)
    };

    inflationIndex *= inflation > 0 ? inflation : 1;

    return adaptedRow;
  });
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}