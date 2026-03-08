export function summariseMonthlyPath(inputs, monthlyPath, modeName = 'Base case') {
  const rows = [];
  const months = monthlyPath.months || [];
  const years = chunkByYear(months);

  let currentInflationIndex = 1;

  years.forEach((yearMonths, yearIndex) => {
    if (!yearMonths.length) return;

    const firstMonth = yearMonths[0];
    const lastMonth = yearMonths[yearMonths.length - 1];
    const annualInflationRate = firstMonth.inflationRateAnnual;

    const startPortfolioNominal = firstMonth.startPortfolioNominal;
    const endPortfolioNominal = lastMonth.endPortfolioNominal;
    const spendingNominal = sum(yearMonths.map((month) => month.monthlySpendingNominal));
    const statePensionNominal = sum(yearMonths.map((month) => month.statePensionNominal));
    const withdrawalNominal = sum(yearMonths.map((month) => month.withdrawalNominal));
    const annualPortfolioReturn = yearMonths.reduce((acc, month) => acc * (1 + month.portfolioReturn), 1) - 1;

    const inflationIndexAfterYear = currentInflationIndex * (1 + annualInflationRate);

    rows.push({
      year: yearIndex + 1,
      age1: Math.floor(inputs.person1Age + yearIndex),
      age2: Math.floor(inputs.person2Age + yearIndex),
      startPortfolioNominal,
      endPortfolioNominal,
      spendingNominal,
      statePensionNominal,
      withdrawalNominal,
      inflationRate: annualInflationRate,
      equityReturn: annualiseMonthSeries(yearMonths.map((month) => month.monthlyReturns.equity)),
      bondReturn: annualiseMonthSeries(yearMonths.map((month) => month.monthlyReturns.bond)),
      cashlikeReturn: annualiseMonthSeries(yearMonths.map((month) => month.monthlyReturns.cashlike)),
      portfolioReturn: annualPortfolioReturn,
      startPortfolioReal: startPortfolioNominal / currentInflationIndex,
      endPortfolioReal: endPortfolioNominal / inflationIndexAfterYear,
      spendingReal: spendingNominal / currentInflationIndex,
      statePensionReal: statePensionNominal / currentInflationIndex,
      withdrawalReal: withdrawalNominal / currentInflationIndex
    });

    currentInflationIndex = inflationIndexAfterYear;
  });

  const pathNominal = [inputs.initialPortfolio, ...rows.map((row) => row.endPortfolioNominal)];
  const pathReal = [inputs.initialPortfolio, ...rows.map((row) => row.endPortfolioReal)];

  return {
    name: modeName,
    rows,
    months,
    pathNominal,
    pathReal,
    terminalNominal: rows.length > 0 ? rows[rows.length - 1].endPortfolioNominal : inputs.initialPortfolio,
    terminalReal: rows.length > 0 ? rows[rows.length - 1].endPortfolioReal : inputs.initialPortfolio,
    depleted: Boolean(monthlyPath.depleted),
    depletionYear: monthlyPath.depletionYear ?? null
  };
}

function chunkByYear(months) {
  const map = new Map();

  months.forEach((month) => {
    if (!map.has(month.year)) {
      map.set(month.year, []);
    }
    map.get(month.year).push(month);
  });

  return [...map.values()];
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function annualiseMonthSeries(monthlyReturns) {
  if (!monthlyReturns.length) return 0;
  return monthlyReturns.reduce((acc, value) => acc * (1 + value), 1) - 1;
}
