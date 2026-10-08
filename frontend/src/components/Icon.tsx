// Small inline icons. Decorative by default (aria-hidden): every icon sits next to text
// that carries the meaning, so no state is shown by colour or shape alone.

export type IconName =
  | 'flag'
  | 'info'
  | 'error'
  | 'history'
  | 'offline'
  | 'search'
  | 'empty'
  | 'in'
  | 'out'
  | 'external'
  | 'copy'
  | 'check'
  | 'chevron-left'
  | 'chevron-right';

const PATHS: Record<IconName, string> = {
  flag: 'M12 3 22 20H2Z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM10.75 11h2.5v6.5h-2.5Z',
  error: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.25 5h2.5v6.5h-2.5Zm1.25 8.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z',
  history: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3h2v5.4l3.5 2-1 1.8-4.5-2.6Z',
  offline: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 0 1 6.3 12.9L7.1 5.7A8 8 0 0 1 12 4Zm-6.3 3.1 11.2 11.2A8 8 0 0 1 5.7 7.1Z',
  search: 'M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  empty: 'M4 4h6v2H6v4H4Zm10 0h6v6h-2V6h-4ZM4 14h2v4h4v2H4Zm14 0h2v6h-6v-2h4Z',
  in: 'M18.3 4.3 19.7 5.7 9.4 16H16v2H6V8h2v6.6Z',
  out: 'M5.7 19.7 4.3 18.3 14.6 8H8V6h10v10h-2V9.4Z',
  external: 'M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14ZM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  copy: 'M8 3h11a2 2 0 0 1 2 2v11h-2V5H8Zm-3 4h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 2v11h10V9Z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z',
  'chevron-left': 'M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12Z',
  'chevron-right': 'M8.6 6.4 10 5l7 7-7 7-1.4-1.4 5.6-5.6Z',
};

export function Icon({ name, className, title }: { name: IconName; className?: string; title?: string }) {
  return (
    <svg
      className={`icon icon-${name}${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
