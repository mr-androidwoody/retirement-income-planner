export function renderPortfolioChart(canvas, result, useReal, formatCurrency, tableView = 'median') {
  if (!canvas || !result?.inputs) return;

  const mode = String(result?.mode ?? '').toLowerCase();
  const isHistorical = mode === 'historical';

  const hasMonteCarlo =
    Boolean(result?.monteCarlo?.realPercentiles) &&
    Boolean(result?.monteCarlo?.nominalPercentiles);

  const historicalRows =
    result?.selectedPath?.yearlyRows ||
    result?.selectedPath?.rows ||
    [];

  const historicalPath = historicalRows.map((row) =>
    Number(
      useReal
        ? (
            row?.endPortfolioReal ??
            row?.portfolioReal ??
            row?.endingPortfolioReal ??
            row?.endPortfolio ??
            row?.portfolio ??
            0
          )
        : (
            row?.endPortfolioNominal ??
            row?.portfolioNominal ??
            row?.endingPortfolioNominal ??
            row?.endPortfolio ??
            row?.portfolio ??
            0
          )
    )
  );

  const basePath = isHistorical
    ? historicalPath
    : (
        useReal
          ? (result?.baseCase?.pathReal || [])
          : (result?.baseCase?.pathNominal || [])
      );

  if (!basePath.length) return;

  const labels = buildYearLabels(basePath.length - 1);
  const verticalMarkers = [];

  const p1Amount = Number(result.inputs?.person1WindfallAmount);
  const p1Year = Number(result.inputs?.person1WindfallYear);

  if (
    Number.isFinite(p1Amount) &&
    p1Amount > 0 &&
    Number.isFinite(p1Year) &&
    p1Year >= 0 &&
    p1Year <= result.inputs.years
  ) {
    verticalMarkers.push({
      index: p1Year,
      color: '#dc2626',
      label: `${result.inputs?.person1Name || 'Person 1'} windfall £${Math.round(p1Amount).toLocaleString()}`
    });
  }

  const p2Amount = Number(result.inputs?.person2WindfallAmount);
  const p2Year = Number(result.inputs?.person2WindfallYear);

  if (
    Number.isFinite(p2Amount) &&
    p2Amount > 0 &&
    Number.isFinite(p2Year) &&
    p2Year >= 0 &&
    p2Year <= result.inputs.years
  ) {
    verticalMarkers.push({
      index: p2Year,
      color: '#dc2626',
      label: `${result.inputs?.person2Name || 'Person 2'} windfall £${Math.round(p2Amount).toLocaleString()}`
    });
  }

  const person1YearsToPension =
    Number.isFinite(result.inputs?.person1Age) &&
    Number.isFinite(result.inputs?.person1PensionAge)
      ? Math.max(0, result.inputs.person1PensionAge - result.inputs.person1Age)
      : null;

  const person2YearsToPension =
    result.inputs?.includePerson2 &&
    Number.isFinite(result.inputs?.person2Age) &&
    Number.isFinite(result.inputs?.person2PensionAge)
      ? Math.max(0, result.inputs.person2PensionAge - result.inputs.person2Age)
      : null;

  if (person1YearsToPension != null && person1YearsToPension <= result.inputs.years) {
    verticalMarkers.push({
      index: person1YearsToPension,
      color: '#0f766e',
      label: `${result.inputs?.person1Name || 'Person 1'} state pension`
    });
  }

  if (person2YearsToPension != null && person2YearsToPension <= result.inputs.years) {
    verticalMarkers.push({
      index: person2YearsToPension,
      color: '#7c3aed',
      label: `${result.inputs?.person2Name || 'Person 2'} state pension`
    });
  }

    const chartConfig = {
    labels,
    lines: isHistorical || !hasMonteCarlo
      ? [
          {
            label: isHistorical ? 'Selected historical path' : 'Portfolio path',
            values: basePath,
            color: '#2d5bff',
            width: 3
          }
        ]
      : [
          {
            label: 'Typical outcome',
            values: useReal
              ? result.monteCarlo.realPercentiles.p50
              : result.monteCarlo.nominalPercentiles.p50,
            color: '#2d5bff',
            width: 2
          },
          {
            label: 'Base case',
            values: basePath,
            color: '#0f766e',
            width: 2.5
          }
        ],
    verticalMarkers,
    yFormatter: formatCurrency
  };

  if (!isHistorical && hasMonteCarlo) {
    const p10Values = useReal
      ? result.monteCarlo.realPercentiles.p10
      : result.monteCarlo.nominalPercentiles.p10;

    const p90Values = useReal
      ? result.monteCarlo.realPercentiles.p90
      : result.monteCarlo.nominalPercentiles.p90;

    const p25Values = useReal
      ? result.monteCarlo.realPercentiles.p25
      : result.monteCarlo.nominalPercentiles.p25;
    
    const p75Values = useReal
      ? result.monteCarlo.realPercentiles.p75
      : result.monteCarlo.nominalPercentiles.p75;
    
    chartConfig.bands = [
      {
        lower: p10Values,
        upper: p90Values,
        fillStyle: 'rgba(45, 91, 255, 0.12)',
        label: 'Full range of outcomes'
      },
      {
        lower: p25Values,
        upper: p75Values,
        fillStyle: 'rgba(45, 91, 255, 0.22)',
        label: 'Likely range'
      }
    ];

    if (tableView === 'p90') {
      chartConfig.overlayLine = {
        label: 'Upside path',
        values: p90Values,
        color: '#7c3aed',
        width: 2.5,
        dash: [7, 6]
      };
    } else if (tableView === 'p10') {
      chartConfig.overlayLine = {
        label: 'Downside path',
        values: p10Values,
        color: '#dc2626',
        width: 2.5,
        dash: [7, 6]
      };
    }
  }

  drawLineChart(canvas, chartConfig);
}

