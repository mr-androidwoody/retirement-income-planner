export function adaptHistoricalRows(rows, inputs = {}) {
  const person1Age = toFiniteNumber(inputs.person1Age);
  const person2Age = toFiniteNumber(inputs.person2Age);

  return rows.map((row, index) => ({
    year: toFiniteNumber(row.year) || index + 1,

    age1: person1Age > 0 ? person1Age + index : '—',
    age2: person2Age > 0 ? person2Age + index : '',

    startPortfolioNominal: toFiniteNumber(row.startPortfolioNominal),
    endPortfolioNominal: toFiniteNumber(row.endPortfolioNominal),

    startPortfolioReal: toFiniteNumber(row.startPortfolioReal),
    endPortfolioReal: toFiniteNumber(row.endPortfolioReal),

    targetSpendingNominal: toFiniteNumber(row.targetSpendingNominal),
    spendingNominal: toFiniteNumber(
      row.actualSpendingNominal ?? row.spendingNominal
    ),

    targetSpendingReal: toFiniteNumber(row.targetSpendingReal),
    spendingReal: toFiniteNumber(
      row.actualSpendingReal ?? row.spendingReal
    ),

    withdrawalNominal: toFiniteNumber(row.withdrawalNominal),
    withdrawalReal: toFiniteNumber(row.withdrawalReal),

    statePensionNominal: toFiniteNumber(row.statePensionNominal),
    statePensionReal: toFiniteNumber(row.statePensionReal),

    otherIncomeNominal: toFiniteNumber(row.otherIncomeNominal),
    otherIncomeReal: toFiniteNumber(row.otherIncomeReal),

    windfallNominal: toFiniteNumber(row.windfallNominal),
    windfallReal: toFiniteNumber(row.windfallReal),

    spendingCutPercent: toFiniteNumber(row.spendingCutPercent),
    depleted: Boolean(row.depleted)
  }));
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}