import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { TimelineDay } from '../api/types';
import { addDays, dayCount, daysBetween, formatDay, formatDayShort, formatMonth } from '../lib/dates';
import { plural } from '../lib/format';
import { barPath, niceTicks, useElementWidth } from './useElementWidth';

// Daily transaction counts (FR-02). Days with at least one unusual transaction are drawn in
// the flag colour AND marked with a triangle, so the highlight never depends on colour alone.
// The whole column under the pointer is the hit target (thin bars are hard to hit), and the
// chart can be driven from the keyboard: focus it, move with the arrow keys, open with Enter.

interface Props {
  days: TimelineDay[];
  range: { start: string; end: string };
  onOpenDay: (date: string) => void;
}

const HEIGHT = 248;
const M = { top: 22, right: 12, bottom: 44, left: 44 };

export function TimelineChart({ days, range, onOpenDay }: Props) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  // Pad short ranges so a handful of days doesn't produce a few giant bars.
  const [start, end] = useMemo(() => {
    const span = dayCount(range.start, range.end);
    const pad = span < 21 ? Math.ceil((21 - span) / 2) : 0;
    return [addDays(range.start, -pad), addDays(range.end, pad)];
  }, [range.start, range.end]);

  const dense = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    return daysBetween(start, end).map((date) => byDate.get(date) ?? { date, txCount: 0, flaggedCount: 0 });
  }, [days, start, end]);
  const activeIdx = useMemo(() => dense.flatMap((d, i) => (d.txCount > 0 ? [i] : [])), [dense]);

  const plotW = Math.max(40, width - M.left - M.right);
  const plotH = HEIGHT - M.top - M.bottom;
  const band = plotW / dense.length;
  const barW = band >= 6 ? Math.min(24, band - 2) : Math.max(1, band * 0.8);
  const ticks = niceTicks(Math.max(...dense.map((d) => d.txCount), 1));
  const yMax = ticks[ticks.length - 1];
  const y = (v: number) => M.top + plotH - (v / yMax) * plotH;
  const xCenter = (i: number) => M.left + i * band + band / 2;

  const xTicks = useMemo(() => dateTicks(dense.map((d) => d.date), band), [dense, band]);

  function nearestActive(i: number): number | null {
    const reach = Math.max(2, Math.ceil(10 / band));
    let best: number | null = null;
    for (const j of activeIdx) {
      if (Math.abs(j - i) <= reach && (best === null || Math.abs(j - i) < Math.abs(best - i))) best = j;
    }
    return best;
  }

  function onPointerMove(e: PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - rect.left) / rect.width) * dense.length);
    setActive(nearestActive(Math.min(dense.length - 1, Math.max(0, i))));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (activeIdx.length === 0) return;
    const pos = active === null ? -1 : activeIdx.indexOf(active);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = activeIdx[Math.min(activeIdx.length - 1, pos + 1)];
    else if (e.key === 'ArrowLeft') next = activeIdx[Math.max(0, pos === -1 ? activeIdx.length - 1 : pos - 1)];
    else if (e.key === 'Home') next = activeIdx[0];
    else if (e.key === 'End') next = activeIdx[activeIdx.length - 1];
    else if ((e.key === 'Enter' || e.key === ' ') && active !== null) {
      e.preventDefault();
      onOpenDay(dense[active].date);
      return;
    }
    if (next !== null && next !== undefined) {
      e.preventDefault();
      setActive(next);
    }
  }

  const activeDay = active !== null ? dense[active] : null;
  const flaggedDays = days.filter((d) => d.flaggedCount > 0).length;
  const summary = `Bar chart of transactions per day from ${formatDay(range.start)} to ${formatDay(range.end)}: ${plural(days.length, 'day')} with activity, ${plural(flaggedDays, 'day')} with unusual transactions.`;

  return (
    <div className="chart timeline-chart" ref={containerRef}>
      <div
        className="chart-focus"
        tabIndex={0}
        role="group"
        aria-roledescription="chart"
        aria-label={`${summary} Use the left and right arrow keys to move between days with activity and Enter to open a day.`}
        onKeyDown={onKeyDown}
        onFocus={() => active === null && activeIdx.length && setActive(activeIdx[activeIdx.length - 1])}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} aria-hidden="true">
          <text className="axis-title" x={M.left - 8} y={12} textAnchor="end">
            Count
          </text>
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? 'axis-line' : 'grid-line'} x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} />
              <text className="tick-label" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {t}
              </text>
            </g>
          ))}

          {activeDay ? <rect className="hover-wash" x={M.left + active! * band} y={M.top} width={band} height={plotH} /> : null}

          {dense.map((d, i) => {
            if (d.txCount === 0) return null;
            const x0 = xCenter(i) - barW / 2;
            const top = y(d.txCount);
            const flagged = d.flaggedCount > 0;
            return (
              <g key={d.date} className={flagged ? 'bar bar-flagged' : 'bar'}>
                <path d={barW >= 4 ? barPath(x0, x0 + barW, y(0), top, 4, 'top') : `M${x0},${y(0)}V${top}h${barW}V${y(0)}Z`} />
                {flagged ? (
                  <path className="flag-marker" d={`M${xCenter(i)},${top - 12}l4.5,7.8h-9Z`} />
                ) : null}
              </g>
            );
          })}

          {xTicks.map((t) => (
            <g key={t.index}>
              <line className="axis-line" x1={xCenter(t.index)} x2={xCenter(t.index)} y1={y(0)} y2={y(0) + 4} />
              <text className="tick-label" x={xCenter(t.index)} y={y(0) + 18} textAnchor="middle">
                {t.label}
              </text>
            </g>
          ))}
          <text className="axis-title" x={M.left + plotW} y={HEIGHT - 4} textAnchor="end">
            Date (UTC)
          </text>

          <rect
            className="hit-area"
            x={M.left}
            y={M.top}
            width={plotW}
            height={plotH}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
            onClick={() => activeDay && activeDay.txCount > 0 && onOpenDay(activeDay.date)}
            style={{ cursor: activeDay ? 'pointer' : 'default' }}
          />
        </svg>
      </div>

      {activeDay ? (
        <div
          className="chart-tooltip"
          style={{
            left: Math.min(Math.max(xCenter(active!) - 90, 0), Math.max(0, width - 180)),
            top: Math.max(0, y(activeDay.txCount) - 86),
          }}
        >
          <strong>{plural(activeDay.txCount, 'transaction')}</strong>
          {activeDay.flaggedCount > 0 ? (
            <span className="tooltip-row">
              <span className="line-key line-key-flag" /> {activeDay.flaggedCount} unusual
            </span>
          ) : (
            <span className="tooltip-row muted">None unusual</span>
          )}
          <span className="tooltip-date">{formatDay(activeDay.date)}</span>
          <span className="tooltip-hint">Select to open this day</span>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {activeDay ? `${formatDay(activeDay.date)}: ${plural(activeDay.txCount, 'transaction')}, ${activeDay.flaggedCount} unusual.` : ''}
      </p>
    </div>
  );
}

/** Tick dates spaced so labels never overlap: weekly for short ranges, monthly for long ones. */
function dateTicks(dates: string[], band: number): Array<{ index: number; label: string }> {
  const minGap = 56; // px between labels
  const out: Array<{ index: number; label: string }> = [];
  if (dates.length <= 45) {
    const every = Math.max(7, Math.ceil(minGap / band / 7) * 7);
    for (let i = 0; i < dates.length; i += every) out.push({ index: i, label: formatDayShort(dates[i]) });
    return out;
  }
  let lastX = -Infinity;
  let lastYear = '';
  dates.forEach((d, i) => {
    if (!d.endsWith('-01')) return;
    if ((i - lastX) * band < minGap) return;
    const year = d.slice(0, 4);
    out.push({ index: i, label: formatMonth(d, year !== lastYear) });
    lastYear = year;
    lastX = i;
  });
  return out;
}