export function renderSpendingChart(canvas, rows, useReal, formatCurrency, cutDiagnostics = {}) {
  if (!Array.isArray(rows) || !rows.length) return;

  const targetValues = rows.map((r) =>
    useReal ? r.targetSpendingReal : r.targetSpendingNominal
  );

  const actualValues = rows.map((r) =>
    useReal ? r.spendingReal : r.spendingNominal
  );

  const pensionValues = rows.map((r) =>
    useReal ? r.statePensionReal : r.statePensionNominal
  );

  const otherIncomeValues = rows.map((r) =>
    useReal ? r.otherIncomeReal : r.otherIncomeNominal
  );

const withdrawalValues = rows.map((r) => {
  const value = useReal ? r.withdrawalReal : r.withdrawalNominal;
  return Math.max(0, Number.isFinite(value) ? value : 0);
});
    
  const cutYears = rows
    .map((r, i) => ({
      index: i,
      cut: r.spendingCutPercent || 0
    }))
    .filter((x) => x.cut > 0);

    drawLineChart(canvas, {
      labels: rows.map((r) => r.year),
    
      stackedAreas: [
        {
          label: 'Other income',
          values: otherIncomeValues,
          color: 'rgba(16,185,129,0.25)',   // clearer green
          strokeColor: '#10b981'
        },
        {
          label: 'State pension income',
          values: pensionValues,
          color: 'rgba(245,158,11,0.28)',   // amber (distinct from green/red)
          strokeColor: '#f59e0b'
        },
        {
          label: 'Withdrawals from portfolio',
          values: withdrawalValues,
          color: 'rgba(59,130,246,0.25)',   // blue fill
          strokeColor: '#3b82f6'            // blue line
        }
      ],
    
      gapBand: {
        upper: targetValues,
        lower: actualValues,
        fillStyle: 'rgba(220, 38, 38, 0.12)',  // lighter, less dominant
        strokeStyle: '#b91c1c',                // darker edge for clarity
        label: 'Spending shortfall'
      },
    
      lines: [
        {
          label: 'Planned household spending',
          values: targetValues,
          color: '#7c3aed',
          width: 2,
          dash: [8, 6]
        },
        {
          label: 'Actual spending after guardrails',
          values: actualValues,
          color: '#4f46e5',
          width: 3,
          markers: cutYears.map((c) => c.index)
        }
      ],

    verticalMarkers: [
      cutDiagnostics?.firstCutYear != null
        ? { index: cutDiagnostics.firstCutYear - 1, color: '#f59e0b', label: 'First cut' }
        : null,
      cutDiagnostics?.worstCutYear != null
        ? { index: cutDiagnostics.worstCutYear - 1, color: '#ef4444', label: 'Worst cut' }
        : null,
      cutDiagnostics?.firstShortfallYear != null
        ? { index: cutDiagnostics.firstShortfallYear - 1, color: '#dc2626', label: 'First shortfall' }
        : null,
      cutDiagnostics?.worstShortfallYear != null
        ? { index: cutDiagnostics.worstShortfallYear - 1, color: '#7f1d1d', label: 'Worst shortfall' }
        : null
    ].filter(Boolean),

    pointHighlights: [
      cutDiagnostics?.firstShortfallYear != null
        ? {
            index: cutDiagnostics.firstShortfallYear - 1,
            values: targetValues,
            color: '#dc2626',
            label: 'Shortfall begins'
          }
        : null,
      cutDiagnostics?.worstShortfallYear != null
        ? {
            index: cutDiagnostics.worstShortfallYear - 1,
            values: targetValues,
            color: '#7f1d1d',
            label: 'Worst shortfall'
          }
        : null
    ].filter(Boolean),

    yFormatter: formatCurrency
  });
}

function buildYearLabels(years) {
  return Array.from({ length: years + 1 }, (_, i) => i);
}

