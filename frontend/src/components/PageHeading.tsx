import { useEffect, useRef, type ReactNode } from 'react';

// After the user moves to another screen, focus goes to the new page's heading, so keyboard
// and screen-reader users start at the top of the new content. Not on first load.

let navigated = false;
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    navigated = true;
  });
}

export function PageHeading({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (navigated) ref.current?.focus();
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className={className}>
      {children}
    </h1>
  );
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Bitcoin Address Activity Explorer` : 'Bitcoin Address Activity Explorer';
  }, [title]);
}
