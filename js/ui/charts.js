export function renderPortfolioChart(canvas, result, useReal, formatCurrency) {
  if (!result?.monteCarlo || !result?.baseCase) return;

  const percentileSeries = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;

  const basePath = useReal
    ? result.baseCase.pathReal
    : result.baseCase.pathNominal;

  const labels = buildYearLabels(result.inputs.years);

  drawLineChart(canvas, {
    labels,
    band: {
      lower: percentileSeries.p10,
      upper: percentileSeries.p90,
      fillStyle: 'rgba(45, 91, 255, 0.15)'
    },
    lines: [
      { label: 'Median Monte Carlo', values: percentileSeries.p50, color: '#2d5bff', width: 3 },
      { label: 'Deterministic base case', values: basePath, color: '#0f766e', width: 2.5 }
    ],
    yFormatter: formatCurrency
  });
}

export function renderSpendingChart(canvas, result, useReal, formatCurrency, cutDiagnostics = {}) {
  if (!result?.baseCase?.rows) return;

  const rows = result.baseCase.rows;

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

  const withdrawalValues = rows.map((r, i) => {
    const spending = useReal ? r.spendingReal : r.spendingNominal;
    return Math.max(0, spending - pensionValues[i] - otherIncomeValues[i]);
  });

  const cutYears = rows
    .map((r, i) => ({
      index: i,
      cut: r.spendingCutPercent || 0
    }))
    .filter((x) => x.cut > 0);

  const shortfallYears = rows
    .map((r, i) => {
      const target = useReal ? r.targetSpendingReal : r.targetSpendingNominal;
      const actual = useReal ? r.spendingReal : r.spendingNominal;
      return {
        index: i,
        shortfall: Math.max(0, target - actual)
      };
    })
    .filter((x) => x.shortfall > 0);

  const shortfallMarkerIndexes = shortfallYears.map((x) => x.index);

  drawLineChart(canvas, {
    labels: rows.map((r) => r.year),

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

    gapBand: {
      upper: targetValues,
      lower: actualValues,
      fillStyle: 'rgba(220, 38, 38, 0.16)',
      strokeStyle: '#dc2626'
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
        ? { index: cutDiagnostics.firstCutYear, color: '#f59e0b', label: 'First cut' }
        : null,
      cutDiagnostics?.worstCutYear != null
        ? { index: cutDiagnostics.worstCutYear, color: '#ef4444', label: 'Worst cut' }
        : null,
      cutDiagnostics?.firstShortfallYear != null
        ? { index: cutDiagnostics.firstShortfallYear, color: '#dc2626', label: 'First shortfall' }
        : null,
      cutDiagnostics?.worstShortfallYear != null
        ? { index: cutDiagnostics.worstShortfallYear, color: '#7f1d1d', label: 'Worst shortfall' }
        : null
    ].filter(Boolean),

    pointHighlights: [
      cutDiagnostics?.firstShortfallYear != null
        ? {
            index: cutDiagnostics.firstShortfallYear,
            values: targetValues,
            color: '#dc2626',
            label: 'Shortfall begins'
          }
        : null,
      cutDiagnostics?.worstShortfallYear != null
        ? {
            index: cutDiagnostics.worstShortfallYear,
            values: targetValues,
            color: '#7f1d1d',
            label: 'Worst shortfall'
          }
        : null
    ].filter(Boolean),

    annotationBox:
      cutDiagnostics?.firstShortfallYear != null
        ? {
            title: 'Shortfall markers',
            lines: [
              'Dotted lines mark the first and worst spending shortfall years.',
              'Red shading shows the gap between target and actual spending.'
            ]
          }
        : null,

    shortfallMarkerIndexes,
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

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  const width = Math.max(420, Math.floor(rect.width || canvas.clientWidth || 420));
  const baseHeight = Number(canvas.dataset.baseHeight || canvas.getAttribute('height')) || 320;
  canvas.dataset.baseHeight = String(baseHeight);

  ctx.font = '12px Inter, system-ui, sans-serif';

  const legendItems = [
    ...(config.lines || []).map((l) => ({
      label: l.label,
      color: l.color,
      width: l.width || 2.5,
      dash: l.dash || []
    })),
    ...(config.stackedAreas || []).map((a) => ({
      label: a.label,
      color: a.strokeColor || a.color,
      width: 2.5
    })),
    ...(config.gapBand
      ? [{
          label: 'Shortfall gap',
          color: config.gapBand.strokeStyle || '#dc2626',
          width: 2
        }]
      : [])
  ];

  const legendLayout = measureLegend(ctx, legendItems, width);

  const padding = {
    top: 20,
    right: 20,
    bottom: 62 + legendLayout.height,
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

  if (config.band) {
    allValues.push(...config.band.lower, ...config.band.upper);
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

  const maxDataValue = allValues.length ? Math.max(...allValues, 1) : 1;

  const minY = 0;
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

  if (config.band) {
    drawBand(ctx, config.band.lower, config.band.upper, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY,
      fill: config.band.fillStyle
    });
  }

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

  if (config.annotationBox) {
    drawAnnotationBox(ctx, config.annotationBox, width, padding);
  }

  drawXAxis(ctx, config.labels, width, height, padding);
  drawLegend(ctx, width, height, legendLayout);
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
    const { index, values, color, label } = highlight;
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

    const boxWidth = Math.max(88, ctx.measureText(label).width + 16);
    const boxHeight = 24;
    const boxX = Math.min(geom.left + geom.width - boxWidth, x + 10);
    const boxY = Math.max(geom.top + 4, y - 30);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, boxX + 8, boxY + boxHeight / 2);

    ctx.restore();
  });
}