function drawLineChart(canvas, config) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const state = canvas.__chartHoverState || {
    hoverX: null,
    hoverY: null,
    isHovering: false,
    listenersBound: false
  };

  canvas.__chartHoverState = state;
  canvas.__chartConfig = config;
  canvas.__legendHitboxes = [];

  if (!state.listenersBound) {
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      state.hoverX = event.clientX - rect.left;
      state.hoverY = event.clientY - rect.top;
      state.isHovering = true;
      drawLineChart(canvas, canvas.__chartConfig);
    });

    canvas.addEventListener('mouseleave', () => {
      state.hoverX = null;
      state.hoverY = null;
      state.isHovering = false;
      drawLineChart(canvas, canvas.__chartConfig);
    });

    state.listenersBound = true;
  }

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  const width = Math.max(420, Math.floor(rect.width || canvas.clientWidth || 420));
  const baseHeight = Number(canvas.dataset.baseHeight || canvas.getAttribute('height')) || 320;
  canvas.dataset.baseHeight = String(baseHeight);

  ctx.font = '12px Inter, system-ui, sans-serif';

  const isInvestmentProjectionLegend =
    Array.isArray(config.lines) &&
    config.lines.some((line) => line?.label === 'Base case') &&
    config.lines.some((line) => line?.label === 'Typical outcome') &&
    Array.isArray(config.bands) &&
    config.bands.length >= 2;

  const legendItems = [
    ...(config.lines || []).map((l) => ({
      label: l.label,
      description:
        l.label === 'Base case'
          ? 'Expected return path with no simulated randomness'
          : l.label === 'Typical outcome'
            ? 'Middle outcome across the simulations'
            : '',
      color: l.color,
      width: l.width || 2.5,
      dash: l.dash || [],
      markerType: 'line',
      order:
        l.label === 'Base case'
          ? 1
          : l.label === 'Typical outcome'
            ? 2
            : 50
    })),

    ...((config.bands && config.bands.length)
      ? config.bands.map((band) => ({
          label: band.label || 'Range',
          description:
            band.label === 'Likely range'
              ? 'Where outcomes usually fall'
              : band.label === 'Full range of outcomes'
                ? 'Wider spread of typical outcomes'
                : '',
          color: band.strokeStyle || '#2d5bff',
          fillColor: band.fillStyle || 'rgba(45, 91, 255, 0.15)',
          width: 1.5,
          markerType: 'square',
          order:
            band.label === 'Likely range'
              ? 3
              : band.label === 'Full range of outcomes'
                ? 4
                : 60
        }))
      : (config.band
          ? [{
              label: config.band.label || 'Range',
              description: '',
              color: config.band.strokeStyle || '#2d5bff',
              fillColor: config.band.fillStyle || 'rgba(45, 91, 255, 0.15)',
              width: 1.5,
              markerType: 'square',
              order: 60
            }]
          : [])),

    ...(config.stackedAreas || []).map((a) => ({
      label: a.label,
      color: a.strokeColor || a.color,
      fillColor: a.color,
      width: 1.5,
      markerType: 'square',
      order: 70
    })),

    ...(config.gapBand
      ? [{
          label: config.gapBand.label || 'Spending shortfall',
          description: '',
          color: config.gapBand.strokeStyle || '#dc2626',
          fillColor: config.gapBand.fillStyle || 'rgba(220, 38, 38, 0.12)',
          width: 1.5,
          markerType: 'square',
          order: 80
        }]
      : [])
  ].sort((a, b) => (a.order || 99) - (b.order || 99));

  const legendLayout = measureLegend(ctx, legendItems, width);
  const legendHeight = legendLayout.height;

  const padding = {
    top: 20,
    right: 20,
    bottom: 52 + legendHeight,
    left: 96
  };

  const height = Math.max(baseHeight, 240 + padding.top + padding.bottom);

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (plotWidth <= 0 || plotHeight <= 0) return;

  const allValues = [];

  if (config.bands?.length) {
    config.bands.forEach((band) => {
      allValues.push(...band.lower.filter(Number.isFinite));
      allValues.push(...band.upper.filter(Number.isFinite));
    });
  } else if (config.band) {
    allValues.push(...config.band.lower.filter(Number.isFinite));
    allValues.push(...config.band.upper.filter(Number.isFinite));
  }

  if (config.gapBand) {
    allValues.push(...config.gapBand.lower.filter(Number.isFinite));
    allValues.push(...config.gapBand.upper.filter(Number.isFinite));
  }

  (config.stackedAreas || []).forEach((area) => {
    allValues.push(...area.values.filter(Number.isFinite));
  });

  if (config.stackedAreas?.length) {
    const totals = config.stackedAreas[0].values.map((_, i) =>
      config.stackedAreas.reduce((sum, area) => sum + (area.values[i] || 0), 0)
    );
    allValues.push(...totals);
  }

  (config.lines || []).forEach((line) => {
    allValues.push(...line.values.filter(Number.isFinite));
  });

  if (config.overlayLine?.values?.length) {
    allValues.push(...config.overlayLine.values.filter(Number.isFinite));
  }

  const minY = 0;
  let maxDataValue;

  if (config.bands?.length) {
      const outerBand = config.bands[0];
      const outerUpperValues = (outerBand?.upper || []).filter(Number.isFinite);
    
      const outerBandMax = outerUpperValues.length
        ? Math.max(...outerUpperValues)
        : 1;
    
      // Lock the Y-axis ceiling to the top of the outer percentile envelope only.
      // This keeps the chart height stable when toggling downside / median / upside.
      maxDataValue = Math.max(outerBandMax * 1.08, 1);
    } else {
      maxDataValue = allValues.length ? Math.max(...allValues, 1) : 1;
    }

  const maxY = niceMax(maxDataValue);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, width, height, padding, minY, maxY, config.yFormatter);

  if (config.verticalMarkers?.length) {
    drawVerticalMarkers(ctx, config.verticalMarkers, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      seriesLength: config.labels?.length || 0
    });
  }

  const bandsToDraw = config.bands?.length
    ? config.bands
    : (config.band ? [config.band] : []);

  bandsToDraw.forEach((band) => {
    drawBand(ctx, band.lower, band.upper, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY,
      fill: band.fillStyle
    });
  });

  if (config.gapBand) {
    drawGapBand(ctx, config.gapBand.lower, config.gapBand.upper, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY,
      fill: config.gapBand.fillStyle,
      stroke: config.gapBand.strokeStyle
    });
  }

  if (config.stackedAreas?.length) {
    drawStackedAreas(ctx, config.stackedAreas, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY
    });
  }

  (config.lines || []).forEach((line) => {
    drawSeries(ctx, line.values, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY,
      color: line.color,
      lineWidth: line.width || 2,
      dash: line.dash || [],
      markers: line.markers || []
    });
  });

  if (config.overlayLine) {
    drawSeries(ctx, config.overlayLine.values, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY,
      color: config.overlayLine.color,
      lineWidth: config.overlayLine.width || 2,
      dash: config.overlayLine.dash || [],
      markers: []
    });

    drawOverlayLineLabel(ctx, config.overlayLine, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY
    });
  }

  if (config.pointHighlights?.length) {
    drawPointHighlights(ctx, config.pointHighlights, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY
    });
  }

  drawXAxis(ctx, config.labels, width, height, padding);

  if (isInvestmentProjectionLegend) {
    drawInvestmentProjectionLegend(ctx, canvas, width, height, legendItems);
  } else {
    drawLegend(ctx, width, height, legendLayout);
  }

  const hoverPayload = state.isHovering
      ? getHoverPayload(config, state, {
          width: plotWidth,
          height: plotHeight,
          left: padding.left,
          top: padding.top,
          minY,
          maxY
        })
      : null;

  if (hoverPayload) {
    drawHoverOverlay(ctx, hoverPayload, width, height, padding);
  }
}

