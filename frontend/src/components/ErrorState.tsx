import type { ApiError } from '../api/types';
import { paths } from '../lib/router';
import { shortAddress } from '../lib/format';
import { StatePanel } from './StatePanel';

// Maps an API error to its feedback state (FR-05). The 422 insufficient-history case has its
// own panel in the transaction detail, because it still shows the transaction's facts.

export function ErrorState({ error, onRetry, headingLevel = 2 }: { error: ApiError; onRetry: () => void; headingLevel?: 2 | 3 }) {
  const body = error.body;
  switch (body.status) {
    case 'invalid':
      return (
        <StatePanel
          tone="error"
          title="That isn't a valid Bitcoin address"
          headingLevel={headingLevel}
          live="alert"
          actions={<a className="btn btn-secondary" href={paths.select()}>Choose an address</a>}
        >
          <p>
            {body.message} {body.hint}
          </p>
        </StatePanel>
      );
    case 'unsupported':
      return (
        <StatePanel
          tone="info"
          title="This address isn't in the snapshot"
          headingLevel={headingLevel}
          live="alert"
          testId="state-unsupported"
          actions={<a className="btn btn-secondary" href={paths.select()}>See all addresses in the snapshot</a>}
        >
          <p>{body.message}</p>
          {body.examples.length ? (
            <>
              <p>Try one of these instead:</p>
              <ul className="example-list">
                {body.examples.map((a) => (
                  <li key={a}>
                    <a className="mono" href={paths.timeline(a)}>
                      {shortAddress(a, 12, 8)}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </StatePanel>
      );
    case 'not_found':
      return (
        <StatePanel tone="info" title="Not found" headingLevel={headingLevel} live="alert">
          <p>{body.message}</p>
        </StatePanel>
      );
    default:
      return (
        <StatePanel
          tone="error"
          icon="offline"
          title="Couldn't reach the explorer service"
          headingLevel={headingLevel}
          live="alert"
          actions={
            <button type="button" className="btn btn-secondary" onClick={onRetry}>
              Try again
            </button>
          }
        >
          <p>{body.message} Check your connection, then try again.</p>
        </StatePanel>
      );
  }
}
