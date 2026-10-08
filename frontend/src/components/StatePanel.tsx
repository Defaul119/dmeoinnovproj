import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

// One component for every feedback state (FR-05): it always says what happened and offers
// a next action. Tone sets the colour; the icon and title carry the meaning without colour.

export type Tone = 'info' | 'warning' | 'error' | 'empty';

const DEFAULT_ICON: Record<Tone, IconName> = {
  info: 'info',
  warning: 'history',
  error: 'error',
  empty: 'empty',
};

interface Props {
  tone: Tone;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  icon?: IconName;
  /** 'alert' for results of something the user just did; 'status' for passive states. */
  live?: 'alert' | 'status';
  headingLevel?: 2 | 3;
  testId?: string;
}

export function StatePanel({ tone, title, children, actions, icon, live, headingLevel = 2, testId }: Props) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className={`state-panel tone-${tone}`} role={live} data-testid={testId}>
      <Icon name={icon ?? DEFAULT_ICON[tone]} className="state-icon" />
      <div className="state-body">
        <Heading className="state-title">{title}</Heading>
        {children}
        {actions ? <div className="state-actions">{actions}</div> : null}
      </div>
    </section>
  );
}

export function Loading({ label, block = false }: { label: string; block?: boolean }) {
  return (
    <div className={block ? 'loading loading-block' : 'loading'} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
