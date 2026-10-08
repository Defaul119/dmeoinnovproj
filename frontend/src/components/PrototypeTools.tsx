import { useState } from 'react';
import { illustrativeProfiles, mockControls, prototypeExamples } from '../api/mock/mockApi';
import { clearRequestCache } from '../hooks/useRequest';
import { shortAddress } from '../lib/format';
import { paths } from '../lib/router';

// A team-only panel, shown only while the app runs on illustrative data. It lets whoever runs
// a walkthrough or takes report screenshots trigger each state on demand. Not part of the product.

const DELAYS = [
  { ms: 0, label: 'None' },
  { ms: 600, label: '0.6 s (default)' },
  { ms: 2500, label: '2.5 s' },
  { ms: 8000, label: '8 s' },
];

export function PrototypeTools() {
  const [latency, setLatency] = useState(mockControls.latencyMs);
  const [offline, setOffline] = useState(mockControls.offline);
  const ex = prototypeExamples();

  return (
    <details className="proto-tools">
      <summary>Prototype tools</summary>
      <div className="proto-tools-body">
        <p className="proto-note">For the team: trigger states for walkthroughs and screenshots. Participants don't need this.</p>
        <label className="proto-field">
          Response delay
          <select
            value={latency}
            onChange={(e) => {
              mockControls.latencyMs = Number(e.target.value);
              setLatency(mockControls.latencyMs);
            }}
          >
            {DELAYS.map((d) => (
              <option key={d.ms} value={d.ms}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="proto-check">
          <input
            type="checkbox"
            checked={offline}
            onChange={(e) => {
              mockControls.offline = e.target.checked;
              clearRequestCache();
              setOffline(e.target.checked);
            }}
          />
          Simulate network failure
        </label>
        <p className="proto-heading">Open a state</p>
        <ul className="proto-links">
          <li>
            <a href={`#/?q=${encodeURIComponent(ex.typo)}`}>Invalid: a typo in an address</a>
          </li>
          <li>
            <a href={`#/?q=${encodeURIComponent(ex.unsupported)}`}>Unsupported: valid but not in the snapshot</a>
          </li>
          <li>
            <a href={paths.timeline(ex.shortHistory)}>Insufficient history</a>
          </li>
          <li>
            <a href={paths.tx(ex.flagged.address, ex.flagged.date, ex.flagged.txid)}>A flagged transaction</a>
          </li>
        </ul>
        <p className="proto-heading">What each illustrative address shows</p>
        <ul className="proto-profiles">
          {illustrativeProfiles().map((p) => (
            <li key={p.address}>
              <a className="mono" href={paths.timeline(p.address)}>
                {shortAddress(p.address)}
              </a>{' '}
              {p.profile}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
