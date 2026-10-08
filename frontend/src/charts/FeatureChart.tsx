import type { FeatureDetail } from '../api/types';
import { formatZ } from '../lib/format';
import { barPath, useElementWidth } from './useElementWidth';

// Feature deviation chart: how far each feature of the selected transaction is from the
// address's usual value, as a robust z-score. Bars to the right are above usual, to the left
// below. Reference lines mark the contributing level (±2) and the flag level (±3.5).
// Values that run off the scale are drawn to the edge with an arrow; the z column always
// shows the real number, and the table beneath the chart repeats every value.

interface Props {
  features: FeatureDetail[];
  flagAbsZ: number;
  contributingAbsZ: number;
}

const ROW = 40;
const BAR = 14;
const M = { top: 26, right: 56, bottom: 40 };

export function FeatureChart({ features, flagAbsZ, contributingAbsZ }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>(480);
  const labelW = width < 420 ? 92 : 128;
  const zs = features.map((f) => Math.abs(f.z ?? 0));
  const limit = Math.min(12, Math.max(5, Math.ceil(Math.max(...zs, flagAbsZ) + 0.5)));
  const plotW = Math.max(60, width - labelW - M.right);
  const height = M.top + features.length * ROW + M.bottom;
  const x = (z: number) => labelW + ((Math.max(-limit, Math.min(limit, z)) + limit) / (2 * limit)) * plotW;
  const step = limit <= 6 ? 2 : 4;
  const ticks: number[] = [];
  for (let t = -Math.floor(limit / step) * step; t <= limit; t += step) ticks.push(t);
  const refs = [-flagAbsZ, -contributingAbsZ, contributingAbsZ, flagAbsZ];
  // On narrow charts the two reference labels on each side would touch; label the positive side only.
  const labelBothSides = x(flagAbsZ) - x(contributingAbsZ) >= 30;

  const describe = features
    .map((f) => (f.z === null ? `${f.name}: no comparison data` : `${f.name} ${formatZ(f.z)}`))
    .join(', ');

  return (
    <div className="chart feature-chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={`Distance from usual for each feature (robust z-score): ${describe}.`}>
        {refs.map((r) => (
          <g key={r}>
            <line
              className={Math.abs(r) === flagAbsZ ? 'ref-line ref-flag' : 'ref-line'}
              x1={x(r)}
              x2={x(r)}
              y1={M.top - 6}
              y2={M.top + features.length * ROW}
            />
            {r > 0 || labelBothSides ? (
              <text className="ref-label" x={x(r)} y={M.top - 10} textAnchor="middle">
                {r > 0 ? r : `−${-r}`}
              </text>
            ) : null}
          </g>
        ))}
        <line className="axis-line" x1={x(0)} x2={x(0)} y1={M.top - 6} y2={M.top + features.length * ROW} />

        {features.map((f, i) => {
          const cy = M.top + i * ROW + ROW / 2;
          const y0 = cy - BAR / 2;
          const y1 = cy + BAR / 2;
          return (
            <g key={f.id} className={`feature-row role-${f.role}`}>
              <text className="feature-label" x={labelW - 12} y={cy} dy="0.32em" textAnchor="end">
                {f.name}
              </text>
              {f.z === null ? (
                <text className="no-data" x={x(0) + 8} y={cy} dy="0.32em">
                  no comparison data
                </text>
              ) : (
                <>
                  {Math.abs(f.z) > 0.02 ? (
                    <path className="feature-bar" d={barPath(x(0), x(f.z), y0, y1, 4, f.z >= 0 ? 'right' : 'left')} />
                  ) : (
                    <line className="feature-zero" x1={x(0)} x2={x(0)} y1={y0 - 2} y2={y1 + 2} />
                  )}
                  {Math.abs(f.z) > limit ? (
                    <path
                      className="overflow-arrow"
                      d={f.z > 0 ? `M${x(limit) + 2},${y0}l7,${BAR / 2}l-7,${BAR / 2}Z` : `M${x(-limit) - 2},${y0}l-7,${BAR / 2}l7,${BAR / 2}Z`}
                    />
                  ) : null}
                  <text className="z-label" x={width - 6} y={cy} dy="0.32em" textAnchor="end">
                    {formatZ(f.z)}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {ticks.map((t) => (
          <text key={t} className="tick-label" x={x(t)} y={M.top + features.length * ROW + 16} textAnchor="middle">
            {t > 0 ? `+${t}` : t < 0 ? `−${-t}` : '0'}
          </text>
        ))}
        <text className="axis-title" x={labelW} y={height - 4}>
          ← below usual
        </text>
        <text className="axis-title" x={labelW + plotW} y={height - 4} textAnchor="end">
          above usual →
        </text>
        <text className="axis-title" x={width - 6} y={M.top - 10} textAnchor="end">
          z
        </text>
      </svg>
    </div>
  );
}
