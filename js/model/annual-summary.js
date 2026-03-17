export function summariseAnnual(monthlyLedger) {
  const years = new Map();

  monthlyLedger.forEach((row) => {
    if (!years.has(row.year)) {
      years.set(row.year, {
        year: row.year,
        startPortfolioNominal: row.startPortfolioNominal,
        targetSpendingNominal: 0,
        spendingNominal: 0,
        statePensionNominal: 0,
        otherIncomeNominal: 0,
        windfallNominal: 0,
        withdrawalNominal: 0,
        endPortfolioNominal: row.endPortfolioNominal,
        inflationIndex: row.inflationIndex
      });
    }

    const bucket = years.get(row.year);
    bucket.targetSpendingNominal += row.targetSpendingNominal ?? row.spendingNominal;
    bucket.spendingNominal += row.spendingNominal;    
    bucket.statePensionNominal += row.statePensionNominal;
    bucket.otherIncomeNominal += row.otherIncomeNominal ?? 0;
    bucket.windfallNominal += row.windfallNominal ?? 0;
    bucket.withdrawalNominal += row.withdrawalNominal;
    bucket.endPortfolioNominal = row.endPortfolioNominal;
    bucket.inflationIndex = row.inflationIndex;
  });

  return Array.from(years.values()).map((row) => ({
    ...row,
    startPortfolioReal: row.startPortfolioNominal / row.inflationIndex,
    targetSpendingReal: row.targetSpendingNominal / row.inflationIndex,
    spendingReal: row.spendingNominal / row.inflationIndex,
    statePensionReal: row.statePensionNominal / row.inflationIndex,
    otherIncomeReal: row.otherIncomeNominal / row.inflationIndex,
    windfallReal: row.windfallNominal / row.inflationIndex,
    withdrawalReal: row.withdrawalNominal / row.inflationIndex,
    endPortfolioReal: row.endPortfolioNominal / row.inflationIndex
  }));
}
