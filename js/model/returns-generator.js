/**
 * Convert arithmetic mean and volatility to log-normal (μ_log, σ_log) parameters.
 *
 * For a log-normally distributed return R, if we want:
 *   E[R]   = arithmeticMean  (arithmetic average of single-period returns)
 *   Std[R] = arithmeticVol
 *
 * Then the underlying normal distribution of ln(1+R) has:
 *   σ_log = sqrt( ln(1 + (vol / (1 + mean))^2 ) )
 *   μ_log = ln(1 + mean) - σ_log^2 / 2
 *
 * Sampling: R = exp(μ_log + z * σ_log) - 1
 *
 * This correctly captures volatility drag so that the geometric (compound)
 * mean over many years is lower than the arithmetic mean, matching real
 * asset-return behaviour.
 */
export function toLogNormalParams(arithmeticMean, arithmeticVol) {
  if (arithmeticVol <= 0) {
    return { muLog: Math.log(1 + arithmeticMean), sigmaLog: 0 };
  }
  const sigmaLog = Math.sqrt(Math.log(1 + Math.pow(arithmeticVol / (1 + arithmeticMean), 2)));
  const muLog = Math.log(1 + arithmeticMean) - 0.5 * sigmaLog * sigmaLog;
  return { muLog, sigmaLog };
}


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

export function cholesky3(matrix) {
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

  // Convert arithmetic mean/vol inputs to log-normal parameters, then sample.
  // This correctly models volatility drag over multi-year horizons.
  const eqParams = toLogNormalParams(means.equities, equityVol);
  const bondParams = toLogNormalParams(means.bonds, bondVol);
  const cashParams = toLogNormalParams(means.cashlike, cashlikeVol);

  const equities = clampReturn(
    Math.exp(eqParams.muLog + correlatedZ[0] * eqParams.sigmaLog) - 1,
    -0.95,
    2.0
  );

  const bonds = clampReturn(
    Math.exp(bondParams.muLog + correlatedZ[1] * bondParams.sigmaLog) - 1,
    -0.95,
    1.0
  );

  const cashlike = clampReturn(
    Math.exp(cashParams.muLog + correlatedZ[2] * cashParams.sigmaLog) - 1,
    -0.50,
    0.50
  );

  let inflation = inflationMean;

  if (inflationVol > 0) {
    // Inflation correlates weakly with asset returns (bond=+0.35, equity=-0.20, cashlike=+0.15).
    // Scale the correlated component by inflationVol so total inflation variance stays controlled.
    // Residual weight sqrt(1 - 0.35^2 - 0.20^2 - 0.15^2) = sqrt(0.7350) ≈ 0.857 preserves
    // unit variance in the combined shock before multiplying by inflationVol.
    const correlatedComponent =
      (0.35 * correlatedZ[1] -
       0.20 * correlatedZ[0] +
       0.15 * correlatedZ[2]) * inflationVol;

    const residualWeight = Math.sqrt(1 - 0.35 * 0.35 - 0.20 * 0.20 - 0.15 * 0.15);
    const residualComponent = sampleStandardNormal(rng) * inflationVol * residualWeight;

    inflation = Math.max(minInflation, inflationMean + correlatedComponent + residualComponent);
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