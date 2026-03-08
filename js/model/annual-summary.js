
export function summariseAnnual(ledger) {

  const years = {};

  ledger.forEach(row => {

    if (!years[row.year]) {
      years[row.year] = {
        year: row.year,
        portfolioStart: row.portfolioStart,
        withdrawals: 0,
        returns: 0,
        portfolioEnd: row.portfolioEnd
      };
    }

    years[row.year].withdrawals += row.withdrawal;
    years[row.year].returns += row.return;
    years[row.year].portfolioEnd = row.portfolioEnd;

  });

  return Object.values(years);
}
