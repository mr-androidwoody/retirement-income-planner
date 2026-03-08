
export function initialiseBuckets(totalPortfolio, allocations) {
  return {
    equities: totalPortfolio * allocations.equities,
    bonds: totalPortfolio * allocations.bonds,
    cashlike: totalPortfolio * allocations.cashlike
  };
}

export function totalPortfolio(buckets) {
  return Math.max(0, buckets.equities + buckets.bonds + buckets.cashlike);
}

export function applyAssetReturns(buckets, annualReturns) {
  buckets.equities *= 1 + annualReturns.equities;
  buckets.bonds *= 1 + annualReturns.bonds;
  buckets.cashlike *= 1 + annualReturns.cashlike;
  return buckets;
}

export function withdrawFromBuckets(buckets, amount) {
  let remaining = Math.max(0, amount);
  const order = ['cashlike', 'bonds', 'equities'];
  let withdrawn = 0;

  order.forEach((asset) => {
    if (remaining <= 0) return;
    const available = Math.max(0, buckets[asset]);
    const draw = Math.min(available, remaining);
    buckets[asset] -= draw;
    remaining -= draw;
    withdrawn += draw;
  });

  return withdrawn;
}

export function rebalanceBuckets(buckets, allocations) {
  const total = totalPortfolio(buckets);
  return {
    equities: total * allocations.equities,
    bonds: total * allocations.bonds,
    cashlike: total * allocations.cashlike
  };
}

export function weightedAverageReturn({ allocations, returns }) {
  return (
    allocations.equities * returns.equities +
    allocations.bonds * returns.bonds +
    allocations.cashlike * returns.cashlike
  );
}