function drawInvestmentProjectionLegend(ctx, canvas, width, height, legendItems) {
  if (!Array.isArray(legendItems) || !legendItems.length) {
    canvas.__legendHitboxes = [];
    return;
  }

  const wantedOrder = [
    'Base case',
    'Typical outcome',
    'Likely range',
    'Full range of outcomes'
  ];

  const itemMap = new Map(
    legendItems.map((item) => [item.label, item])
  );

  const row1 = [
    itemMap.get('Base case'),
    itemMap.get('Typical outcome')
  ].filter(Boolean);

  const row2 = [
    itemMap.get('Likely range'),
    itemMap.get('Full range of outcomes')
  ].filter(Boolean);

  const rows = [row1, row2].filter((row) => row.length);

  if (!rows.length) {
    canvas.__legendHitboxes = [];
    return;
  }

  // Match drawLegend() box geometry exactly
  const boxPaddingY = 3;
  const boxRadius = 12;
  const boxX = 24;
  const boxWidth = width - 48;
  const boxBottomMargin = 12;

  const rowHeight = 32;
  const rowGap = 10;
  const itemGap = 28;
  const markerSize = 20;
  const markerTextGap = 8;

  const layoutHeightRaw =
    rows.length * rowHeight + (rows.length - 1) * rowGap + 8;

  const MIN_LEGEND_HEIGHT = 75;
  const layoutHeight = Math.max(layoutHeightRaw, MIN_LEGEND_HEIGHT);

  const boxHeight = layoutHeight + boxPaddingY * 2;
  const boxY = height - boxBottomMargin - boxHeight;

  ctx.save();

  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, boxRadius);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();

  ctx.strokeStyle = '#d7deea';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();

  const contentHeight =
    rows.length * rowHeight +
    (rows.length - 1) * rowGap;

  // Top-align slightly instead of tight vertical centering
  let y = boxY + 18 + rowHeight / 2;

  rows.forEach((row) => {
    const rowWidth =
      row.reduce((sum, item) => sum + (item.widthNeeded || 0), 0) +
      (row.length - 1) * itemGap;

    let x = (width - rowWidth) / 2;

    row.forEach((item) => {
      ctx.save();

      if (item.markerType === 'square') {
        const squareSize = 12;
        const squareX = x + (markerSize - squareSize) / 2;
        const squareY = y - squareSize / 2;

        ctx.beginPath();
        ctx.rect(squareX, squareY, squareSize, squareSize);
        ctx.fillStyle = item.fillColor || item.color;
        ctx.fill();
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width || 1.5;
        ctx.setLineDash([]);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.setLineDash(item.dash || []);
        ctx.moveTo(x, y);
        ctx.lineTo(x + markerSize, y);
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width || 2.5;
        ctx.stroke();
      }

      ctx.restore();

      const textX = x + markerSize + markerTextGap;

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#475569';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText(item.label, textX, y);
      ctx.restore();

      x += (item.widthNeeded || 0) + itemGap;
    });

    y += rowHeight + rowGap;
  });

  canvas.__legendHitboxes = [];
}

function getLegendHoverPayload(canvas, state) {
  const hitboxes = canvas.__legendHitboxes || [];
  if (!hitboxes.length || state.hoverX == null || state.hoverY == null) return null;

  const hit = hitboxes.find((box) =>
    state.hoverX >= box.x &&
    state.hoverX <= box.x + box.width &&
    state.hoverY >= box.y &&
    state.hoverY <= box.y + box.height
  );

  if (!hit) return null;

  return {
    x: hit.x + hit.width / 2,
    y: hit.y,
    title: hit.title,
    lines: hit.lines || [],
    swatchColor: hit.swatchColor,
    swatchBorderColor: hit.swatchBorderColor
  };
}

function drawOverlayLineLabel(ctx, line, geom) {
  if (!line?.label || !Array.isArray(line.values) || !line.values.length) return;

  let lastIndex = -1;

  for (let i = line.values.length - 1; i >= 0; i -= 1) {
    if (Number.isFinite(line.values[i])) {
      lastIndex = i;
      break;
    }
  }

  if (lastIndex < 0) return;

  const value = Number(line.values[lastIndex]);
  const x = geom.left + getX(lastIndex, line.values.length, geom.width);
  const y = geom.top + getY(value, geom.minY, geom.maxY, geom.height);

  const label = line.label;
  ctx.save();
  ctx.font = '12px Inter, system-ui, sans-serif';

  const textWidth = ctx.measureText(label).width;
  const boxWidth = textWidth + 16;
  const boxHeight = 24;

  let boxX = x + 10;
  let boxY = y - boxHeight - 8;

  if (boxX + boxWidth > geom.left + geom.width - 4) {
    boxX = x - boxWidth - 10;
  }

  if (boxX < geom.left + 4) {
    boxX = geom.left + 4;
  }

  if (boxY < geom.top + 4) {
    boxY = y + 8;
  }

  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fill();
  ctx.strokeStyle = line.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = line.color;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, boxX + 8, boxY + boxHeight / 2);

  ctx.restore();
}

