
export function runMonthlyEngine(inputs) {

  const months = inputs.retirementYears * 12;

  const ledger = [];

  let portfolio = inputs.initialPortfolio;
  let spending = inputs.initialSpending;

  const monthlyReturn = Math.pow(1 + inputs.return, 1 / 12) - 1;
  const monthlyInflation = Math.pow(1 + inputs.inflation, 1 / 12) - 1;

  for (let m = 0; m < months; m++) {

    const year = Math.floor(m / 12);

    const portfolioStart = portfolio;

    const marketReturn = portfolio * monthlyReturn;

    portfolio += marketReturn;

    const withdrawal = spending / 12;

    portfolio -= withdrawal;

    if (portfolio < 0) portfolio = 0;

    ledger.push({
      month: m + 1,
      year: year + 1,
      portfolioStart,
      return: marketReturn,
      withdrawal,
      portfolioEnd: portfolio
    });

    if ((m + 1) % 12 === 0) {
      spending *= (1 + inputs.inflation);
    }
  }

  return ledger;
}
