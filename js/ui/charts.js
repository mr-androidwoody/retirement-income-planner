// ==============================
// PUBLIC API (UNCHANGED)
// ==============================

export { renderPortfolioChart, renderSpendingChart };

// ==============================
// EXISTING FUNCTIONS (UNCHANGED)
// ==============================

// ⛔ KEEP EVERYTHING ABOVE drawLineChart EXACTLY AS YOU HAVE IT
// (you already pasted it earlier — do not touch)

// ==============================
// 🔧 REFACTORED drawLineChart
// ==============================

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
  const baseHeight = Number(canvas.dataset.baseHeight || 320);

  const BREAKPOINT = 800;
  const isNarrow = width < BREAKPOINT;

  ctx.font = '12px Inter, system-ui, sans-serif';

  // =========================
  // 🔧 UNIFIED LEGEND ITEMS
  // =========================

  const legendItems = buildUnifiedLegendItems(config);

  // =========================
  // 🔧 LEGEND MEASURE
  // =========================

  const legendLayout = measureUnifiedLegend(ctx, legendItems, width, isNarrow);

  // =========================
  // 🔧 FIXED PLOT MODEL
  // =========================

  const PLOT_HEIGHT = 180;

  const padding = {
    top: 20,
    right: 20,
    left: 96,
    bottom: legendLayout.height + 24
  };

  const height = isNarrow
    ? padding.top + PLOT_HEIGHT + padding.bottom
    : baseHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = PLOT_HEIGHT;

  if (plotWidth <= 0 || plotHeight <= 0) return;

  // =========================
  // 🔧 EVERYTHING BELOW IS ORIGINAL
  // =========================

  const minY = 0;
  const allValues = [];

  if (config.bands?.length) {
    config.bands.forEach(b => {
      allValues.push(...b.lower);
      allValues.push(...b.upper);
    });
  }

  (config.lines || []).forEach(l => allValues.push(...l.values));

  const maxY = niceMax(Math.max(...allValues, 1));

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, width, height, padding, minY, maxY, config.yFormatter);

  if (config.bands) {
    config.bands.forEach(b => {
      drawBand(ctx, b.lower, b.upper, {
        width: plotWidth,
        height: plotHeight,
        left: padding.left,
        top: padding.top,
        minY,
        maxY,
        fill: b.fillStyle
      });
    });
  }

  if (config.stackedAreas) {
    drawStackedAreas(ctx, config.stackedAreas, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY
    });
  }

  (config.lines || []).forEach(line => {
    drawSeries(ctx, line.values, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY,
      color: line.color,
      lineWidth: line.width || 2,
      dash: line.dash || []
    });
  });

  drawXAxis(ctx, config.labels, width, height, padding);

  // =========================
  // 🔧 NEW LEGEND RENDER
  // =========================

  drawUnifiedLegend(ctx, legendLayout, width, height);

  // =========================
  // 🔧 HOVER (UNCHANGED)
  // =========================

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

// ==============================
// 🔧 NEW LEGEND SYSTEM
// ==============================

function buildUnifiedLegendItems(config) {
  const items = [];

  (config.lines || []).forEach(l => {
    items.push({ label: l.label, type: 'line', color: l.color });
  });

  (config.bands || []).forEach(b => {
    items.push({ label: b.label, type: 'box', fill: b.fillStyle });
  });

  (config.stackedAreas || []).forEach(a => {
    items.push({ label: a.label, type: 'box', fill: a.color });
  });

  if (config.gapBand) {
    items.push({ label: config.gapBand.label, type: 'box', fill: config.gapBand.fillStyle });
  }

  return items;
}

function measureUnifiedLegend(ctx, items, width, isNarrow) {
  const maxRows = isNarrow ? 999 : 2;

  const rows = [[]];
  let rowWidth = 0;

  items.forEach(item => {
    const w = ctx.measureText(item.label).width + 40;

    if (rowWidth + w > width && rows.length < maxRows) {
      rows.push([]);
      rowWidth = 0;
    }

    rows[rows.length - 1].push({ ...item, w });
    rowWidth += w;
  });

  return {
    rows,
    rowHeight: 20,
    height: rows.length * 20 + (rows.length - 1) * 6
  };
}

function drawUnifiedLegend(ctx, legend, width, height) {
  legend.rows.forEach((row, i) => {
    const total = row.reduce((s, r) => s + r.w, 0);
    let x = (width - total) / 2;
    const y = height - legend.height + i * 20 + 10;

    row.forEach(item => {
      ctx.fillStyle = item.fill || item.color;
      ctx.fillRect(x, y - 4, 16, 8);

      ctx.fillStyle = '#334155';
      ctx.fillText(item.label, x + 20, y);

      x += item.w;
    });
  });
}