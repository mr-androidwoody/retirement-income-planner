export function renderPortfolioChart(canvas, result, useReal, formatCurrency) {
  if (!result?.monteCarlo || !result?.baseCase) return;

  const percentileSeries = useReal
    ? result.monteCarlo.realPercentiles
    : result.monteCarlo.nominalPercentiles;
  const basePath = useReal ? result.baseCase.pathReal : result.baseCase.pathNominal;
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

export function renderSpendingChart(canvas, result, useReal, formatCurrency) {
  if (!result?.baseCase?.rows) return;

  const rows = result.baseCase.rows;

  const pensionValues = rows.map((row) =>
    useReal ? row.statePensionReal : row.statePensionNominal
  );

  const otherIncomeValues = rows.map((row) =>
    useReal ? row.otherIncomeReal : row.otherIncomeNominal
  );

  const withdrawalValues = rows.map((row, index) => {
    const actualSpending = useReal ? row.actualSpendingReal : row.actualSpendingNominal;
    return Math.max(0, actualSpending - pensionValues[index] - otherIncomeValues[index]);
  });

  drawLineChart(canvas, {
    labels: rows.map((row) => row.year),
    stackedAreas: [
      {
        label: 'Other income',
        values: otherIncomeValues,
        color: 'rgba(5, 150, 105, 0.18)',
        strokeColor: '#059669'
      },
      {
        label: 'State pension income',
        values: pensionValues,
        color: 'rgba(0, 0, 0, 0.25)',
        strokeColor: '#000000'
      },
      {
        label: 'Portfolio withdrawals',
        values: withdrawalValues,
        color: 'rgba(220, 38, 38, 0.18)',
        strokeColor: '#dc2626'
      }
    ],
    lines: [
      {
        label: 'Planned household spending',
        values: rows.map((row) => (useReal ? row.targetSpendingReal : row.targetSpendingNominal)),
        color: '#7c3aed',
        width: 2,
        dash: [8, 6]
      },
      {
        label: 'Actual spending after guardrails',
        values: rows.map((row) => (useReal ? row.actualSpendingReal : row.actualSpendingNominal)),
        color: '#4f46e5',
        width: 3
      }
    ],
    yFormatter: formatCurrency
  });
}

function buildYearLabels(years) {
  return Array.from({ length: years + 1 }, (_, index) => index);
}

function drawLineChart(canvas, config) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(420, Math.floor(rect.width || canvas.clientWidth || 420));
  const baseHeight = Number(canvas.getAttribute('height')) || canvas.height || 320;

  ctx.font = '12px Inter, system-ui, sans-serif';

  const legendItems = [
    ...(config.stackedAreas || []).map((area) => ({
      label: area.label,
      color: area.strokeColor || area.color,
      width: 2.5
    })),
    ...(config.lines || [])
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

  (config.stackedAreas || []).forEach((area) => {
    allValues.push(...area.values.filter((value) => Number.isFinite(value)));
  });

  if (config.stackedAreas?.length) {
    const stackedTotals = config.stackedAreas[0].values.map((_, index) =>
      config.stackedAreas.reduce(
        (sum, area) => sum + (Number.isFinite(area.values[index]) ? area.values[index] : 0),
        0
      )
    );
    allValues.push(...stackedTotals);
  }

  (config.lines || []).forEach((line) => {
    allValues.push(...line.values.filter((value) => Number.isFinite(value)));
  });

  const maxDataValue = allValues.length ? Math.max(...allValues, 1) : 1;
  const minY = 0;
  const maxY = niceMax(maxDataValue);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, width, height, padding, minY, maxY, config.yFormatter);

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
      dash: line.dash || []
    });
  });

  drawXAxis(ctx, config.labels, width, height, padding);
  drawLegend(ctx, width, height, legendLayout);
}

function drawGrid(ctx, width, height, padding, minY, maxY, yFormatter) {
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const steps = 5;

  ctx.strokeStyle = '#d7deea';
  ctx.fillStyle = '#657086';
  ctx.lineWidth = 1;
  ctx.font = '12px Inter, system-ui, sans-serif';

  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const y = padding.top + plotHeight - ratio * plotHeight;
    const value = minY + ratio * (maxY - minY);

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(yFormatter(value), 12, y);
  }

  ctx.strokeStyle = '#aeb7c8';
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.strokeStyle = '#d7deea';
  for (let index = 0; index <= 5; index += 1) {
    const x = padding.left + (index / 5) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }
}

