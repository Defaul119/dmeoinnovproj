// End-to-end journeys through the real UI (with the mock API). The first four tests are the
// four usability-walkthrough tasks from report §10; the rest cover every FR-05 state.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import { mockApi, mockControls, prototypeExamples } from '../src/api/mock/mockApi';
import { LIMITATION_LINE, settings } from '../src/lib/settings';

const ex = prototypeExamples();
const banned = new RegExp(`\\b(${settings.bannedWords.join('|')})`, 'i');

function start(hash = '#/') {
  window.location.hash = hash;
  const user = userEvent.setup();
  render(<App />);
  return user;
}

afterEach(() => {
  // NFR-01 pass condition 3, on whatever each test left on screen.
  expect(document.body.textContent ?? '').not.toMatch(banned);
  vi.restoreAllMocks();
});

describe('usability walkthrough tasks', () => {
  test('1. open a sample address: timeline with date range and source (AC-01)', async () => {
    const user = start();
    await user.click(await screen.findByRole('link', { name: `Open activity for ${ex.mainAddress}` }));
    expect(await screen.findByRole('heading', { level: 1, name: ex.mainAddress })).toBeInTheDocument();
    expect(screen.getByText(/Source: Blockstream Esplora · snapshot of 5 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transactions per day' })).toBeInTheDocument();
    expect(screen.getByText('Active').nextElementSibling).toHaveTextContent(/2026 – .*2026/);
  });

  test('2. find a highlighted date and open it', async () => {
    const user = start(`#/address/${ex.flagged.address}`);
    const heading = await screen.findByRole('heading', { name: 'Days with unusual transactions' });
    const list = heading.closest('section')!;
    const target = within(list).getByRole('link', { name: /14 Aug 2026/ });
    await user.click(target);
    expect(await screen.findByRole('heading', { level: 1, name: '14 Aug 2026' })).toBeInTheDocument();
  });

  test('3. locate the unusual transaction and see why it is flagged (AC-03)', async () => {
    const user = start(`#/address/${ex.flagged.address}/day/${ex.flagged.date}`);
    expect(await screen.findByTestId('state-empty-detail')).toBeInTheDocument();
    const rows = await screen.findAllByRole('link', { name: /Unusual/ });
    await user.click(rows[0]);
    const why = await screen.findByTestId('flag-explanation');
    expect(within(why).getByRole('heading', { name: /Why this transaction stands out/ })).toBeInTheDocument();
    expect(within(why).getAllByRole('listitem').length).toBeGreaterThan(1);
    expect(within(why).getByText('Compared with')).toBeInTheDocument();
    expect(within(why).getByTestId('limitation-line')).toHaveTextContent(LIMITATION_LINE);
    expect(screen.getByRole('img', { name: /Distance from usual for each feature/ })).toBeInTheDocument();
  });

  test('4. recover from an unsupported input', async () => {
    const user = start();
    await user.type(await screen.findByLabelText('Bitcoin address'), ex.unsupported);
    await user.click(screen.getByRole('button', { name: /Look up/ }));
    const panel = await screen.findByTestId('state-unsupported');
    expect(panel).toHaveTextContent("This address isn't in the snapshot");
    const examples = within(panel).getAllByRole('link');
    expect(examples.length).toBeGreaterThanOrEqual(2);
    await user.click(examples[0]);
    expect(await screen.findByRole('heading', { name: 'Transactions per day' })).toBeInTheDocument();
  });
});

describe('FR-05 states', () => {
  test('invalid: a typo is caught in the browser and never sent to the API', async () => {
    const lookup = vi.spyOn(mockApi, 'lookup');
    const user = start();
    const input = await screen.findByLabelText('Bitcoin address');
    await user.type(input, `${ex.typo}{Enter}`);
    expect(await screen.findByRole('alert')).toHaveTextContent(/fails its checksum/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    expect(lookup).not.toHaveBeenCalled();
  });

  test('invalid: an empty submit asks for an address', async () => {
    const user = start();
    await user.click(await screen.findByRole('button', { name: /Look up/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a Bitcoin address.');
  });

  test('a supported address typed in goes straight to its timeline', async () => {
    const user = start();
    await user.type(await screen.findByLabelText('Bitcoin address'), `  ${ex.mainAddress} {Enter}`);
    expect(await screen.findByRole('heading', { level: 1, name: ex.mainAddress })).toBeInTheDocument();
  });

  test('loading: every request shows a loading message first', async () => {
    mockControls.latencyMs = 50;
    start(`#/address/${ex.mainAddress}`);
    expect(screen.getByText("Loading this address's activity…")).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Transactions per day' })).toBeInTheDocument();
  });

  test('empty: nothing selected yet on the day screen', async () => {
    start(`#/address/${ex.flagged.address}/day/${ex.flagged.date}`);
    expect(await screen.findByTestId('state-empty-detail')).toHaveTextContent('Select a transaction');
  });

  test('empty: a day without transactions', async () => {
    start(`#/address/${ex.mainAddress}/day/2020-01-01`);
    expect(await screen.findByText('No transactions on this day')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the timeline' })).toBeInTheDocument();
  });

  test('insufficient history: an address too short to score', async () => {
    start(`#/address/${ex.shortHistory}`);
    const panel = await screen.findByTestId('state-insufficient');
    expect(panel).toHaveTextContent('Not enough history to score this address');
    expect(within(panel).getByRole('link', { name: 'Browse its transactions anyway' })).toBeInTheDocument();
  });

  test('insufficient history: a transaction keeps its facts and explains why it is not scored (422)', async () => {
    start(`#/address/${ex.notScored.address}/day/${ex.notScored.date}/tx/${ex.notScored.txid}`);
    const panel = await screen.findByTestId('state-insufficient');
    expect(panel).toHaveTextContent('Not enough history to score this transaction');
    expect(panel).toHaveTextContent(/at least 10 earlier transactions over at least 14 days/);
    expect(screen.getByText(ex.notScored.txid)).toBeInTheDocument();
  });

  test('unsupported: a link to an address outside the snapshot', async () => {
    start(`#/address/${ex.unsupported}`);
    expect(await screen.findByTestId('state-unsupported')).toBeInTheDocument();
  });

  test('network failure: a clear message and a working retry', async () => {
    mockControls.offline = true;
    const user = start(`#/address/${ex.mainAddress}`);
    expect(await screen.findByText("Couldn't reach the explorer service")).toBeInTheDocument();
    mockControls.offline = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Transactions per day' })).toBeInTheDocument();
  });

  test('unknown page', async () => {
    start('#/somewhere/else');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('keyboard and labelling', () => {
  test('the timeline chart can be used from the keyboard', async () => {
    const user = start(`#/address/${ex.mainAddress}`);
    const chart = await screen.findByRole('group', { name: /Bar chart of transactions per day/ });
    act(() => chart.focus());
    await user.keyboard('{Home}{ArrowRight}{Enter}');
    expect(await screen.findByText(/Transactions confirmed on this day/)).toBeInTheDocument();
  });

  test('every flagged-day link is reachable without the chart', async () => {
    start(`#/address/${ex.mainAddress}`);
    const heading = await screen.findByRole('heading', { name: 'Days with unusual transactions' });
    const links = within(heading.closest('section')!).getAllByRole('link');
    const timeline = await mockApi.timeline(ex.mainAddress);
    expect(links).toHaveLength(timeline.totals.flaggedDays);
  });

  test('the illustrative-data label is always visible in the prototype', async () => {
    start();
    expect(await screen.findByRole('note')).toHaveTextContent('Prototype with illustrative data');
  });
});
