import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); the value stays selectable.
    }
  }

  return (
    <button type="button" className="icon-button" onClick={copy} aria-label={copied ? `${label} copied` : `Copy ${label}`}>
      <Icon name={copied ? 'check' : 'copy'} />
      <span className="icon-button-text" aria-live="polite">
        {copied ? 'Copied' : 'Copy'}
      </span>
    </button>
  );
}
