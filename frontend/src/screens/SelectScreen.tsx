import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { AddressSummary } from '../api/types';
import { Icon } from '../components/Icon';
import { PageHeading, useDocumentTitle } from '../components/PageHeading';
import { Loading, StatePanel } from '../components/StatePanel';
import { KIND_LABEL, validateAddress } from '../lib/address';
import { dayKey, formatDay, formatDayRange } from '../lib/dates';
import { formatCount, plural, shortAddress } from '../lib/format';
import { navigate, paths } from '../lib/router';
import { runRequest, useRequest } from '../hooks/useRequest';

// Screen 1 — choose an address: a lookup box plus the list of addresses in the snapshot.
// The lookup validates in the browser first (invalid never reaches the API), then asks the
// API whether the address is in the snapshot (supported / unsupported).

type Lookup =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'invalid'; message: string; hint: string }
  | { status: 'unsupported'; message: string; examples: string[] }
  | { status: 'network'; message: string };

export function SelectScreen({ query }: { query: string | null }) {
  useDocumentTitle('');
  const list = useRequest('addresses', () => api.listAddresses());
  const [value, setValue] = useState(query ?? '');
  const [lookup, setLookup] = useState<Lookup>({ status: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  async function check(text: string) {
    const local = validateAddress(text);
    if (!local.ok) {
      setLookup({ status: 'invalid', message: local.message, hint: local.hint });
      inputRef.current?.focus();
      return;
    }
    setLookup({ status: 'checking' });
    const res = await runRequest(() => api.lookup(local.address));
    if (res.ok) {
      navigate(paths.timeline(res.data.address));
      return;
    }
    const body = res.error.body;
    if (body.status === 'invalid') setLookup({ status: 'invalid', message: body.message, hint: body.hint });
    else if (body.status === 'unsupported') setLookup({ status: 'unsupported', message: body.message, examples: body.examples });
    else setLookup({ status: 'network', message: body.message });
  }

  useEffect(() => {
    // Run once for a ?q= link (used by screenshots and the walkthrough); later submits go through the form.
    if (query) void check(query);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void check(value);
  }

  function reset() {
    setValue('');
    setLookup({ status: 'idle' });
    inputRef.current?.focus();
  }

  const invalid = lookup.status === 'invalid';
  const snapshot = list.status === 'success' ? list.data.snapshot : null;

  return (
    <div className="page page-select">
      <section className="intro">
        <PageHeading>Explore a Bitcoin address's activity</PageHeading>
        <p className="lede">
          Pick an address to see its transactions day by day. Open any day to check which transactions are unusual
          compared with that address's own history, and why.
        </p>
      </section>

      <section className="card lookup-card" aria-labelledby="lookup-title">
        <h2 id="lookup-title">Look up an address</h2>
        <form onSubmit={onSubmit} noValidate className="lookup-form">
          <label htmlFor="address-input" className="field-label">
            Bitcoin address
          </label>
          <p id="address-help" className="field-help">
            Addresses start with 1, 3 or bc1. Only addresses in the snapshot have results.
          </p>
          <div className="input-row">
            <input
              id="address-input"
              ref={inputRef}
              className="text-input mono"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (lookup.status !== 'checking') setLookup({ status: 'idle' });
              }}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="e.g. bc1q…"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? 'address-help address-error' : 'address-help'}
            />
            <button type="submit" className="btn btn-primary" disabled={lookup.status === 'checking'}>
              {lookup.status === 'checking' ? (
                <>
                  <span className="spinner spinner-inline" aria-hidden="true" /> Checking…
                </>
              ) : (
                <>
                  <Icon name="search" /> Look up
                </>
              )}
            </button>
          </div>
          {invalid ? (
            <p id="address-error" className="field-error" role="alert">
              <Icon name="error" />
              <span>
                <strong>{lookup.message}</strong> {lookup.hint}
              </span>
            </p>
          ) : null}
          {lookup.status === 'checking' ? (
            <p className="sr-only" role="status">
              Checking whether this address is in the snapshot…
            </p>
          ) : null}
        </form>

        {lookup.status === 'unsupported' ? (
          <StatePanel
            tone="info"
            title="This address isn't in the snapshot"
            headingLevel={3}
            live="alert"
            testId="state-unsupported"
            actions={
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Clear and try another address
              </button>
            }
          >
            <p>{lookup.message}</p>
            <p>The explorer only covers a fixed set of addresses chosen before any analysis. Try one of these instead:</p>
            <ul className="example-list">
              {lookup.examples.map((a) => (
                <li key={a}>
                  <a className="mono" href={paths.timeline(a)}>
                    {shortAddress(a, 12, 8)}
                  </a>
                </li>
              ))}
            </ul>
          </StatePanel>
        ) : null}
        {lookup.status === 'network' ? (
          <StatePanel
            tone="error"
            icon="offline"
            title="Couldn't reach the explorer service"
            headingLevel={3}
            live="alert"
            actions={
              <button type="button" className="btn btn-secondary" onClick={() => void check(value)}>
                Try again
              </button>
            }
          >
            <p>{lookup.message} Check your connection, then try again.</p>
          </StatePanel>
        ) : null}
      </section>

      <section className="snapshot-section" aria-labelledby="snapshot-title">
        <div className="section-head">
          <h2 id="snapshot-title">Addresses in the snapshot</h2>
          {snapshot ? (
            <p className="section-meta">
              {plural(snapshot.addressCount, 'address', 'addresses')} · snapshot of {formatDay(snapshot.snapshotDate)} ·{' '}
              {snapshot.source}
            </p>
          ) : null}
        </div>
        {list.status === 'loading' ? <Loading label="Loading the address list…" block /> : null}
        {list.status === 'error' ? (
          <StatePanel
            tone="error"
            icon="offline"
            title="Couldn't load the address list"
            live="alert"
            actions={
              <button type="button" className="btn btn-secondary" onClick={list.retry}>
                Try again
              </button>
            }
          >
            <p>{list.error.message} Check your connection, then try again.</p>
          </StatePanel>
        ) : null}
        {list.status === 'success' && list.data.addresses.length === 0 ? (
          <StatePanel tone="empty" title="The snapshot has no addresses yet">
            <p>Build the snapshot first (see the README), then reload this page.</p>
          </StatePanel>
        ) : null}
        {list.status === 'success' && list.data.addresses.length > 0 ? <AddressTable addresses={list.data.addresses} /> : null}
      </section>
    </div>
  );
}