function drawBand(ctx, lower, upper, geometry) {
  if (!lower.length || !upper.length || lower.length !== upper.length) return;

  ctx.beginPath();
  lower.forEach((value, index) => {
    const x = geometry.left + getX(index, lower.length, geometry.width);
    const y = geometry.top + getY(value, geometry.minY, geometry.maxY, geometry.height);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  for (let index = upper.length - 1; index >= 0; index -= 1) {
    const x = geometry.left + getX(index, upper.length, geometry.width);
    const y = geometry.top + getY(upper[index], geometry.minY, geometry.maxY, geometry.height);
    ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.fillStyle = geometry.fill;
  ctx.fill();
}

function drawStackedAreas(ctx, areas, geometry) {
  if (!areas?.length) return;

  const length = areas[0].values.length;
  if (!length) return;

  const cumulative = Array.from({ length }, () => 0);

  areas.forEach((area) => {
    const nextCumulative = cumulative.map((value, index) => {
      const areaValue = Number.isFinite(area.values[index]) ? area.values[index] : 0;
      return value + areaValue;
    });

    ctx.beginPath();

    nextCumulative.forEach((value, index) => {
      const x = geometry.left + getX(index, length, geometry.width);
      const y = geometry.top + getY(value, geometry.minY, geometry.maxY, geometry.height);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    for (let index = length - 1; index >= 0; index -= 1) {
      const x = geometry.left + getX(index, length, geometry.width);
      const y = geometry.top + getY(cumulative[index], geometry.minY, geometry.maxY, geometry.height);
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle = area.color;
    ctx.fill();

    ctx.beginPath();
    nextCumulative.forEach((value, index) => {
      const x = geometry.left + getX(index, length, geometry.width);
      const y = geometry.top + getY(value, geometry.minY, geometry.maxY, geometry.height);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = area.strokeColor || area.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let index = 0; index < length; index += 1) {
      cumulative[index] = nextCumulative[index];
    }
  });
}

function drawSeries(ctx, values, geometry) {
  const cleanValues = values.map((value) => (Number.isFinite(value) ? value : 0));
  if (!cleanValues.length) return;

  ctx.save();
  ctx.beginPath();
  ctx.setLineDash(geometry.dash);

  cleanValues.forEach((value, index) => {
    const x = geometry.left + getX(index, cleanValues.length, geometry.width);
    const y = geometry.top + getY(value, geometry.minY, geometry.maxY, geometry.height);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = geometry.color;
  ctx.lineWidth = geometry.lineWidth;
  ctx.stroke();
  ctx.restore();
}

function drawXAxis(ctx, labels, width, height, padding) {
  const plotWidth = width - padding.left - padding.right;
  const baseline = height - padding.bottom + 14;
  const tickIndexes = [
    0,
    Math.floor((labels.length - 1) * 0.25),
    Math.floor((labels.length - 1) * 0.5),
    Math.floor((labels.length - 1) * 0.75),
    labels.length - 1
  ];
  const uniqueIndexes = [...new Set(tickIndexes.filter((value) => value >= 0))];

  ctx.fillStyle = '#657086';
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  uniqueIndexes.forEach((index) => {
    const x = padding.left + getX(index, labels.length, plotWidth);
    ctx.fillText(String(labels[index]), x, baseline);
  });
}

function measureLegend(ctx, lines, width) {
  const markerWidth = 18;
  const markerTextGap = 8;
  const itemGap = 26;
  const rowGap = 10;
  const horizontalPadding = 18;
  const maxRowWidth = Math.max(200, width - horizontalPadding * 2);

  const items = lines.map((line) => {
    const textWidth = ctx.measureText(line.label).width;
    const widthNeeded = markerWidth + markerTextGap + textWidth;
    return {
      ...line,
      textWidth,
      widthNeeded
    };
  });

  const rows = [];
  let currentRow = [];
  let currentWidth = 0;

  items.forEach((item) => {
    const nextWidth =
      currentRow.length === 0
        ? item.widthNeeded
        : currentWidth + itemGap + item.widthNeeded;

    if (nextWidth > maxRowWidth && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [item];
      currentWidth = item.widthNeeded;
    } else {
      currentRow.push(item);
      currentWidth = nextWidth;
    }
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  const rowHeight = 14;
  const height = rows.length * rowHeight + Math.max(0, rows.length - 1) * rowGap + 16;

  return {
    rows,
    markerWidth,
    markerTextGap,
    itemGap,
    rowGap,
    rowHeight,
    height
  };
}

function drawLegend(ctx, width, height, layout) {
  if (!layout?.rows?.length) return;

  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  let cursorY = height - layout.height + 8;

  layout.rows.forEach((row) => {
    const rowWidth = row.reduce((sum, item, index) => {
      return sum + item.widthNeeded + (index > 0 ? layout.itemGap : 0);
    }, 0);

    let cursorX = Math.max(18, (width - rowWidth) / 2);

    row.forEach((item) => {
      const lineY = cursorY;

      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width || 2.5;
      ctx.setLineDash(item.dash || []);
      ctx.beginPath();
      ctx.moveTo(cursorX, lineY);
      ctx.lineTo(cursorX + layout.markerWidth, lineY);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#475569';
      ctx.fillText(item.label, cursorX + layout.markerWidth + layout.markerTextGap, lineY);

      cursorX += item.widthNeeded + layout.itemGap;
    });

    cursorY += layout.rowHeight + layout.rowGap;
  });
}

function getX(index, length, width) {
  if (length <= 1) return 0;
  return (index / (length - 1)) * width;
}

function getY(value, minY, maxY, height) {
  if (maxY === minY) return height;
  const ratio = (value - minY) / (maxY - minY);
  return height - ratio * height;
}

function niceMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const scaled = value / base;

  let rounded;
  if (scaled <= 1) rounded = 1;
  else if (scaled <= 2) rounded = 2;
  else if (scaled <= 5) rounded = 5;
  else rounded = 10;

  return rounded * base;
}