function drawAnnotationBox(ctx, annotation, width, padding) {
  const title = annotation.title || '';
  const lines = annotation.lines || [];
  if (!title && !lines.length) return;

  const boxWidth = Math.min(320, width - padding.left - padding.right - 16);
  const lineHeight = 16;
  const titleHeight = title ? 18 : 0;
  const boxHeight = 16 + titleHeight + lines.length * lineHeight + 12;
  const x = width - padding.right - boxWidth;
  const y = padding.top + 10;

  ctx.save();

  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  roundRect(ctx, x, y, boxWidth, boxHeight, 10);
  ctx.fill();

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, boxWidth, boxHeight, 10);
  ctx.stroke();

  let textY = y + 16;

  if (title) {
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + 12, textY);
    textY += titleHeight;
  }

  ctx.fillStyle = '#475569';
  lines.forEach((line) => {
    ctx.fillText(line, x + 12, textY);
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
  ctx.setLineDash([4, 4]);

  markers.forEach((marker) => {
    const x = geom.left + getX(marker.index, geom.seriesLength, geom.width);

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
  const markerSize = 12;
  const markerTextGap = 8;
  const itemGap = 28;
  const rowGap = 12;
  const maxRowWidth = Math.max(200, width - 36);

  const items = lines.map((line) => {
    const textWidth = ctx.measureText(line.label).width;
    const widthNeeded = markerSize + markerTextGap + textWidth;
    return { ...line, widthNeeded };
  });

  const rows = [];
  let row = [];
  let rowWidth = 0;

  items.forEach((item) => {
    const nextWidth = row.length === 0 ? item.widthNeeded : rowWidth + itemGap + item.widthNeeded;

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

  const rowHeight = 18;
  const heightNeeded = rows.length * rowHeight + (rows.length - 1) * rowGap + 18;

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
  let y = height - layout.height + 10;

  layout.rows.forEach((row) => {
    const rowWidth = row.reduce((sum, item) => sum + item.widthNeeded, 0) + (row.length - 1) * layout.itemGap;
    let x = (width - rowWidth) / 2;

    row.forEach((item) => {
      ctx.save();

      if (item.dash?.length) {
        ctx.beginPath();
        ctx.setLineDash(item.dash);
        ctx.moveTo(x, y);
        ctx.lineTo(x + layout.markerSize, y);
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width || 2.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = item.color;
        ctx.fillRect(x, y - 6, layout.markerSize, layout.markerSize);
      }

      ctx.restore();

      ctx.fillStyle = '#475569';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, x + layout.markerSize + layout.markerTextGap, y);

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
  else if (scaled <= 2) rounded = 2;
  else if (scaled <= 5) rounded = 5;
  else rounded = 10;

  return rounded * base;
}