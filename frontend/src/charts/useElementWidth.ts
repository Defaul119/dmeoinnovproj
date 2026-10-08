import { useEffect, useRef, useState } from 'react';

/** Width of an element, kept up to date as the layout changes. Falls back when there is no layout (tests). */
export function useElementWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width > 0 ? width : fallback] as const;
}

/** Round a maximum up to a clean axis value and return evenly spaced ticks. */
export function niceTicks(max: number, target = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / target;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const stepInt = Math.max(1, Math.round(step));
  const top = Math.ceil(max / stepInt) * stepInt;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += stepInt) ticks.push(v);
  return ticks;
}

/** SVG path for a bar with a 4px rounded data end and a square end at the baseline. */
export function barPath(x0: number, x1: number, y0: number, y1: number, radius: number, end: 'top' | 'right' | 'left'): string {
  if (end === 'top') {
    // vertical bar from baseline y0 (bottom) to y1 (top)
    const r = Math.min(radius, (x1 - x0) / 2, Math.max(0, y0 - y1));
    return `M${x0},${y0}V${y1 + r}Q${x0},${y1} ${x0 + r},${y1}H${x1 - r}Q${x1},${y1} ${x1},${y1 + r}V${y0}Z`;
  }
  // horizontal bar between rows y0 (top) and y1 (bottom); x0 = baseline, x1 = data end
  const r = Math.min(radius, (y1 - y0) / 2, Math.abs(x1 - x0));
  if (end === 'right') {
    return `M${x0},${y0}H${x1 - r}Q${x1},${y0} ${x1},${y0 + r}V${y1 - r}Q${x1},${y1} ${x1 - r},${y1}H${x0}Z`;
  }
  return `M${x0},${y0}H${x1 + r}Q${x1},${y0} ${x1},${y0 + r}V${y1 - r}Q${x1},${y1} ${x1 + r},${y1}H${x0}Z`;
}
