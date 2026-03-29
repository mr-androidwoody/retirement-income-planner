// ==============================
// PUBLIC API (UNCHANGED)
// ==============================

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
        ? (row?.endPortfolioReal ?? row?.portfolioReal ?? row?.endPortfolio ?? 0)
        : (row?.endPortfolioNominal ?? row?.portfolioNominal ?? row?.endPortfolio ?? 0)
    )
  );

  const basePath = isHistorical
    ? historicalPath
    : (useReal
        ? (result?.baseCase?.pathReal || [])
        : (result?.baseCase?.pathNominal || [])
      );

  if (!basePath.length) return;

  const labels = buildYearLabels(basePath.length - 1);

  const chartConfig = {
    labels,
    lines: isHistorical || !hasMonteCarlo
      ? [{
          label: isHistorical ? 'Selected historical path' : 'Portfolio path',
          values: basePath,
          color: '#2d5bff',
          width: 3
        }]
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
    yFormatter: formatCurrency
  };

  if (!isHistorical && hasMonteCarlo) {
    const p10 = useReal
      ? result.monteCarlo.realPercentiles.p10
      : result.monteCarlo.nominalPercentiles.p10;

    const p90 = useReal
      ? result.monteCarlo.realPercentiles.p90
      : result.monteCarlo.nominalPercentiles.p90;

    const p25 = useReal
      ? result.monteCarlo.realPercentiles.p25
      : result.monteCarlo.nominalPercentiles.p25;

    const p75 = useReal
      ? result.monteCarlo.realPercentiles.p75
      : result.monteCarlo.nominalPercentiles.p75;

    chartConfig.bands = [
      { lower: p10, upper: p90, fillStyle: 'rgba(45,91,255,0.12)', label: 'Full range of outcomes' },
      { lower: p25, upper: p75, fillStyle: 'rgba(45,91,255,0.22)', label: 'Likely range' }
    ];
  }

  drawLineChart(canvas, chartConfig);
}

export function renderSpendingChart(canvas, rows, useReal, formatCurrency) {
  if (!rows?.length) return;

  drawLineChart(canvas, {
    labels: rows.map(r => r.year),
    lines: [
      {
        label: 'Planned household spending',
        values: rows.map(r => useReal ? r.targetSpendingReal : r.targetSpendingNominal),
        color: '#7c3aed',
        dash: [8, 6]
      },
      {
        label: 'Actual spending after guardrails',
        values: rows.map(r => useReal ? r.spendingReal : r.spendingNominal),
        color: '#4f46e5',
        width: 3
      }
    ],
    yFormatter: formatCurrency
  });
}

// ==============================
// CORE CHART ENGINE
// ==============================

function drawLineChart(canvas, config) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  const width = Math.max(420, rect.width);
  const BASE_HEIGHT = Number(canvas.dataset.baseHeight || 220);
  const BREAKPOINT = 800;

  const isNarrow = width < BREAKPOINT;

  const SPACING = {
    top: 10,
    bottom: 8,
    gap: 8,
    legendRowGap: 6,
    legendItemGap: 16,
    markerGap: 6
  };

  const PLOT_HEIGHT = 170;

  ctx.font = '12px Inter, system-ui, sans-serif';

  const legendItems = buildLegendItems(config);
  const legend = measureLegend(ctx, legendItems, width, isNarrow, SPACING);

  const canvasHeight = isNarrow
    ? PLOT_HEIGHT + SPACING.gap + legend.height + SPACING.top + SPACING.bottom
    : BASE_HEIGHT;

  canvas.width = width * dpr;
  canvas.height = canvasHeight * dpr;
  canvas.style.height = `${canvasHeight}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, canvasHeight);

  const plotRect = {
    x: 40,
    y: SPACING.top,
    width: width - 60,
    height: PLOT_HEIGHT
  };

  const legendRect = {
    x: 0,
    y: SPACING.top + PLOT_HEIGHT + SPACING.gap,
    width,
    height: legend.height
  };

  drawPlot(ctx, plotRect, config);
  drawLegend(ctx, legend, legendRect, SPACING);
}

// ==============================
// LEGEND SYSTEM
// ==============================

function buildLegendItems(config) {
  const items = [];

  (config.lines || []).forEach(l => {
    items.push({
      label: l.label,
      color: l.color,
      dash: l.dash || [],
      type: 'line'
    });
  });

  (config.bands || []).forEach(b => {
    items.push({
      label: b.label,
      color: '#2d5bff',
      fill: b.fillStyle,
      type: 'box'
    });
  });

  return items;
}

function measureLegend(ctx, items, width, isNarrow, S) {
  const maxRows = isNarrow ? 999 : 2;
  const rows = [[]];
  let rowWidth = 0;

  items.forEach(item => {
    const textWidth = ctx.measureText(item.label).width;
    const w = 20 + S.markerGap + textWidth + S.legendItemGap;

    if (rows[rows.length - 1].length && rowWidth + w > width && rows.length < maxRows) {
      rows.push([]);
      rowWidth = 0;
    }

    rows[rows.length - 1].push({ ...item, w });
    rowWidth += w;
  });

  const rowHeight = 18;

  return {
    rows,
    height: rows.length * rowHeight + (rows.length - 1) * S.legendRowGap,
    rowHeight
  };
}

function drawLegend(ctx, legend, rect, S) {
  ctx.textBaseline = 'middle';

  legend.rows.forEach((row, i) => {
    const total = row.reduce((s, r) => s + r.w, 0);
    let x = (rect.width - total) / 2;

    const y = rect.y + i * (legend.rowHeight + S.legendRowGap) + legend.rowHeight / 2;

    row.forEach(item => {
      if (item.type === 'line') {
        ctx.strokeStyle = item.color;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 18, y);
        ctx.stroke();
      } else {
        ctx.fillStyle = item.fill;
        ctx.fillRect(x, y - 4, 18, 8);
      }

      x += 18 + S.markerGap;
      ctx.fillStyle = '#334155';
      ctx.fillText(item.label, x, y);

      x += ctx.measureText(item.label).width + S.legendItemGap;
    });
  });
}

// ==============================
// BASIC PLOT (unchanged style)
// ==============================

function drawPlot(ctx, rect, config) {
  const { lines } = config;
  if (!lines?.length) return;

  const values = lines.flatMap(l => l.values);
  const max = Math.max(...values);
  const min = Math.min(...values);

  const scaleY = v =>
    rect.y + rect.height - ((v - min) / (max - min)) * rect.height;

  lines.forEach(line => {
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width || 2;
    ctx.setLineDash(line.dash || []);

    ctx.beginPath();

    line.values.forEach((v, i) => {
      const x = rect.x + (i / (line.values.length - 1)) * rect.width;
      const y = scaleY(v);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
    ctx.setLineDash([]);
  });
}

// ==============================

function buildYearLabels(years) {
  return Array.from({ length: years + 1 }, (_, i) => i);
}