export function renderSpendingChart(canvas, result, useReal, formatCurrency, cutDiagnostics = {}) {
  if (!result?.baseCase?.rows) return;

  const rows = result.baseCase.rows;

  const pensionValues = rows.map(r =>
    useReal ? r.statePensionReal : r.statePensionNominal
  );

  const otherIncomeValues = rows.map(r =>
    useReal ? r.otherIncomeReal : r.otherIncomeNominal
  );

  const withdrawalValues = rows.map((r, i) => {
    const spending = useReal ? r.actualSpendingReal : r.actualSpendingNominal;
    return Math.max(0, spending - pensionValues[i] - otherIncomeValues[i]);
  });

  const cutYears = rows.map((r, i) => ({
    index: i,
    cut: r.spendingCutPercent || 0
  })).filter(x => x.cut > 0);

  drawLineChart(canvas, {
    labels: rows.map(r => r.year),

    stackedAreas: [
      {
        label: 'Other income',
        values: otherIncomeValues,
        color: 'rgba(5,150,105,0.18)',
        strokeColor: '#059669'
      },
      {
        label: 'State pension income',
        values: pensionValues,
        color: 'rgba(249,115,22,0.25)',
        strokeColor: '#f97316'
      },
      {
        label: 'Portfolio withdrawals',
        values: withdrawalValues,
        color: 'rgba(220,38,38,0.18)',
        strokeColor: '#dc2626'
      }
    ],

    lines: [
      {
        label: 'Planned household spending',
        values: rows.map(r =>
          useReal ? r.targetSpendingReal : r.targetSpendingNominal
        ),
        color: '#7c3aed',
        width: 2,
        dash: [8,6]
      },
      {
        label: 'Actual spending after guardrails',
        values: rows.map(r =>
          useReal ? r.actualSpendingReal : r.actualSpendingNominal
        ),
        color: '#4f46e5',
        width: 3,
        markers: cutYears.map(c => c.index)
      }
    ],

    verticalMarkers: [
      cutDiagnostics?.firstCutYear != null
        ? { index: cutDiagnostics.firstCutYear, color: '#f59e0b' }
        : null,
      cutDiagnostics?.worstCutYear != null
        ? { index: cutDiagnostics.worstCutYear, color: '#ef4444' }
        : null
    ].filter(Boolean),

    yFormatter: formatCurrency
  });
}