function drawGapBand(ctx, lower, upper, geom) {
  if (!lower.length || lower.length !== upper.length) return;

  const ranges = [];
  let start = null;

  for (let i = 0; i < upper.length; i += 1) {
    const hasGap = Number.isFinite(upper[i]) && Number.isFinite(lower[i]) && upper[i] > lower[i];

    if (hasGap && start === null) {
      start = i;
    }

    if ((!hasGap || i === upper.length - 1) && start !== null) {
      const end = hasGap && i === upper.length - 1 ? i : i - 1;
      ranges.push([start, end]);
      start = null;
    }
  }

  ranges.forEach(([startIndex, endIndex]) => {
    ctx.beginPath();

    for (let i = startIndex; i <= endIndex; i += 1) {
      const x = geom.left + getX(i, upper.length, geom.width);
      const y = geom.top + getY(upper[i], geom.minY, geom.maxY, geom.height);
      if (i === startIndex) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    for (let i = endIndex; i >= startIndex; i -= 1) {
      const x = geom.left + getX(i, lower.length, geom.width);
      const y = geom.top + getY(lower[i], geom.minY, geom.maxY, geom.height);
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle = geom.fill;
    ctx.fill();

    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = geom.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  });
}

function drawPointHighlights(ctx, highlights, geom) {
  highlights.forEach((highlight) => {
    const { index, values, color } = highlight;
    if (index < 0 || index >= values.length) return;

    const value = values[index];
    if (!Number.isFinite(value)) return;

    const x = geom.left + getX(index, values.length, geom.width);
    const y = geom.top + getY(value, geom.minY, geom.maxY, geom.height);

    ctx.save();

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.restore();
  });
}

function getHoverPayload(config, state, geom) {
  if (
    state.hoverX == null ||
    state.hoverY == null ||
    state.hoverX < geom.left ||
    state.hoverX > geom.left + geom.width ||
    state.hoverY < geom.top ||
    state.hoverY > geom.top + geom.height
  ) {
    return null;
  }

  const projectionLinePayload = getProjectionLineHoverPayload(config, state, geom);
  if (projectionLinePayload) return projectionLinePayload;

  const projectionBandPayload = getProjectionBandHoverPayload(config, state, geom);
  if (projectionBandPayload) return projectionBandPayload;

  const areaPayload = getAreaHoverPayload(config, state, geom);
  if (areaPayload) return areaPayload;

  const gapPayload = getGapBandHoverPayload(config, state, geom);
  if (gapPayload) return gapPayload;

  const pointHighlights = config.pointHighlights || [];
  const hoverRadius = 10;

  for (const point of pointHighlights) {
    const { index, values, label } = point;
    if (index < 0 || index >= values.length) continue;

    const value = values[index];
    if (!Number.isFinite(value)) continue;

    const x = geom.left + getX(index, values.length, geom.width);
    const y = geom.top + getY(value, geom.minY, geom.maxY, geom.height);

    const dx = state.hoverX - x;
    const dy = state.hoverY - y;

    if (Math.sqrt(dx * dx + dy * dy) <= hoverRadius + 2) {
      return {
        x,
        y,
        title: label,
        lines: getMarkerDetailLines(label)
      };
    }
  }

  const markers = config.verticalMarkers || [];

  for (const marker of markers) {
    const x = geom.left + getX(marker.index, config.labels.length, geom.width);

    if (Math.abs(state.hoverX - x) <= hoverRadius) {
      return {
        x,
        y: geom.top + 16,
        title: marker.label,
        lines: getMarkerDetailLines(marker.label)
      };
    }
  }

  return null;
}

function getProjectionLineHoverPayload(config, state, geom) {
  const lines = config.lines || [];
  if (!lines.length || !config.labels?.length) return null;

  const hoverRadius = 8;
  let bestMatch = null;

  for (const line of lines) {
    const values = line.values || [];
    if (!values.length) continue;

    for (let i = 0; i < values.length; i += 1) {
      const value = values[i];
      if (!Number.isFinite(value)) continue;

      const x = geom.left + getX(i, values.length, geom.width);
      const y = geom.top + getY(value, geom.minY, geom.maxY, geom.height);

      const dx = state.hoverX - x;
      const dy = state.hoverY - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= hoverRadius) {
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = {
            distance,
            x,
            y,
            title: line.label,
            lines:
              line.label === 'Base case'
                ? ['Expected return path with no simulated randomness']
                : line.label === 'Typical outcome'
                  ? ['Middle outcome across the simulations']
                  : []
          };
        }
      }
    }
  }

  if (!bestMatch) return null;

  return {
    x: bestMatch.x,
    y: bestMatch.y,
    title: bestMatch.title,
    lines: bestMatch.lines
  };
}

function getProjectionBandHoverPayload(config, state, geom) {
  const bands = config.bands || [];
  if (!bands.length || !config.labels?.length) return null;

  const length = config.labels.length;
  const rawIndex = ((state.hoverX - geom.left) / geom.width) * (length - 1);
  const index = Math.max(0, Math.min(length - 1, Math.round(rawIndex)));

  const orderedBands = [...bands].sort((a, b) => {
    const aSpan = Math.abs((a.upper?.[index] || 0) - (a.lower?.[index] || 0));
    const bSpan = Math.abs((b.upper?.[index] || 0) - (b.lower?.[index] || 0));
    return aSpan - bSpan;
  });

  for (const band of orderedBands) {
    const upperValue = band.upper?.[index];
    const lowerValue = band.lower?.[index];

    if (
      !Number.isFinite(upperValue) ||
      !Number.isFinite(lowerValue) ||
      upperValue < lowerValue
    ) {
      continue;
    }

    const yTop = geom.top + getY(upperValue, geom.minY, geom.maxY, geom.height);
    const yBottom = geom.top + getY(lowerValue, geom.minY, geom.maxY, geom.height);

    if (state.hoverY >= yTop && state.hoverY <= yBottom) {
      return {
        x: geom.left + getX(index, length, geom.width),
        y: yTop + (yBottom - yTop) / 2,
        title: band.label || 'Range',
        lines:
          band.label === 'Likely range'
            ? ['Where outcomes usually fall']
            : band.label === 'Full range of outcomes'
              ? ['Wider spread of typical outcomes']
              : [],
        swatchColor: band.fillStyle || 'rgba(45, 91, 255, 0.15)',
        swatchBorderColor: band.color || '#2d5bff'
      };
    }
  }

  return null;
}

