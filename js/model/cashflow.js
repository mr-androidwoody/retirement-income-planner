
export function applyWithdrawal(portfolio, withdrawal) {

  const result = portfolio - withdrawal;

  if (result < 0) return 0;

  return result;
}
