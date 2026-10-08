export interface Crumb {
  label: string;
  href?: string;
  mono?: boolean;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i}>
              {c.href && !last ? (
                <a href={c.href} className={c.mono ? 'mono' : undefined}>
                  {c.label}
                </a>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={c.mono ? 'mono' : undefined}>
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