function getAreaHoverPayload(config, state, geom) {
  const areas = config.stackedAreas || [];
  if (!areas.length || !config.labels?.length) return null;

  if (
    state.hoverX < geom.left ||
    state.hoverX > geom.left + geom.width ||
    state.hoverY < geom.top ||
    state.hoverY > geom.top + geom.height
  ) {
    return null;
  }

  const length = config.labels.length;
  const rawIndex = ((state.hoverX - geom.left) / geom.width) * (length - 1);
  const index = Math.max(0, Math.min(length - 1, Math.round(rawIndex)));

  let cumulativeLower = 0;

  for (const area of areas) {
    const value = Number(area.values?.[index] || 0);
    const cumulativeUpper = cumulativeLower + value;

    const yTop = geom.top + getY(cumulativeUpper, geom.minY, geom.maxY, geom.height);
    const yBottom = geom.top + getY(cumulativeLower, geom.minY, geom.maxY, geom.height);

    if (state.hoverY >= yTop && state.hoverY <= yBottom && value > 0) {
      const x = geom.left + getX(index, length, geom.width);
      const y = yTop + (yBottom - yTop) / 2;

      return {
        x,
        y,
        title: area.label,
        lines: getAreaDetailLines(area.label),
        swatchColor: area.color,
        swatchBorderColor: area.strokeColor || area.color
      };
    }

    cumulativeLower = cumulativeUpper;
  }

  return null;
}

function getGapBandHoverPayload(config, state, geom) {
  const gapBand = config.gapBand;
  if (!gapBand || !config.labels?.length) return null;

  if (
    state.hoverX < geom.left ||
    state.hoverX > geom.left + geom.width ||
    state.hoverY < geom.top ||
    state.hoverY > geom.top + geom.height
  ) {
    return null;
  }

  const length = config.labels.length;
  const rawIndex = ((state.hoverX - geom.left) / geom.width) * (length - 1);
  const index = Math.max(0, Math.min(length - 1, Math.round(rawIndex)));

  const upperValue = gapBand.upper?.[index];
  const lowerValue = gapBand.lower?.[index];

  if (
    !Number.isFinite(upperValue) ||
    !Number.isFinite(lowerValue) ||
    upperValue <= lowerValue
  ) {
    return null;
  }

  const yTop = geom.top + getY(upperValue, geom.minY, geom.maxY, geom.height);
  const yBottom = geom.top + getY(lowerValue, geom.minY, geom.maxY, geom.height);

  if (state.hoverY >= yTop && state.hoverY <= yBottom) {
    const x = geom.left + getX(index, length, geom.width);
    const y = yTop + (yBottom - yTop) / 2;

    return {
      x,
      y,
      title: gapBand.label || 'Spending shortfall',
      lines: getAreaDetailLines(gapBand.label || 'Spending shortfall'),
      swatchColor: gapBand.fillStyle || 'rgba(220, 38, 38, 0.12)',
      swatchBorderColor: gapBand.strokeStyle || '#b91c1c'
    };
  }

  return null;
}

function getAreaDetailLines(label) {
  switch (label) {
    case 'Other income':
      return [
        'Non-pension income used before portfolio withdrawals are needed.'
      ];
    case 'State pension income':
      return [
        'State pension income reduces amount drawn from portfolio.'
      ];
    case 'Withdrawals from portfolio':
      return [
        'Spending funded by investment withdrawals.'
      ];
    case 'Spending shortfall':
      return [
        'Planned spending is higher than actual funded spending.'
      ];
    default:
      return [
        'Shows how a component contributes to total spending in that year.'
      ];
  }
}

/* Chart Tooltips */

function getMarkerDetailLines(label) {
  if (/windfall/i.test(label)) {
    return [
      'One-off cash inflow added to the plan in this year.',
      'It reduces the need for portfolio withdrawals and can lift the portfolio path.'
    ];
  }

  if (/state pension/i.test(label)) {
    return [
      'Year state pension starts for this person.',
      'From this point, portfolio withdrawals may reduce because guaranteed income increases.'
    ];
  }

  switch (label) {
    case 'First cut':
      return [
        'First year spending is reduced by guardrails.',
        'Actual spending falls below the planned level.'
      ];
    case 'Worst cut':
      return [
        'Year with the largest guardrail spending cut.',
        'The gap to target spending is at its biggest cut percentage.'
      ];
    case 'First shortfall':
    case 'Shortfall begins':
      return [
        'The first year target spending is not fully funded.',
        'Red shading shows the unfunded gap versus planned spending.'
      ];
    case 'Worst shortfall':
      return [
        'The year with the largest spending shortfall.',
        'The red shaded band is widest here.'
      ];
    default:
      return [
        'This marker highlights a key plan event.'
      ];
  }
}

/* End Chart Tooltips */

