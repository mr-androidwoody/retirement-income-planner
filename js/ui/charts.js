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

export function renderSurvivalChart(canvas, result, formatPercent) {
  if (!result?.monteCarlo?.nominalPercentiles) return;

  const years = result.inputs.years;
  const p10 = result.monteCarlo.nominalPercentiles.p10;

  const survival = p10.map(v => (v > 0 ? 1 : 0));

  let running = 1;
  const survivalCurve = survival.map(v => {
    running = Math.min(running, v);
    return running;
  });

  drawLineChart(canvas, {
    labels: Array.from({ length: years + 1 }, (_, i) => i),
    lines: [
      {
        label: 'Portfolio survival probability',
        values: survivalCurve,
        color: '#2563eb',
        width: 3
      }
    ],
    yFormatter: formatPercent
  });
}

export function renderSpendingChart(canvas, result, useReal, formatCurrency) {
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
        width: 3
      }
    ],

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
  const baseHeight = Number(canvas.getAttribute('height')) || canvas.height || 320;

  ctx.font = '12px Inter, system-ui, sans-serif';

  const legendItems = [
    ...(config.lines || []),
    ...(config.stackedAreas || []).map(a => ({
      label: a.label,
      color: a.strokeColor || a.color,
      width: 2.5
    }))
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

  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (plotWidth <= 0 || plotHeight <= 0) return;

  const allValues = [];

  if (config.band) {
    allValues.push(...config.band.lower,...config.band.upper);
  }

  (config.stackedAreas || []).forEach(a => {
    allValues.push(...a.values.filter(Number.isFinite));
  });

  if (config.stackedAreas?.length) {
    const totals = config.stackedAreas[0].values.map((_,i)=>
      config.stackedAreas.reduce((s,a)=>s+(a.values[i]||0),0)
    );
    allValues.push(...totals);
  }

  (config.lines || []).forEach(l=>{
    allValues.push(...l.values.filter(Number.isFinite));
  });

  const maxDataValue = allValues.length ? Math.max(...allValues,1) : 1;

  const minY = 0;
  const maxY = niceMax(maxDataValue);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,width,height);

  drawGrid(ctx,width,height,padding,minY,maxY,config.yFormatter);

  if (config.band) {
    drawBand(ctx,config.band.lower,config.band.upper,{
      width:plotWidth,
      height:plotHeight,
      left:padding.left,
      top:padding.top,
      minY,
      maxY,
      fill:config.band.fillStyle
    });
  }

  if (config.stackedAreas?.length) {
    drawStackedAreas(ctx,config.stackedAreas,{
      width:plotWidth,
      height:plotHeight,
      left:padding.left,
      top:padding.top,
      minY,
      maxY
    });
  }

  (config.lines || []).forEach(line=>{
    drawSeries(ctx,line.values,{
      width:plotWidth,
      height:plotHeight,
      left:padding.left,
      top:padding.top,
      minY,
      maxY,
      color:line.color,
      lineWidth:line.width || 2,
      dash:line.dash || []
    });
  });

  drawXAxis(ctx,config.labels,width,height,padding);
  drawLegend(ctx,width,height,legendLayout);
}

function drawStackedAreas(ctx,areas,geom) {
  const length = areas[0].values.length;
  const cumulative = Array.from({length},()=>0);

  areas.forEach(area=>{
    const next = cumulative.map((v,i)=>v+(area.values[i]||0));

    ctx.beginPath();

    next.forEach((v,i)=>{
      const x = geom.left + getX(i,length,geom.width);
      const y = geom.top + getY(v,geom.minY,geom.maxY,geom.height);
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });

    for(let i=length-1;i>=0;i--){
      const x = geom.left + getX(i,length,geom.width);
      const y = geom.top + getY(cumulative[i],geom.minY,geom.maxY,geom.height);
      ctx.lineTo(x,y);
    }

    ctx.closePath();
    ctx.fillStyle = area.color;
    ctx.fill();

    ctx.beginPath();

    next.forEach((v,i)=>{
      const x = geom.left + getX(i,length,geom.width);
      const y = geom.top + getY(v,geom.minY,geom.maxY,geom.height);
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });

    ctx.strokeStyle = area.strokeColor || area.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for(let i=0;i<length;i++) cumulative[i]=next[i];
  });
}

