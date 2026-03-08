export function totalPortfolio(balances) {
  return balances.equity + balances.bond + balances.cashlike;
}

export function withdrawFromBuckets(balances, amountNeeded) {
  let remaining = Math.max(0, amountNeeded);
  let withdrawn = 0;
  const order = ["cashlike", "bond", "equity"];

  for (const bucket of order) {
    if (remaining <= 0) break;
    const available = balances[bucket];
    const take = Math.min(available, remaining);
    balances[bucket] -= take;
    withdrawn += take;
    remaining -= take;
  }

  return withdrawn;
}

export function rebalance(balances, targets) {
  const total = totalPortfolio(balances);

  return {
    equity: total * targets.equity,
    bond: total * targets.bond,
    cashlike: total * targets.cashlike
  };
}

export function weightedReturn(balances, returns) {
  const total = totalPortfolio(balances);
  if (total <= 0) return 0;

  return (
    (balances.equity / total) * returns.equity +
    (balances.bond / total) * returns.bond +
    (balances.cashlike / total) * returns.cashlike
  );
}
