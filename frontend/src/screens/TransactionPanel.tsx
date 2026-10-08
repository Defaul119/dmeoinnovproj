import { useEffect, useRef, type RefObject } from 'react';
import { api } from '../api/client';
import type { InsufficientHistoryBody, TransactionCore, TransactionDetail } from '../api/types';
import { FeatureChart } from '../charts/FeatureChart';
import { DirectionBadge, StatusBadge } from '../components/Badges';
import { CopyButton } from '../components/CopyButton';
import { ErrorState } from '../components/ErrorState';
import { Icon } from '../components/Icon';
import { Loading, StatePanel } from '../components/StatePanel';
import { dayKey, formatDateTime, formatDay, formatDayRange } from '../lib/dates';
import { describeValue, formatZ, LEVEL_TEXT, reasonsFor } from '../lib/explain';
import { formatBtc, plural } from '../lib/format';
import { paths } from '../lib/router';
import { useRequest } from '../hooks/useRequest';

// The detail panel of Screen 3 (FR-03, FR-04, AC-03). For a flagged transaction it shows which
// features made it unusual, what they were compared against, and the fixed limitation line.

export function TransactionPanel({ address, date, txid }: { address: string; date: string; txid: string | null }) {
  const detail = useRequest(txid ? `tx:${address}:${txid}` : null, () => api.transaction(txid!, address));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const settled = detail.status === 'success' || detail.status === 'error';

  useEffect(() => {
    if (!txid || !settled) return;
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [txid, settled]);

  if (detail.status === 'idle') {
    return (
      <StatePanel tone="empty" title="Select a transaction" testId="state-empty-detail">
        <p>
          Choose a transaction from the list to see its amount, direction and source. Unusual ones are marked{' '}
          <StatusBadge status="flagged" />, and their details explain why.
        </p>
      </StatePanel>
    );
  }
  if (detail.status === 'loading') return <Loading label="Loading the transaction…" block />;

  if (detail.status === 'error') {
    if (detail.error.body.status === 'insufficient_history') {
      return <NotScored body={detail.error.body} address={address} headingRef={headingRef} />;
    }
    return (
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">
          Transaction
        </h2>
        <ErrorState error={detail.error} onRetry={detail.retry} headingLevel={3} />
        <p>
          <a href={paths.day(address, date)}>Back to {formatDay(date)}</a>
        </p>
      </div>
    );
  }
  return <Detail tx={detail.data} headingRef={headingRef} />;
}

type HeadingRef = RefObject<HTMLHeadingElement | null>;

function Facts({ tx }: { tx: TransactionCore }) {
  return (
    <dl className="facts">
      <div className="fact fact-wide">
        <dt>Transaction ID</dt>
        <dd className="txid-row">
          <span className="mono txid">{tx.txid}</span>
          <CopyButton value={tx.txid} label="transaction ID" />
        </dd>
      </div>
      <div className="fact">
        <dt>Confirmed</dt>
        <dd>
          {formatDateTime(tx.time)}
          <span className="fact-sub">Block {tx.blockHeight.toLocaleString('en-US')}</span>
        </dd>
      </div>
      <div className="fact">
        <dt>Amount for this address</dt>
        <dd>
          <span className="mono amount">{formatBtc(tx.netSats, { signed: true })}</span>
          <DirectionBadge direction={tx.direction} />
        </dd>
      </div>
      <div className="fact">
        <dt>How the amount is made up</dt>
        <dd className="flow">
          <span className="flow-label">Received</span>
          <span className="mono">{formatBtc(tx.receivedSats)}</span>
          <span className="flow-label">Sent</span>
          <span className="mono">{formatBtc(tx.sentSats)}</span>
        </dd>
      </div>
      <div className="fact">
        <dt>Source</dt>
        <dd>
          {tx.sourceUrl ? (
            <a href={tx.sourceUrl} target="_blank" rel="noopener noreferrer">
              View on blockstream.info <Icon name="external" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span className="muted">No public record: this is an illustrative transaction</span>
          )}
        </dd>
      </div>
    </dl>
  );
}

function Detail({ tx, headingRef }: { tx: TransactionDetail; headingRef: HeadingRef }) {
  const { reasons, fallback } = reasonsFor(tx.features);
  return (
    <article className="detail" aria-labelledby="detail-title">
      <header className="detail-head">
        <h2 id="detail-title" ref={headingRef} tabIndex={-1}>
          Transaction details
        </h2>
        <StatusBadge status={tx.flagged ? 'flagged' : 'not-flagged'} />
      </header>
      <Facts tx={tx} />

      {tx.flagged ? (
        <section className="flag-callout" aria-labelledby="why-title" data-testid="flag-explanation">
          <h3 id="why-title">
            <Icon name="flag" className="flag-icon" /> Why this transaction stands out
          </h3>
          {fallback ? <p>No single feature reached the contributing level; these are the largest differences.</p> : null}
          <ul className="reasons">
            {reasons.map((r) => (
              <li key={r.id}>
                <strong>{r.headline}.</strong> {r.detail}{' '}
                <span className="reason-z">
                  z {formatZ(r.z)}, {LEVEL_TEXT[r.level]}
                </span>
              </li>
            ))}
          </ul>
          <h4>Compared with</h4>
          <ul className="bases">
            {tx.comparison.map((b) => (
              <li key={b.label}>
                <strong>{b.label}:</strong> {b.description}{' '}
                <span className="muted">({formatDayRange(dayKey(b.start), dayKey(b.end))})</span>
              </li>
            ))}
          </ul>
          <p className="limitation" data-testid="limitation-line">
            <Icon name="info" />
            <span>{tx.limitation}</span>
          </p>
        </section>
      ) : (
        <p className="not-flagged-note">
          <strong>Not unusual.</strong> No feature was {tx.method.flagAbsZ} or more from this address's usual pattern.
        </p>
      )}

      <section className="features-section" aria-labelledby="features-title">
        <h3 id="features-title">How this transaction compares with usual</h3>
        <p className="card-sub">
          Distance from the address's usual value, as a robust z-score. Dashed lines: {tx.method.contributingAbsZ} is
          contributing, {tx.method.flagAbsZ} is the flag level.
        </p>
        <FeatureChart features={tx.features} flagAbsZ={tx.method.flagAbsZ} contributingAbsZ={tx.method.contributingAbsZ} />
        <div className="table-wrap">
          <table className="data-table feature-table">
            <caption className="sr-only">Feature values compared with the address's usual values</caption>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">This transaction</th>
                <th scope="col">Usual</th>
                <th scope="col" className="num">
                  z
                </th>
              </tr>
            </thead>
            <tbody>
              {tx.features.map((f) => (
                <tr key={f.id} className={`role-${f.role}`}>
                  <th scope="row">
                    {f.name}
                    <span className="cell-sub">{f.description}</span>
                  </th>
                  <td>{describeValue(f, 'value')}</td>
                  <td>{describeValue(f, 'usual')}</td>
                  <td className="num">
                    {f.z === null ? '—' : formatZ(f.z)}
                    {f.role === 'flag' ? <span className="role-tag role-tag-flag">flag level</span> : null}
                    {f.role === 'contributing' ? <span className="role-tag">contributing</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="method-note">
        <strong>Method:</strong> {tx.method.name}. {tx.method.note}
      </p>
    </article>
  );
}

function NotScored({ body, address, headingRef }: { body: InsufficientHistoryBody; address: string; headingRef: HeadingRef }) {
  const h = body.history;
  return (
    <article className="detail" aria-labelledby="detail-title">
      <header className="detail-head">
        <h2 id="detail-title" ref={headingRef} tabIndex={-1}>
          Transaction details
        </h2>
        <StatusBadge status="not-scored" />
      </header>
      <Facts tx={body.transaction} />
      <StatePanel
        tone="warning"
        title="Not enough history to score this transaction"
        headingLevel={3}
        testId="state-insufficient"
        actions={
          <>
            {body.firstScoredDate ? (
              <a className="btn btn-secondary" href={paths.day(address, body.firstScoredDate)}>
                Go to the first scored day ({formatDay(body.firstScoredDate)})
              </a>
            ) : (
              <a className="btn btn-secondary" href={paths.select()}>
                Choose an address with more history
              </a>
            )}
            <a className="btn btn-ghost" href={paths.timeline(address)}>
              Back to the timeline
            </a>
          </>
        }
      >
        <p>
          Before this transaction, the address had {plural(h.earlierTx, 'confirmed transaction')} over{' '}
          {plural(h.spanDays, 'day')}. Scoring needs at least {h.required.minTx} earlier transactions over at least{' '}
          {h.required.minSpanDays} days, so there is nothing reliable to compare it with.
        </p>
      </StatePanel>
    </article>
  );
}
