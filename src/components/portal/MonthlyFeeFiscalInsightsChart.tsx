import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Percent,
  TrendingUp,
} from 'lucide-react';
import { FeeAssignment, PaymentRecord } from '../../types/portal';
import { calculateAssignmentBalancePaise, formatPaiseToINR } from '../../utils/finance';
import { Badge, Button, GlassCard, Select } from '../ui/DesignSystem';

export interface MonthlyFiscalData {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // "Oct 2026"
  collectedPaise: number;
  outstandingPaise: number;
  totalExpectedPaise: number;
  collectionRatePct: number;
  paymentsCount: number;
  assignmentsCount: number;
}

interface MonthlyFeeFiscalInsightsChartProps {
  feeAssignments: FeeAssignment[];
  payments: PaymentRecord[];
  onToast: (msg: string) => void;
}

export const MonthlyFeeFiscalInsightsChart: React.FC<
  MonthlyFeeFiscalInsightsChartProps
> = ({ feeAssignments, payments, onToast }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'ytd'>('6m');
  const [chartMode, setChartMode] = useState<'side_by_side' | 'stacked' | 'efficiency'>('side_by_side');
  const [hoveredData, setHoveredData] = useState<MonthlyFiscalData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Compute monthly aggregated fiscal data from real payments & fee assignments
  const monthlyData: MonthlyFiscalData[] = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const monthsMap = new Map<
      string,
      { collected: number; outstanding: number; payCount: number; assignCount: number }
    >();

    // 1. Process all recorded payments grouped by payment created_at month
    for (const p of payments) {
      if (!p || (p as any).status === 'reversed' || p.mode === 'reversal') continue;
      const mKey = (p.created_at || todayIso).slice(0, 7); // "YYYY-MM"
      const existing = monthsMap.get(mKey) || {
        collected: 0,
        outstanding: 0,
        payCount: 0,
        assignCount: 0,
      };
      existing.collected += Math.trunc(p.amount_paise || 0);
      existing.payCount += 1;
      monthsMap.set(mKey, existing);
    }

    // 2. Process all fee assignments grouped by due_date month
    for (const fa of feeAssignments) {
      if (!fa) continue;
      const mKey = (fa.due_date || todayIso).slice(0, 7);
      const calc = calculateAssignmentBalancePaise(fa, todayIso, payments);
      const existing = monthsMap.get(mKey) || {
        collected: 0,
        outstanding: 0,
        payCount: 0,
        assignCount: 0,
      };
      existing.outstanding += calc.outstandingPaise;
      existing.assignCount += 1;
      monthsMap.set(mKey, existing);
    }

    // If dataset is small, generate baseline recent months (e.g. 2026-05 through 2026-10)
    const baseMonths = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
    for (const bm of baseMonths) {
      if (!monthsMap.has(bm)) {
        monthsMap.set(bm, { collected: 0, outstanding: 0, payCount: 0, assignCount: 0 });
      }
    }

    // Sort chronologically
    const sortedKeys = Array.from(monthsMap.keys()).sort();

    const result: MonthlyFiscalData[] = sortedKeys.map((mKey) => {
      const entry = monthsMap.get(mKey)!;
      const totalExp = entry.collected + entry.outstanding;
      const rate = totalExp > 0 ? Number(((entry.collected / totalExp) * 100).toFixed(1)) : 100;

      const [year, monthNum] = mKey.split('-');
      const dateObj = new Date(Number(year), Number(monthNum) - 1, 1);
      const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      return {
        monthKey: mKey,
        monthLabel: label,
        collectedPaise: entry.collected,
        outstandingPaise: entry.outstanding,
        totalExpectedPaise: totalExp,
        collectionRatePct: rate,
        paymentsCount: entry.payCount,
        assignmentsCount: entry.assignCount,
      };
    });

    // Apply time range filter
    if (timeRange === '6m') {
      return result.slice(-6);
    } else if (timeRange === 'ytd') {
      return result.filter((d) => d.monthKey.startsWith('2026'));
    }
    return result.slice(-12);
  }, [feeAssignments, payments, timeRange]);

  // Fiscal Metrics Summary
  const metrics = useMemo(() => {
    let totalCol = 0;
    let totalOut = 0;
    let peakMonth = '-';
    let maxCol = -1;

    for (const d of monthlyData) {
      totalCol += d.collectedPaise;
      totalOut += d.outstandingPaise;
      if (d.collectedPaise > maxCol) {
        maxCol = d.collectedPaise;
        peakMonth = d.monthLabel;
      }
    }

    const grandTotal = totalCol + totalOut;
    const overallRate = grandTotal > 0 ? ((totalCol / grandTotal) * 100).toFixed(1) : '100.0';

    return {
      totalCol,
      totalOut,
      grandTotal,
      overallRate,
      peakMonth,
    };
  }, [monthlyData]);

  // Render D3 SVG Visualization Engine
  useEffect(() => {
    if (!svgRef.current || monthlyData.length === 0) return;

    const container = containerRef.current;
    const width = container ? container.clientWidth : 750;
    const height = 360;

    const margin = { top: 35, right: 55, bottom: 45, left: 75 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Create chart group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const xScale = d3
      .scaleBand()
      .domain(monthlyData.map((d) => d.monthLabel))
      .range([0, innerWidth])
      .padding(0.35);

    // Y Scale (Left Axis: Rupees in Lakhs / Thousands)
    const maxMonetaryPaise =
      d3.max(monthlyData, (d) =>
        chartMode === 'stacked' ? d.totalExpectedPaise : Math.max(d.collectedPaise, d.outstandingPaise)
      ) || 10000000;

    const yScaleLeft = d3
      .scaleLinear()
      .domain([0, maxMonetaryPaise * 1.15])
      .range([innerHeight, 0])
      .nice();

    // Y Scale (Right Axis: Collection Rate 0% to 100%)
    const yScaleRight = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // Grid Lines
    const yGrid = d3
      .axisLeft(yScaleLeft)
      .tickSize(-innerWidth)
      .tickFormat(() => '')
      .ticks(5);

    g.append('g')
      .attr('class', 'grid-lines')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', 'var(--border)')
      .attr('stroke-opacity', '0.35')
      .attr('stroke-dasharray', '3 3');

    // Subtle Linear Gradients for Bars
    const defs = svg.append('defs');

    // Collected Gradient (Emerald to Indigo)
    const colGrad = defs
      .append('linearGradient')
      .attr('id', 'collected-bar-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    colGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981');
    colGrad.append('stop').attr('offset', '100%').attr('stop-color', '#059669');

    // Outstanding Gradient (Crimson/Rose)
    const outGrad = defs
      .append('linearGradient')
      .attr('id', 'outstanding-bar-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    outGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e');
    outGrad.append('stop').attr('offset', '100%').attr('stop-color', '#e11d48');

    // Render Bars based on chartMode
    if (chartMode === 'side_by_side') {
      const subXScale = d3
        .scaleBand()
        .domain(['collected', 'outstanding'])
        .range([0, xScale.bandwidth()])
        .padding(0.12);

      const monthGroups = g
        .selectAll('.month-group')
        .data(monthlyData)
        .enter()
        .append('g')
        .attr('transform', (d) => `translate(${xScale(d.monthLabel)},0)`);

      // Collected Bars
      monthGroups
        .append('rect')
        .attr('x', subXScale('collected')!)
        .attr('y', innerHeight)
        .attr('width', subXScale.bandwidth())
        .attr('height', 0)
        .attr('fill', 'url(#collected-bar-grad)')
        .attr('rx', 4)
        .attr('ry', 4)
        .transition()
        .duration(750)
        .attr('y', (d) => yScaleLeft(d.collectedPaise))
        .attr('height', (d) => innerHeight - yScaleLeft(d.collectedPaise));

      // Outstanding Bars
      monthGroups
        .append('rect')
        .attr('x', subXScale('outstanding')!)
        .attr('y', innerHeight)
        .attr('width', subXScale.bandwidth())
        .attr('height', 0)
        .attr('fill', 'url(#outstanding-bar-grad)')
        .attr('rx', 4)
        .attr('ry', 4)
        .transition()
        .duration(750)
        .attr('y', (d) => yScaleLeft(d.outstandingPaise))
        .attr('height', (d) => innerHeight - yScaleLeft(d.outstandingPaise));

      // Overlay Hitbox rect for seamless hover tooltips
      monthGroups
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', xScale.bandwidth())
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d: MonthlyFiscalData) => {
          setHoveredData(d);
          const el = event.currentTarget as Element | null;
          if (el) {
            const bounds = el.getBoundingClientRect();
            setTooltipPos({ x: bounds.left + bounds.width / 2, y: bounds.top - 10 });
          }
        })
        .on('mouseleave', () => {
          setHoveredData(null);
          setTooltipPos(null);
        });
    } else if (chartMode === 'stacked') {
      const monthGroups = g
        .selectAll('.month-group')
        .data(monthlyData)
        .enter()
        .append('g')
        .attr('transform', (d) => `translate(${xScale(d.monthLabel)},0)`);

      // Collected Stack (Bottom)
      monthGroups
        .append('rect')
        .attr('x', 0)
        .attr('y', innerHeight)
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', 'url(#collected-bar-grad)')
        .attr('rx', 4)
        .transition()
        .duration(750)
        .attr('y', (d) => yScaleLeft(d.collectedPaise))
        .attr('height', (d) => innerHeight - yScaleLeft(d.collectedPaise));

      // Outstanding Stack (Top)
      monthGroups
        .append('rect')
        .attr('x', 0)
        .attr('y', (d) => yScaleLeft(d.collectedPaise))
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', 'url(#outstanding-bar-grad)')
        .attr('rx', 4)
        .transition()
        .duration(750)
        .attr('y', (d) => yScaleLeft(d.totalExpectedPaise))
        .attr('height', (d) =>
          Math.max(0, yScaleLeft(d.collectedPaise) - yScaleLeft(d.totalExpectedPaise))
        );

      // Hitbox
      monthGroups
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', xScale.bandwidth())
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d: MonthlyFiscalData) => {
          setHoveredData(d);
          const el = event.currentTarget as Element | null;
          if (el) {
            const bounds = el.getBoundingClientRect();
            setTooltipPos({ x: bounds.left + bounds.width / 2, y: bounds.top - 10 });
          }
        })
        .on('mouseleave', () => {
          setHoveredData(null);
          setTooltipPos(null);
        });
    } else {
      // Efficiency Focus: Single Bar for Collection Rate
      const bars = g
        .selectAll('.eff-bar')
        .data(monthlyData)
        .enter()
        .append('rect')
        .attr('x', (d) => xScale(d.monthLabel)!)
        .attr('y', innerHeight)
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', (d) => (d.collectionRatePct >= 80 ? '#10b981' : d.collectionRatePct >= 60 ? '#f59e0b' : '#ef4444'))
        .attr('rx', 6)
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d: MonthlyFiscalData) => {
          setHoveredData(d);
          const el = event.currentTarget as Element | null;
          if (el) {
            const bounds = el.getBoundingClientRect();
            setTooltipPos({ x: bounds.left + bounds.width / 2, y: bounds.top - 10 });
          }
        })
        .on('mouseleave', () => {
          setHoveredData(null);
          setTooltipPos(null);
        });

      bars
        .transition()
        .duration(750)
        .attr('y', (d) => yScaleRight(d.collectionRatePct))
        .attr('height', (d) => innerHeight - yScaleRight(d.collectionRatePct));
    }

    // D3 Spline Overlay Line for Collection Efficiency Rate %
    if (chartMode !== 'efficiency') {
      const lineGenerator = d3
        .line<MonthlyFiscalData>()
        .x((d) => (xScale(d.monthLabel) || 0) + xScale.bandwidth() / 2)
        .y((d) => yScaleRight(d.collectionRatePct))
        .curve(d3.curveMonotoneX);

      const path = g
        .append('path')
        .datum(monthlyData)
        .attr('fill', 'none')
        .attr('stroke', '#6366f1')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', function () {
          const l = (this as SVGPathElement).getTotalLength();
          return `${l} ${l}`;
        })
        .attr('stroke-dashoffset', function () {
          return (this as SVGPathElement).getTotalLength();
        })
        .attr('d', lineGenerator);

      path.transition().duration(1000).attr('stroke-dashoffset', 0);

      // Data Points on Line
      g.selectAll('.line-node')
        .data(monthlyData)
        .enter()
        .append('circle')
        .attr('cx', (d) => (xScale(d.monthLabel) || 0) + xScale.bandwidth() / 2)
        .attr('cy', (d) => yScaleRight(d.collectionRatePct))
        .attr('r', 0)
        .attr('fill', '#ffffff')
        .attr('stroke', '#4f46e5')
        .attr('stroke-width', 3)
        .transition()
        .delay(600)
        .duration(400)
        .attr('r', 5);
    }

    // X Axis
    const xAxis = d3.axisBottom(xScale);
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', 'var(--text)')
      .style('font-size', '12px')
      .style('font-weight', '600');

    // Y Axis Left (Rupees)
    const yAxisLeft = d3
      .axisLeft(yScaleLeft)
      .ticks(5)
      .tickFormat((d) => {
        const val = Number(d) / 100; // to INR
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
        return `₹${val}`;
      });

    g.append('g')
      .attr('class', 'y-axis-left')
      .call(yAxisLeft)
      .selectAll('text')
      .attr('fill', 'var(--text-muted)')
      .style('font-size', '11px');

    // Y Axis Right (% Efficiency)
    const yAxisRight = d3
      .axisRight(yScaleRight)
      .ticks(5)
      .tickFormat((d) => `${d}%`);

    g.append('g')
      .attr('class', 'y-axis-right')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(yAxisRight)
      .selectAll('text')
      .attr('fill', '#6366f1')
      .style('font-size', '11px')
      .style('font-weight', '600');
  }, [monthlyData, chartMode]);

  // Export Chart SVG Action
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monthly-fee-fiscal-breakdown-${timeRange}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToast('Exported D3 Fiscal Visualization SVG chart.');
  };

  // Export Monthly CSV Breakdown Action
  const handleExportCSV = () => {
    if (monthlyData.length === 0) return;
    const headers = [
      'Month',
      'Collected Fees (INR)',
      'Outstanding Dues (INR)',
      'Total Expected Dues (INR)',
      'Collection Efficiency (%)',
      'Payments Count',
      'Assignments Count',
    ];

    const rows = monthlyData.map((d) => [
      d.monthLabel,
      (d.collectedPaise / 100).toFixed(2),
      (d.outstandingPaise / 100).toFixed(2),
      (d.totalExpectedPaise / 100).toFixed(2),
      `${d.collectionRatePct}%`,
      d.paymentsCount,
      d.assignmentsCount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `monthly-fee-fiscal-audit-${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('Downloaded Monthly Fee Fiscal Breakdown CSV.');
  };

  return (
    <GlassCard padding="lg" className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--accent-text)]" />
              <span>D3 Monthly Fee Fiscal Breakdown &amp; Collection Efficiency</span>
            </h2>
            <Badge tone="accent">D3.js Vector Analytics</Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Real-time monthly comparison of collected fee revenue versus outstanding student dues and collection efficiency rates.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            options={[
              { value: '6m', label: 'Last 6 Months' },
              { value: '12m', label: 'Last 12 Months' },
              { value: 'ytd', label: 'Year 2026 Cohort' },
            ]}
          />
          <Select
            value={chartMode}
            onChange={(e) => setChartMode(e.target.value as any)}
            options={[
              { value: 'side_by_side', label: 'Side-by-Side Bars' },
              { value: 'stacked', label: 'Stacked Dues' },
              { value: 'efficiency', label: 'Collection Rate %' },
            ]}
          />
          <Button variant="secondary" size="sm" onClick={handleExportSVG} title="Download SVG Chart">
            <Download className="h-3.5 w-3.5" />
            <span>SVG</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportCSV} title="Export CSV Data">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>CSV</span>
          </Button>
        </div>
      </div>

      {/* Fiscal Metrics Summary Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5 text-xs">
        <div>
          <div className="text-[var(--text-muted)] font-medium">Period Total Collected</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-[var(--success)]">
            {formatPaiseToINR(metrics.totalCol)}
          </div>
        </div>
        <div>
          <div className="text-[var(--text-muted)] font-medium">Period Outstanding Dues</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-[var(--danger)]">
            {formatPaiseToINR(metrics.totalOut)}
          </div>
        </div>
        <div>
          <div className="text-[var(--text-muted)] font-medium">Overall Collection Rate</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-indigo-500">
            {metrics.overallRate}%
          </div>
        </div>
        <div>
          <div className="text-[var(--text-muted)] font-medium">Peak Revenue Month</div>
          <div className="mt-0.5 font-semibold text-[var(--text)]">{metrics.peakMonth}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-[var(--text-muted)] gap-3 pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-emerald-500 inline-block" />
            <span className="font-medium text-[var(--text)]">Collected Fees</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-rose-500 inline-block" />
            <span className="font-medium text-[var(--text)]">Outstanding Dues</span>
          </div>
          {chartMode !== 'efficiency' && (
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-indigo-500 inline-block" />
              <span className="font-semibold text-indigo-500">Collection Efficiency % Line</span>
            </div>
          )}
        </div>
        <div className="text-[11px] italic">
          Hover over chart bars or data nodes to view full monthly breakdowns
        </div>
      </div>

      {/* D3 Canvas Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden min-h-[360px]">
        <svg ref={svgRef} className="w-full overflow-visible" />

        {/* Floating Tooltip */}
        {hoveredData && tooltipPos && (
          <div
            className="fixed z-50 pointer-events-none rounded-[12px] glass-strong border border-[var(--border)] p-3.5 shadow-2xl text-xs space-y-2 transform -translate-x-1/2 -translate-y-full"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="font-bold text-sm border-b border-[var(--border)] pb-1.5 text-[var(--text)] flex items-center justify-between gap-3">
              <span>{hoveredData.monthLabel}</span>
              <Badge
                tone={
                  hoveredData.collectionRatePct >= 80
                    ? 'success'
                    : hoveredData.collectionRatePct >= 60
                    ? 'warning'
                    : 'danger'
                }
              >
                {hoveredData.collectionRatePct}% Efficient
              </Badge>
            </div>
            <div className="space-y-1 font-mono text-[11.5px]">
              <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Collected:</span>
                <span>{formatPaiseToINR(hoveredData.collectedPaise)}</span>
              </div>
              <div className="flex justify-between gap-4 text-rose-600 dark:text-rose-400 font-semibold">
                <span>Outstanding Dues:</span>
                <span>{formatPaiseToINR(hoveredData.outstandingPaise)}</span>
              </div>
              <div className="flex justify-between gap-4 text-[var(--text)] pt-1 border-t border-[var(--border)]">
                <span>Total Due Assigned:</span>
                <span>{formatPaiseToINR(hoveredData.totalExpectedPaise)}</span>
              </div>
            </div>
            <div className="text-[10.5px] text-[var(--text-muted)] pt-1">
              {hoveredData.paymentsCount} payments · {hoveredData.assignmentsCount} assignments
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
