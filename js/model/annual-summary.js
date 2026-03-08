
export function summariseAnnual(monthlyLedger) {
  const years = new Map();

  monthlyLedger.forEach((row) => {
    if (!years.has(row.year)) {
      years.set(row.year, {
        year: row.year,
        startPortfolioNominal: row.startPortfolioNominal,
        spendingNominal: 0,
        statePensionNominal: 0,
        withdrawalNominal: 0,
        endPortfolioNominal: row.endPortfolioNominal,
        inflationIndex: row.inflationIndex
      });
    }

    const bucket = years.get(row.year);
    bucket.spendingNominal += row.spendingNominal;
    bucket.statePensionNominal += row.statePensionNominal;
    bucket.withdrawalNominal += row.withdrawalNominal;
    bucket.endPortfolioNominal = row.endPortfolioNominal;
    bucket.inflationIndex = row.inflationIndex;
  });

  return Array.from(years.values()).map((row) => ({
    ...row,
    startPortfolioReal: row.startPortfolioNominal / row.inflationIndex,
    spendingReal: row.spendingNominal / row.inflationIndex,
    statePensionReal: row.statePensionNominal / row.inflationIndex,
    withdrawalReal: row.withdrawalNominal / row.inflationIndex,
    endPortfolioReal: row.endPortfolioNominal / row.inflationIndex
  }));
}