function drawSeries(ctx,values,geom) {
  const clean = values.map(v => Number.isFinite(v)?v:0);
  if(!clean.length) return;

  ctx.save();
  ctx.beginPath();
  ctx.setLineDash(geom.dash);

  clean.forEach((v,i)=>{
    const x = geom.left + getX(i,clean.length,geom.width);
    const y = geom.top + getY(v,geom.minY,geom.maxY,geom.height);
    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });

  ctx.strokeStyle = geom.color;
  ctx.lineWidth = geom.lineWidth;
  ctx.stroke();
  ctx.restore();
}

function drawGrid(ctx,width,height,padding,minY,maxY,yFormatter) {
  const plotHeight = height - padding.top - padding.bottom;
  const steps = 5;

  ctx.strokeStyle = '#d7deea';
  ctx.fillStyle = '#657086';
  ctx.lineWidth = 1;

  for(let i=0;i<=steps;i++){
    const ratio = i/steps;
    const y = padding.top + plotHeight - ratio*plotHeight;
    const val = minY + ratio*(maxY-minY);

    ctx.beginPath();
    ctx.moveTo(padding.left,y);
    ctx.lineTo(width-padding.right,y);
    ctx.stroke();

    ctx.textAlign='left';
    ctx.textBaseline='middle';
    ctx.fillText(yFormatter(val),12,y);
  }
}

function drawBand(ctx,lower,upper,g){
  if(!lower.length || lower.length!==upper.length) return;

  ctx.beginPath();

  lower.forEach((v,i)=>{
    const x=g.left+getX(i,lower.length,g.width);
    const y=g.top+getY(v,g.minY,g.maxY,g.height);
    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });

  for(let i=upper.length-1;i>=0;i--){
    const x=g.left+getX(i,upper.length,g.width);
    const y=g.top+getY(upper[i],g.minY,g.maxY,g.height);
    ctx.lineTo(x,y);
  }

  ctx.closePath();
  ctx.fillStyle=g.fill;
  ctx.fill();
}

function drawXAxis(ctx,labels,width,height,padding){
  const plotWidth = width-padding.left-padding.right;
  const baseline = height-padding.bottom+14;

  ctx.fillStyle='#657086';
  ctx.textAlign='center';

  const ticks=[0,0.25,0.5,0.75,1];

  ticks.forEach(t=>{
    const i=Math.floor((labels.length-1)*t);
    const x=padding.left+getX(i,labels.length,plotWidth);
    ctx.fillText(labels[i],x,baseline);
  });
}

function measureLegend(ctx,lines,width){
  const markerWidth=18;
  const markerTextGap=8;
  const itemGap=26;
  const rowGap=10;
  const maxRowWidth=Math.max(200,width-36);

  const items=lines.map(l=>{
    const textWidth=ctx.measureText(l.label).width;
    const widthNeeded=markerWidth+markerTextGap+textWidth;
    return {...l,widthNeeded};
  });

  const rows=[];
  let row=[],w=0;

  items.forEach(item=>{
    const next=row.length===0?item.widthNeeded:w+itemGap+item.widthNeeded;

    if(next>maxRowWidth && row.length){
      rows.push(row);
      row=[item];
      w=item.widthNeeded;
    } else {
      row.push(item);
      w=next;
    }
  });

  if(row.length) rows.push(row);

  const rowHeight=14;
  const height=rows.length*rowHeight + (rows.length-1)*rowGap + 16;

  return {rows,rowHeight,itemGap,rowGap,markerWidth,markerTextGap,height};
}

function drawLegend(ctx,width,height,l){
  let y = height - l.height + 8;

  l.rows.forEach(row=>{
    let x = (width - row.reduce((s,i)=>s+i.widthNeeded,0))/2;

    row.forEach(item=>{
      ctx.strokeStyle=item.color;
      ctx.lineWidth=item.width||2.5;
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.lineTo(x+l.markerWidth,y);
      ctx.stroke();

      ctx.fillStyle='#475569';
      ctx.fillText(item.label,x+l.markerWidth+l.markerTextGap,y);

      x+=item.widthNeeded+l.itemGap;
    });

    y+=l.rowHeight+l.rowGap;
  });
}

function getX(i,len,w){ return len<=1 ? 0 : (i/(len-1))*w; }

function getY(v,min,max,h){
  if(max===min) return h;
  const r=(v-min)/(max-min);
  return h - r*h;
}

function niceMax(v){
  if(!Number.isFinite(v)||v<=0) return 1;

  const e=Math.floor(Math.log10(v));
  const b=10**e;
  const s=v/b;

  let r;
  if(s<=1) r=1;
  else if(s<=2) r=2;
  else if(s<=5) r=5;
  else r=10;

  return r*b;
}