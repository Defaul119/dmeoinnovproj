import { api } from '../api/client';
import type { TimelineResponse } from '../api/types';
import { TimelineChart } from '../charts/TimelineChart';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CopyButton } from '../components/CopyButton';
import { ErrorState } from '../components/ErrorState';
import { Icon } from '../components/Icon';
import { PageHeading, useDocumentTitle } from '../components/PageHeading';
import { Loading, StatePanel } from '../components/StatePanel';
import { KIND_LABEL, validateAddress } from '../lib/address';
import { dayCount, formatDay, formatDayRange } from '../lib/dates';
import { formatCount, plural, shortAddress } from '../lib/format';
import { navigate, paths } from '../lib/router';
import { useRequest } from '../hooks/useRequest';

// Screen 2 — the address's daily timeline (FR-02, AC-01): date range, source and snapshot,
// counts per day with flagged days marked, and a keyboard path to every flagged day.

export function TimelineScreen({ address }: { address: string }) {
  useDocumentTitle(`Activity for ${shortAddress(address)}`);
  const timeline = useRequest(`timeline:${address}`, () => api.timeline(address));

  return (
    <div className="page page-timeline">
      <Breadcrumbs items={[{ label: 'Addresses', href: paths.select() }, { label: shortAddress(address), mono: true }]} />
      {timeline.status === 'loading' ? (
        <>
          <PageHeading className="sr-only">Activity for {address}</PageHeading>
          <Loading label="Loading this address's activity…" block />
        </>
      ) : null}
      {timeline.status === 'error' ? (
        <>
          <PageHeading>Address activity</PageHeading>
          <ErrorState error={timeline.error} onRetry={timeline.retry} />
        </>
      ) : null}
      {timeline.status === 'success' ? <Timeline data={timeline.data} /> : null}
    </div>
  );
}

function Timeline({ data }: { data: TimelineResponse }) {
  const kind = validateAddress(data.address);
  const flaggedDays = data.days.filter((d) => d.flaggedCount > 0);
  const insufficient = data.history.status === 'insufficient';
  const spanDays = dayCount(data.range.start, data.range.end);
  const open = (date: string) => navigate(paths.day(data.address, date));

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Address{kind.ok ? ` · ${KIND_LABEL[kind.kind]}` : ''}</p>
        <div className="address-heading">
          <PageHeading className="address-title mono">{data.address}</PageHeading>
          <CopyButton value={data.address} label="address" />
        </div>
        <p className="source-line">
          Source: {data.snapshot.source} · snapshot of {formatDay(data.snapshot.snapshotDate)} · days in UTC
          {data.snapshot.illustrative ? ' · illustrative data' : ''}
        </p>
      </header>

      <dl className="stat-row">
        <div className="stat">
          <dt>Transactions</dt>
          <dd>{formatCount(data.totals.txCount)}</dd>
        </div>
        <div className="stat">
          <dt>Active</dt>
          <dd>
            {formatDayRange(data.range.start, data.range.end)}
            <span className="stat-sub">{plural(spanDays, 'calendar day')}</span>
          </dd>
        </div>
        <div className="stat">
          <dt>Unusual</dt>
          <dd>
            {insufficient ? (
              'Not scored'
            ) : (
              <>
                {formatCount(data.totals.flaggedCount)}
                <span className="stat-sub">on {plural(data.totals.flaggedDays, 'day')}</span>
              </>
            )}
          </dd>
        </div>
        <div className="stat">
          <dt>Scored</dt>
          <dd>
            {formatCount(data.totals.scoredCount)} of {formatCount(data.totals.txCount)}
            <span className="stat-sub">enough earlier history</span>
          </dd>
        </div>
      </dl>

      {insufficient ? (
        <StatePanel
          tone="warning"
          title="Not enough history to score this address"
          testId="state-insufficient"
          actions={
            <>
              <a className="btn btn-secondary" href={paths.day(data.address, data.days[0].date)}>
                Browse its transactions anyway
              </a>
              <a className="btn btn-ghost" href={paths.select()}>
                Choose an address with more history
              </a>
            </>
          }
        >
          <p>
            A transaction is only scored once the address has at least {data.history.required.minTx} earlier transactions
            over at least {data.history.required.minSpanDays} days. This address has{' '}
            {plural(data.history.txCount, 'transaction')} over {plural(data.history.spanDays, 'day')}, so there is nothing
            reliable to compare against yet. Its transactions are listed but none is marked unusual.
          </p>
        </StatePanel>
      ) : null}

      <div className="timeline-layout">
        <section className="card chart-card" aria-labelledby="chart-title">
          <div className="chart-head">
            <div>
              <h2 id="chart-title">Transactions per day</h2>
              <p className="chart-sub">
                {formatDayRange(data.range.start, data.range.end)} · UTC · snapshot of {formatDay(data.snapshot.snapshotDate)}
              </p>
            </div>
            <ul className="legend" aria-label="Legend">
              <li>
                <span className="swatch swatch-normal" /> No unusual transactions
              </li>
              <li>
                <span className="swatch swatch-flag" />
                <Icon name="flag" className="flag-icon" /> At least one unusual
              </li>
            </ul>
          </div>
          <TimelineChart days={data.days} range={data.range} onOpenDay={open} />
          <p className="chart-hint">Select a bar to open that day. With a keyboard, focus the chart and use the arrow keys.</p>
          <details className="table-view">
            <summary>Show as a table ({plural(data.days.length, 'day')} with activity)</summary>
            <div className="table-scroll">
              <table className="data-table">
                <caption className="sr-only">Transactions per day</caption>
                <thead>
                  <tr>
                    <th scope="col">Date (UTC)</th>
                    <th scope="col" className="num">
                      Transactions
                    </th>
                    <th scope="col" className="num">
                      Unusual
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((d) => (
                    <tr key={d.date}>
                      <th scope="row">
                        <a href={paths.day(data.address, d.date)}>{formatDay(d.date)}</a>
                      </th>
                      <td className="num">{d.txCount}</td>
                      <td className="num">{d.flaggedCount || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section className="card flagged-card" aria-labelledby="flagged-title">
          <h2 id="flagged-title">Days with unusual transactions</h2>
          {flaggedDays.length > 0 ? (
            <>
              <p className="card-sub">
                {plural(flaggedDays.length, 'day')}, newest first. Open one to see which transactions stand out and why.
              </p>
              <ul className="day-list">
                {[...flaggedDays].reverse().map((d) => (
                  <li key={d.date}>
                    <a className="day-link" href={paths.day(data.address, d.date)}>
                      <Icon name="flag" className="flag-icon" />
                      <span className="day-link-date">{formatDay(d.date)}</span>
                      <span className="day-link-count">
                        {d.flaggedCount} of {plural(d.txCount, 'transaction')}
                      </span>
                      <Icon name="chevron-right" className="day-link-arrow" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="card-sub">
              {insufficient
                ? 'None: this address has too little history to score.'
                : 'None: no transaction on this address reached the flag level.'}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
