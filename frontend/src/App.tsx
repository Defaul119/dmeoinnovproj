import { useEffect } from 'react';
import { API_MODE, api } from './api/client';
import { Icon } from './components/Icon';
import { PageHeading } from './components/PageHeading';
import { PrototypeTools } from './components/PrototypeTools';
import { StatePanel } from './components/StatePanel';
import { useRequest } from './hooks/useRequest';
import { formatDay } from './lib/dates';
import { LIMITATION_LINE } from './lib/settings';
import { paths, useRoute } from './lib/router';
import { DayScreen } from './screens/DayScreen';
import { SelectScreen } from './screens/SelectScreen';
import { TimelineScreen } from './screens/TimelineScreen';

export function App() {
  const route = useRoute();
  const list = useRequest('addresses', () => api.listAddresses());
  const snapshot = list.status === 'success' ? list.data.snapshot : null;
  const illustrative = API_MODE === 'mock' || snapshot?.illustrative;

  // A new screen starts at the top. Selecting a transaction within a day is not a new screen.
  const screenKey =
    route.screen === 'day' ? `day|${route.address}|${route.date}` : route.screen === 'timeline' ? `tl|${route.address}` : route.screen;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screenKey]);

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => {
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}>
        Skip to content
      </a>
      <header className="app-header">
        <div className="container header-inner">
          <a className="brand" href={paths.select()}>
            <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="7" />
              <rect x="6" y="16" width="4" height="10" rx="1" className="brand-bar" />
              <rect x="14" y="10" width="4" height="16" rx="1" className="brand-bar" />
              <rect x="22" y="6" width="4" height="20" rx="1" className="brand-bar brand-bar-flag" />
            </svg>
            <span>Bitcoin Address Activity Explorer</span>
          </a>
          {snapshot ? (
            <p className="header-meta">
              Snapshot of {formatDay(snapshot.snapshotDate)} · {snapshot.source} · days in UTC
            </p>
          ) : null}
        </div>
      </header>
      {illustrative ? (
        <div className="proto-banner" role="note">
          <div className="container">
            <strong>Prototype with illustrative data.</strong> Every address, transaction and value shown here is
            invented to demonstrate the design.
          </div>
        </div>
      ) : null}

      <main id="main" tabIndex={-1} className="container">
        {route.screen === 'select' ? <SelectScreen query={route.query} /> : null}
        {route.screen === 'timeline' ? <TimelineScreen key={route.address} address={route.address} /> : null}
        {route.screen === 'day' ? (
          <DayScreen key={`${route.address}|${route.date}`} address={route.address} date={route.date} txid={route.txid} />
        ) : null}
        {route.screen === 'not-found' ? (
          <div className="page">
            <PageHeading>Page not found</PageHeading>
            <StatePanel
              tone="info"
              title="There's nothing at this link"
              actions={
                <a className="btn btn-secondary" href={paths.select()}>
                  Go to the address list
                </a>
              }
            >
              <p>The link may be incomplete. Start again from the list of addresses.</p>
            </StatePanel>
          </div>
        ) : null}
      </main>

      <footer className="app-footer">
        <div className="container footer-inner">
          <p className="footer-limitation">
            <Icon name="info" /> {LIMITATION_LINE}
          </p>
          <p>
            Unusual means different from the same address's own earlier activity. Days and times are in UTC. COS30049
            Computing Technology Innovation Project, group HCMC_COS30049.1_4.
          </p>
        </div>
      </footer>
      {API_MODE === 'mock' ? <PrototypeTools /> : null}
    </>
  );
}
