export function adaptHistoricalRows(rows) {
  return rows.map((row, index) => ({
    year: index + 1,

    age1: '',
    age2: '',

    startPortfolioNominal: row.startPortfolio,
    endPortfolioNominal: row.endPortfolio,

    startPortfolioReal: row.startPortfolio,
    endPortfolioReal: row.endPortfolio,

    targetSpendingNominal: row.targetSpending,
    spendingNominal: row.actualSpending,

    targetSpendingReal: row.targetSpending,
    spendingReal: row.actualSpending,

    withdrawalNominal: row.portfolioWithdrawal,
    withdrawalReal: row.portfolioWithdrawal,

    statePensionNominal: row.statePension,
    statePensionReal: row.statePension,

    otherIncomeNominal: row.otherIncome,
    otherIncomeReal: row.otherIncome,

    windfallNominal: row.windfall,
    windfallReal: row.windfall,

    spendingCutPercent: row.cut,
    depleted: row.depleted
  }));
}