function AddressTable({ addresses }: { addresses: AddressSummary[] }) {
  return (
    <div className="card table-card">
      <table className="address-table">
        <caption className="sr-only">Addresses in the snapshot, with their activity and how many transactions are unusual</caption>
        <thead>
          <tr>
            <th scope="col">Address</th>
            <th scope="col">Active (UTC)</th>
            <th scope="col" className="num">
              Transactions
            </th>
            <th scope="col" className="num">
              Unusual
            </th>
          </tr>
        </thead>
        <tbody>
          {addresses.map((a) => {
            const check = validateAddress(a.address);
            const pct = a.scoredCount ? Math.round((a.flaggedCount / a.scoredCount) * 100) : 0;
            return (
              <tr key={a.address}>
                <th scope="row" data-label="Address">
                  <a className="address-link mono" href={paths.timeline(a.address)} aria-label={`Open activity for ${a.address}`}>
                    {shortAddress(a.address, 12, 8)}
                  </a>
                  {check.ok ? <span className="cell-sub">{KIND_LABEL[check.kind]}</span> : null}
                </th>
                <td data-label="Active (UTC)">{formatDayRange(dayKey(a.firstSeen), dayKey(a.lastSeen))}</td>
                <td data-label="Transactions" className="num">
                  {formatCount(a.txCount)}
                </td>
                <td data-label="Unusual" className="num">
                  {a.history === 'insufficient' ? (
                    <span className="badge badge-not-scored">Short history, not scored</span>
                  ) : a.flaggedCount > 0 ? (
                    <span className="unusual-count">
                      <Icon name="flag" className="flag-icon" /> {formatCount(a.flaggedCount)}{' '}
                      <span className="muted">({pct}% of scored)</span>
                    </span>
                  ) : (
                    <span className="muted">None</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
