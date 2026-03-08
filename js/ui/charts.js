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

  drawLineChart(canvas, {
    labels: rows.map((row) => row.year),
    lines: [
      {
        label: 'Total household spending',
        values: rows.map((row) => useReal ? row.spendingReal : row.spendingNominal),
        color: '#6d28d9',
        width: 3
      },
      {
        label: 'State pension income',
        values: rows.map((row) => useReal ? row.statePensionReal : row.statePensionNominal),
        color: '#15803d',
        width: 2.5
      },
      {
        label: 'Portfolio withdrawals',
        values: rows.map((row) => useReal ? row.withdrawalReal : row.withdrawalNominal),
        color: '#dc2626',
        width: 2.5
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
  const width = Math.max(320, Math.floor(rect.width || canvas.clientWidth || 320));
  const height = Number(canvas.getAttribute('height')) || canvas.height || 320;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 20, right: 20, bottom: 56, left: 110 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allValues = [];
  if (config.band) allValues.push(...config.band.lower, ...config.band.upper);
  config.lines.forEach((line) => allValues.push(...line.values));

  const minY = 0;
  const maxY = niceMax(Math.max(...allValues, 1));

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

  config.lines.forEach((line) => {
    drawSeries(ctx, line.values, {
      width: plotWidth,
      height: plotHeight,
      left: padding.left,
      top: padding.top,
      minY,
      maxY,
      color: line.color,
      lineWidth: line.width || 2
    });
  });

  drawXAxis(ctx, config.labels, width, height, padding);
  drawLegend(ctx, config.lines, width, height);
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

function drawSeries(ctx, values, geometry) {
  if (!values.length) return;

  ctx.beginPath();
  values.forEach((value, index) => {
    const x = geometry.left + getX(index, values.length, geometry.width);
    const y = geometry.top + getY(value, geometry.minY, geometry.maxY, geometry.height);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = geometry.color;
  ctx.lineWidth = geometry.lineWidth;
  ctx.stroke();
}

function drawXAxis(ctx, labels, width, height, padding) {
  const plotWidth = width - padding.left - padding.right;
  const baseline = height - padding.bottom + 18;
  const tickIndexes = [0, Math.floor((labels.length - 1) * 0.25), Math.floor((labels.length - 1) * 0.5), Math.floor((labels.length - 1) * 0.75), labels.length - 1];
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

function drawLegend(ctx, lines, width, height) {
  const boxSize = 12;
  const itemGap = 22;
  const startX = 18;
  const y = height - 22;

  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  let cursorX = startX;

  lines.forEach((line) => {
    ctx.fillStyle = line.color;
    ctx.fillRect(cursorX, y - boxSize / 2, boxSize, boxSize);

    ctx.fillStyle = '#334155';
    ctx.fillText(line.label, cursorX + boxSize + 8, y);
    cursorX += boxSize + 8 + ctx.measureText(line.label).width + itemGap;
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
