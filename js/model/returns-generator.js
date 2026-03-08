function clampReturn(value, floor = -0.95, ceiling = 1.5) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(ceiling, Math.max(floor, value));
}

function createCorrelationMatrix(correlations = {}) {
  const equityBond = Number.isFinite(correlations.equityBond) ? correlations.equityBond : 0.20;
  const equityCashlike = Number.isFinite(correlations.equityCashlike) ? correlations.equityCashlike : 0.05;
  const bondCashlike = Number.isFinite(correlations.bondCashlike) ? correlations.bondCashlike : 0.35;

  return [
    [1, equityBond, equityCashlike],
    [equityBond, 1, bondCashlike],
    [equityCashlike, bondCashlike, 1]
  ];
}

function cholesky3(matrix) {
  const l11 = Math.sqrt(Math.max(matrix[0][0], 0));
  const l21 = l11 === 0 ? 0 : matrix[1][0] / l11;
  const l31 = l11 === 0 ? 0 : matrix[2][0] / l11;

  const l22Term = matrix[1][1] - l21 * l21;
  const l22 = Math.sqrt(Math.max(l22Term, 0));

  const l32 = l22 === 0 ? 0 : (matrix[2][1] - l31 * l21) / l22;

  const l33Term = matrix[2][2] - l31 * l31 - l32 * l32;
  const l33 = Math.sqrt(Math.max(l33Term, 0));

  return [
    [l11, 0, 0],
    [l21, l22, 0],
    [l31, l32, l33]
  ];
}

function multiplyLowerTriangular3(lower, vector) {
  return [
    lower[0][0] * vector[0],
    lower[1][0] * vector[0] + lower[1][1] * vector[1],
    lower[2][0] * vector[0] + lower[2][1] * vector[1] + lower[2][2] * vector[2]
  ];
}

export function sampleCorrelatedAnnualReturns({
  rng,
  means,
  volatilities,
  correlations,
  inflationMean,
  inflationVolatility = 0,
  minInflation = -0.02
}) {
  const equityVol = Math.max(0, volatilities.equities ?? 0);
  const bondVol = Math.max(0, volatilities.bonds ?? 0);
  const cashlikeVol = Math.max(0, volatilities.cashlike ?? 0);
  const inflationVol = Math.max(0, inflationVolatility ?? 0);

  const allDeterministic =
    equityVol === 0 &&
    bondVol === 0 &&
    cashlikeVol === 0 &&
    inflationVol === 0;

  if (allDeterministic) {
    return {
      equities: clampReturn(means.equities, -0.95, 2.0),
      bonds: clampReturn(means.bonds, -0.95, 1.0),
      cashlike: clampReturn(means.cashlike, -0.50, 0.50),
      inflation: Math.max(minInflation, inflationMean)
    };
  }

  const correlationMatrix = createCorrelationMatrix(correlations);
  const lower = cholesky3(correlationMatrix);

  const z = [
    sampleStandardNormal(rng),
    sampleStandardNormal(rng),
    sampleStandardNormal(rng)
  ];

  const correlatedZ = multiplyLowerTriangular3(lower, z);

  const equities = clampReturn(
    means.equities + correlatedZ[0] * equityVol,
    -0.95,
    2.0
  );

  const bonds = clampReturn(
    means.bonds + correlatedZ[1] * bondVol,
    -0.95,
    1.0
  );

  const cashlike = clampReturn(
    means.cashlike + correlatedZ[2] * cashlikeVol,
    -0.50,
    0.50
  );

  let inflation = inflationMean;

  if (inflationVol > 0) {
    const inflationShock =
      0.35 * correlatedZ[1] -
      0.20 * correlatedZ[0] +
      0.15 * correlatedZ[2] +
      sampleStandardNormal(rng) * inflationVol;

    inflation = Math.max(minInflation, inflationMean + inflationShock);
  }

  return {
    equities,
    bonds,
    cashlike,
    inflation
  };
}

function sampleStandardNormal(rng) {
  let u1 = 0;
  let u2 = 0;

  while (u1 <= Number.EPSILON) u1 = rng();
  while (u2 <= Number.EPSILON) u2 = rng();

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}