function drawHoverOverlay(ctx, payload, width, height, padding) {
  const title = payload.title || '';
  const lines = payload.lines || [];
  if (!title && !lines.length) return;

  ctx.save();
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const maxBoxWidth = 340;
  const boxPaddingX = 12;
  const boxPaddingTop = 16;
  const boxPaddingBottom = 12;
  const lineHeight = 16;
  const titleHeight = title ? 18 : 0;

  const hasSwatch = Boolean(payload.swatchColor);
  const swatchSize = hasSwatch ? 12 : 0;
  const swatchGap = hasSwatch ? 8 : 0;

  const boxWidth = maxBoxWidth;
  const wrapWidth = boxWidth - boxPaddingX * 2;

  const wrappedLines = [];

  lines.forEach((line) => {
    const words = String(line).split(' ');
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > wrapWidth && currentLine) {
        wrappedLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  });

  const boxHeight =
    boxPaddingTop +
    titleHeight +
    wrappedLines.length * lineHeight +
    boxPaddingBottom;

  const plotBottom = height - padding.bottom;

  let x = payload.x + 14;
  let y = payload.y - boxHeight - 10;

  if (x + boxWidth > width - padding.right) {
    x = payload.x - boxWidth - 14;
  }

  if (x < padding.left + 4) {
    x = padding.left + 4;
  }

  if (y < padding.top + 4) {
    y = payload.y + 12;
  }

  if (y + boxHeight > plotBottom - 6) {
    y = plotBottom - boxHeight - 6;
  }

  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  roundRect(ctx, x, y, boxWidth, boxHeight, 10);
  ctx.fill();

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, boxWidth, boxHeight, 10);
  ctx.stroke();

  let textY = y + boxPaddingTop;

  if (title) {
    const titleX = x + boxPaddingX + swatchSize + swatchGap;

    if (hasSwatch) {
      const swatchX = x + boxPaddingX;
      const swatchY = textY + 1;

      ctx.beginPath();
      ctx.rect(swatchX, swatchY, swatchSize, swatchSize);
      ctx.fillStyle = payload.swatchColor;
      ctx.fill();
      ctx.strokeStyle = payload.swatchBorderColor || payload.swatchColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillText(title, titleX, textY);
    textY += titleHeight;
  }

  ctx.fillStyle = '#475569';
  wrappedLines.forEach((line) => {
    ctx.fillText(line, x + boxPaddingX, textY);
    textY += lineHeight;
  });

  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawStackedAreas(ctx, areas, geom) {
  const length = areas[0].values.length;
  const cumulative = Array.from({ length }, () => 0);

  areas.forEach((area) => {
    const next = cumulative.map((v, i) => v + (area.values[i] || 0));

    ctx.beginPath();

    next.forEach((v, i) => {
      const x = geom.left + getX(i, length, geom.width);
      const y = geom.top + getY(v, geom.minY, geom.maxY, geom.height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    for (let i = length - 1; i >= 0; i -= 1) {
      const x = geom.left + getX(i, length, geom.width);
      const y = geom.top + getY(cumulative[i], geom.minY, geom.maxY, geom.height);
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle = area.color;
    ctx.fill();

    ctx.beginPath();

    next.forEach((v, i) => {
      const x = geom.left + getX(i, length, geom.width);
      const y = geom.top + getY(v, geom.minY, geom.maxY, geom.height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = area.strokeColor || area.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let i = 0; i < length; i += 1) {
      cumulative[i] = next[i];
    }
  });
}

function drawSeries(ctx, values, geom) {
  const clean = values.map((v) => (Number.isFinite(v) ? v : 0));
  if (!clean.length) return;

  ctx.save();
  ctx.beginPath();
  ctx.setLineDash(geom.dash || []);

  clean.forEach((v, i) => {
    const x = geom.left + getX(i, clean.length, geom.width);
    const y = geom.top + getY(v, geom.minY, geom.maxY, geom.height);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = geom.color;
  ctx.lineWidth = geom.lineWidth;
  ctx.stroke();
  ctx.restore();

  if (geom.markers?.length) {
    drawPointMarkers(ctx, clean, geom);
  }
}

function drawPointMarkers(ctx, values, geom) {
  ctx.save();

  geom.markers.forEach((index) => {
    if (index < 0 || index >= values.length) return;

    const x = geom.left + getX(index, values.length, geom.width);
    const y = geom.top + getY(values[index], geom.minY, geom.maxY, geom.height);

    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = geom.color;
    ctx.fill();
  });

  ctx.restore();
}

function drawVerticalMarkers(ctx, markers, geom) {
  if (!markers.length || geom.seriesLength <= 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(geom.left, geom.top, geom.width, geom.height);
  ctx.clip();
  ctx.setLineDash([4, 4]);

  markers.forEach((marker) => {
    const safeIndex = Math.max(0, Math.min(marker.index, geom.seriesLength - 1));
    const x = geom.left + getX(safeIndex, geom.seriesLength, geom.width);

    ctx.beginPath();
    ctx.moveTo(x, geom.top);
    ctx.lineTo(x, geom.top + geom.height);
    ctx.strokeStyle = marker.color;
    ctx.lineWidth = 1.25;
    ctx.stroke();
  });

  ctx.restore();
}

function drawGrid(ctx, width, height, padding, minY, maxY, yFormatter) {
  const plotHeight = height - padding.top - padding.bottom;
  const steps = 5;

  ctx.strokeStyle = '#d7deea';
  ctx.fillStyle = '#657086';
  ctx.lineWidth = 1;

  for (let i = 0; i <= steps; i += 1) {
    const ratio = i / steps;
    const y = padding.top + plotHeight - ratio * plotHeight;
    const val = minY + ratio * (maxY - minY);

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(yFormatter(val), 12, y);
  }
}

function measureLegend(ctx, lines, width) {
  const markerSize = 20;
  const markerTextGap = 8;
  const itemGap = 36;
  const rowGap = 0;    // tweak row gap in chart legend
  const maxRowWidth = Math.max(200, width - 36);

  ctx.font = '13px Inter, system-ui, sans-serif';

  const items = lines.map((line) => {
    const labelWidth = ctx.measureText(line.label).width;
    const descriptionWidth = line.description
      ? ctx.measureText(line.description).width
      : 0;
    const textWidth = Math.max(labelWidth, descriptionWidth);
    const widthNeeded = markerSize + markerTextGap + textWidth;
    return { ...line, widthNeeded };
  });

  const rows = [];
  let row = [];
  let rowWidth = 0;

  items.forEach((item) => {
    const nextWidth =
      row.length === 0 ? item.widthNeeded : rowWidth + itemGap + item.widthNeeded;

    if (nextWidth > maxRowWidth && row.length) {
      rows.push(row);
      row = [item];
      rowWidth = item.widthNeeded;
    } else {
      row.push(item);
      rowWidth = nextWidth;
    }
  });

  if (row.length) rows.push(row);

  const rowHeight = 34;
  const heightNeededRaw =
    rows.length * rowHeight + (rows.length - 1) * rowGap + 8;

  const MIN_LEGEND_HEIGHT = 75;

  const heightNeeded = Math.max(heightNeededRaw, MIN_LEGEND_HEIGHT);

  return {
    rows,
    rowHeight,
    itemGap,
    rowGap,
    markerSize,
    markerTextGap,
    height: heightNeeded
  };
}

function drawLegend(ctx, width, height, layout) {
  const boxPaddingY = 3;
  const boxRadius = 12;
  const boxX = 24;
  const boxWidth = width - 48;
  const boxHeight = layout.height + boxPaddingY * 2;
  const boxBottomMargin = 12;
  const boxY = height - boxBottomMargin - boxHeight;

  ctx.save();
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, boxRadius);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();

  ctx.strokeStyle = '#d7deea';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();

  const contentHeight =
  layout.rows.length * layout.rowHeight +
  (layout.rows.length - 1) * layout.rowGap;

  let y = boxY + (boxHeight - contentHeight) / 2 + layout.rowHeight / 2;

    layout.rows.forEach((row) => {
    const rowWidth =
      row.reduce((sum, item) => sum + item.widthNeeded, 0) +
      (row.length - 1) * layout.itemGap;

    let x = (width - rowWidth) / 2;

    row.forEach((item) => {
      ctx.save();

      if (item.markerType === 'square') {
        const squareSize = 12;
        const squareX = x + (layout.markerSize - squareSize) / 2;
        const squareY = y - squareSize / 2;

        ctx.beginPath();
        ctx.rect(squareX, squareY, squareSize, squareSize);
        ctx.fillStyle = item.fillColor || item.color;
        ctx.fill();
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width || 1.5;
        ctx.setLineDash([]);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.setLineDash(item.dash || []);
        ctx.moveTo(x, y);
        ctx.lineTo(x + layout.markerSize, y);
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width || 2.5;
        ctx.stroke();
      }

      ctx.restore();

      const textX = x + layout.markerSize + layout.markerTextGap;

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
    
      if (item.description) {
        ctx.fillStyle = '#475569';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText(item.label, textX, y - 8);
    
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText(item.description, textX, y + 8);
      } else {
        ctx.fillStyle = '#475569';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText(item.label, textX, y);
      }
    
      ctx.restore();

      x += item.widthNeeded + layout.itemGap;
    });

    y += layout.rowHeight + layout.rowGap;
  });
}

function drawBand(ctx, lower, upper, geom) {
  if (!lower.length || lower.length !== upper.length) return;

  ctx.beginPath();

  lower.forEach((v, i) => {
    const x = geom.left + getX(i, lower.length, geom.width);
    const y = geom.top + getY(v, geom.minY, geom.maxY, geom.height);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  for (let i = upper.length - 1; i >= 0; i -= 1) {
    const x = geom.left + getX(i, upper.length, geom.width);
    const y = geom.top + getY(upper[i], geom.minY, geom.maxY, geom.height);
    ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.fillStyle = geom.fill;
  ctx.fill();
}

function drawXAxis(ctx, labels, width, height, padding) {
  const plotWidth = width - padding.left - padding.right;
  const baseline = height - padding.bottom + 14;

  ctx.fillStyle = '#657086';
  ctx.textAlign = 'center';

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  ticks.forEach((tick) => {
    const i = Math.floor((labels.length - 1) * tick);
    const x = padding.left + getX(i, labels.length, plotWidth);
    ctx.fillText(labels[i], x, baseline);
  });

    ctx.save();
    ctx.fillStyle = '#657086';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';

ctx.fillText('Years in retirement', padding.left + plotWidth / 2, baseline + 22);

ctx.restore();
}

function getX(i, len, width) {
  return len <= 1 ? 0 : (i / (len - 1)) * width;
}

function getY(v, min, max, height) {
  if (max === min) return height;
  const ratio = (v - min) / (max - min);
  return height - ratio * height;
}

function niceMax(v) {
  if (!Number.isFinite(v) || v <= 0) return 1;

  const exponent = Math.floor(Math.log10(v));
  const base = 10 ** exponent;
  const scaled = v / base;

  let rounded;

  if (scaled <= 1) rounded = 1;
  else if (scaled <= 1.25) rounded = 1.25;
  else if (scaled <= 1.5) rounded = 1.5;
  else if (scaled <= 2) rounded = 2;
  else if (scaled <= 2.5) rounded = 2.5;
  else if (scaled <= 3) rounded = 3;
  else if (scaled <= 4) rounded = 4;
  else if (scaled <= 5) rounded = 5;
  else if (scaled <= 6) rounded = 6;
  else if (scaled <= 7.5) rounded = 7.5;
  else rounded = 10;

  return rounded * base;
}