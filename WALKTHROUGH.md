# Project walkthrough

A guided tour of the Bitcoin Address Activity Explorer: what it is, what is built so far, how each
piece works, and what comes next. Read it top to bottom once; after that, use the headings as a map.

**Last updated:** 7 October 2026 · **Covers:** the A1 prototype and the D1 data-source check
**Sources:** Main Report v20 (the PDF in this folder), `demo-plan.md`, `project-overview-and-plan.md`

---

## 1. The project in one page

**The problem.** Anyone can read a Bitcoin address's full history on a block explorer, but it's a long
flat list. A student researcher studying one address has to scan hundreds of records to find the ones
worth a closer look.

**What we build.** A web app where the researcher:

1. picks an address from a fixed, documented snapshot of real addresses;
2. sees its activity as a daily timeline;
3. opens a day to list its transactions;
4. opens a transaction to see its facts and, if it is unusual, **why**.

**The rule that shapes everything.** The output is an *unusual-activity indicator*, never a verdict about
the person behind the address. "Unusual" means *different from the same address's own earlier
activity*. Every flagged transaction carries the line:

> Unusual activity requires investigation; it does not indicate wrongdoing.

**Three assignments.**

| | Due | What it adds |
|---|---|---|
| A1 | 11 Oct | Plan and clickable prototype (illustrative data) ← **we are here** |
| A2 | 8 Nov | Real data snapshot, features, baseline + a trained model, label-free evaluation |
| A3 | 6 Dec | FastAPI back end + React front end on the real snapshot, demo video |

**Done means** (report §1.1): AC-01 to AC-03 and FR-05 pass on every address in the snapshot.

| ID | In plain words |
|---|---|
| AC-01 | Picking an address shows its timeline, date range and a path to the flagged transactions |
| AC-02 | An address outside the snapshot gets an explanation and examples, never an invented result |
| AC-03 | A flagged transaction shows its contributing features, what they were compared with, and the limitation line |
| FR-05 | Invalid, unsupported, loading, empty and insufficient-history states are clear and offer a next step |

---

## 2. Where things stand

| Piece | Status | Where |
|---|---|---|
| D1 data-source check | **Automated part passed** on a real address. Hand check and team sign-off still to do | `scripts/d1_check.py`, `reports/d1-check.md` |
| A1 prototype: 3 screens, 5 states, 2 charts | **Built**, runs on illustrative data | `frontend/` |
| Scoring method (features + baseline) | **Built** in TypeScript for the prototype; Python version comes in A2 | `frontend/src/api/mock/scoring.ts` |
| Tests | **75 passing** (66 front end, 9 Python) | `frontend/tests/`, `tests/` |
| Screenshots for report §10 | **Generated**, desktop / tablet / mobile / dark | `docs/screenshots/` |
| Usability walkthrough with 2+ people | **Kit ready**; sessions need real people | `docs/usability-walkthrough.md` |
| Real snapshot, Python features, model, API | Next (A2 / A3) | §9 below |

### Things only a person can do (before 11 Oct)

1. **D1 hand check.** Open transaction 1 in `reports/d1-check.md` on blockstream.info and confirm the received and sent values. Write your name and the date in the worksheet.
2. **Usability sessions.** Run `docs/usability-walkthrough.md` with at least two people who didn't build the prototype. Record what really happened.
3. **Team decisions:** confirm roles (Minutes 3 vs report §3), approve or reject CR-04 and CR-05 (§6.4), and settle the "one model" question (§9).
4. **Report fixes:** FR-04 and §4.2 say "unusual does not mean illicit", but NFR-01's wording check bans "illicit". The old Figure 3 says "Unusual ≠ illicit". Use the fixed limitation line instead, and replace Figure 3 with the new screenshots.
5. **Export Confluence** before the trial ends on 15 Oct.

---

## 3. Running everything

You need Node.js 22+ and Python 3.12. Nothing needs conda yet: the Python code so far uses only the
standard library.

```bash
# the prototype
cd frontend
npm install          # first time only
npm run dev          # open http://localhost:5173

# front-end tests and type check
npm test
npm run typecheck

# screenshots (with npm run dev running in another terminal)
npm run screenshots

# Python tests (from the project root)
python -m unittest discover -s tests -t . -v

# the D1 check (calls the real Esplora API, about 15 requests)
python scripts/d1_check.py
```

**Prototype tools.** While the app runs on illustrative data, a **Prototype tools** button sits at the
bottom right. It can slow responses down (to show loading), simulate a network failure, and jump
straight to each state. It also lists what each illustrative address demonstrates. URL switches do the
same from a link: `/?latency=8000`, `/?offline=1`, `/?theme=dark`.

> **OneDrive note.** `frontend/node_modules` (about 100 MB) lives inside OneDrive and will sync. If
> that's slow, pause OneDrive while installing, or move the project outside OneDrive.

---

## 4. The folder, explained

```
config/settings.json      Every threshold in one place. Python and the front end both read it,
                          so the report, the pipeline and the interface can't drift apart.
explorer/                 Python package (grows in A2)
  settings.py               loads config/settings.json
  esplora.py                polite Esplora client: pauses between requests, backs off on 429/5xx
  amounts.py                received / sent / net / direction for one address in one transaction
scripts/d1_check.py       the D1 data-source check
tests/test_amounts.py     unit tests for the amount rule, plus a check against the real D1 data
data/d1/                  unchanged API responses from the D1 run + real addresses by type
reports/d1-check.md       the filled D1 worksheet
docs/                     usability walkthrough kit, screenshots
frontend/
  src/api/types.ts          THE API CONTRACT: the five endpoints and every response and error shape
  src/api/client.ts         picks the mock (now) or the real HTTP back end (A3)
  src/api/http.ts           the real client, already written
  src/api/mock/             the stand-in back end
    generate.ts               invents the illustrative addresses and histories (seeded, repeatable)
    scoring.ts                features F1–F4 and the baseline (the reference implementation)
    mockApi.ts                serves the five endpoints with the same errors as the real API will
  src/screens/              Screen 1 (Select), Screen 2 (Timeline), Screen 3 (Day + TransactionPanel)
  src/charts/               the two charts: daily timeline, feature deviation
  src/components/           state panels, badges, icons, breadcrumbs, prototype tools
  src/lib/                  address validation, dates (UTC), formatting, router, explanations
  tests/                    66 tests (see §8)
  scripts/screenshots.mjs   screenshots at three widths + the "no sideways scroll" check
```

---

## 5. D1: is the data source good enough?

Every requirement depends on one question: can the source give, for one address, each transaction's
time, the amount for that address, and its direction? `scripts/d1_check.py` answers it on real data.

**What the script does:**
1. It takes the newest block and collects the addresses in its first 50 transactions. It visits them in a seeded random order, so the choice is repeatable and isn't hand-picked.
2. It picks the first address with 50–300 confirmed transactions.
3. It fetches the address's whole confirmed history, 25 transactions per page, using the last transaction ID as the cursor.
4. It works out each transaction's amount and direction:
   - received = outputs paying the address;
   - sent = inputs spent from it;
   - net = received − sent.
5. It checks the results against the API's own totals, then against a second source (mempool.space).
6. It writes the worksheet and saves every raw response unchanged.

**Result (7 Oct 2026): PASS.** Address `bc1qyzcv…m9n8qa`, 59 transactions over 33 days:
- Count, ordering, paging and confirmation status all check out.
- **Summing the derived amounts over the whole history reproduces the API's independent totals exactly.** Received 0.00927460 BTC; sent 0.00908580 BTC. This is the strongest evidence that the amount rule is right (Risk 18).
- Blockstream and mempool.space agree on all 25 transactions they share.
- No rate limiting: 13 requests, median 0.7 s each.

**Two findings that matter later:**
- **Terms.** Neither the Esplora API docs nor Blockstream's general Terms of Use (2018) say anything about using the free API. Third-party write-ups mention roughly 50 requests a second; we send at most 2. Record "no explicit terms found" in the manifest and check with the tutor.
- **History span.** This active address had only 33 days of history, and the snapshot rule needs 90 or more. Many addresses in recent blocks are new, so Phase 1 will need to check many candidates. Addresses being *spent from* are older and better candidates.

---

## 6. How "unusual" is decided

This is the method from report §2.3 and the demo plan, as implemented in
`frontend/src/api/mock/scoring.ts`. The A2 Python pipeline will implement exactly the same rules.

### 6.1 Amount and direction

For address A in transaction T: received = sum of T's outputs paying A; sent = sum of T's inputs spent
from A; **net = received − sent**. Positive is *in*, negative is *out*, zero is *no net change*.
All amounts are whole satoshis (1 BTC = 100,000,000 sats).

### 6.2 Four features, from earlier transactions only (DR-02)

Everything about transaction T is computed from transactions confirmed **strictly before** T.
Transactions in the same block share a time, so they are never in each other's history.

| Feature | Value | What it catches |
|---|---|---|
| F1 Size | log10(1 + \|net\| in sats) | unusually large or small amounts |
| F2 Burst | how many of the address's transactions fell in the 7 days before T | sudden bursts, or sudden quiet |
| F3 Gap | hours since the address's previous transaction | a dormant address waking up |
| F4 Relative size | \|net\| ÷ the median \|net\| of the comparison window | size against the address's own habit |

### 6.3 The baseline: robust z-score

For each feature, compare T's value with the same feature over a **comparison window** of earlier
transactions:

```
z = (value − median of window) / max(1.4826 × MAD of window, minimum spread)
```

- MAD is the median absolute deviation, a spread measure that a few extreme values can't distort. 1.4826 scales it to match a standard deviation.
- **Flagged:** any feature with |z| ≥ 3.5. **Contributing:** |z| ≥ 2 (shown in the explanation).
- **Scored only with enough history:** at least 10 earlier transactions, and at least 14 days since the address's first one. Otherwise the transaction shows the insufficient-history state.
- Fewer than 5 values in a window means "no comparison data" for that feature.

**The two windows.** Each is "the previous 30 days, extended back to at least the last 20
transactions" (CR-02). Without that extension, an address that wakes up after 30+ quiet days has
nothing to compare against, and the dormant pattern can never be flagged.
- **Timing window** (F2, F3): all earlier transactions.
- **Size window** (F1, F4): earlier transactions in the **same direction** (CR-04, below).

### 6.4 Decisions I made that the team should approve

| | Decision | Why |
|---|---|---|
| **CR-04 (proposed)** | Compare **size only with earlier transactions in the same direction**: incoming against incoming, outgoing against outgoing. A setting switches back to the report's rule: `features.sizeComparison` = `"all"`. | Without it, any address that collects small payments and sweeps them out has **every sweep flagged**, because each sweep is compared with small incoming amounts. Evidence below. |
| **CR-05 (proposed)** | The baseline compares F3 and F4 on a log scale, and each feature has a minimum spread (`baseline.minScale`). | Gaps and ratios have heavy tails: on the raw scale, an ordinary 3-day gap at a daily address looks extreme. A regular address can also have a spread of exactly 0, which makes z infinite. |
| Defaults | Days in **UTC**. History span = time since the address's first transaction. Same-block transactions excluded. | So a transaction never changes day with the viewer's clock, and the time-safety rule (DR-02) holds exactly. |
| Defaults | If a future ML method flags a transaction where no feature reaches 2, the panel shows the **two largest differences**. | So AC-03 always has an explanation, whichever method wins in A2. |

**Evidence for CR-04** (flagged transactions as a share of scored ones):

| Address | Report rule ("all") | Same direction | Outgoing transactions flagged |
|---|---|---|---|
| Illustrative 1: small payments in, sweeps out | 16 (12.7%) | 9 (7.1%) | 10 → 2 |
| Illustrative 2: dormant wake-up | 7 (10.3%) | 2 (2.9%) | 7 → 1 |
| Illustrative 3: busy address | 13 (3.9%) | 14 (4.2%) | 5 → 6 |
| Illustrative 4: occasional + dust | 1 (2.3%) | 2 (4.7%) | 0 → 0 |
| Illustrative 5: weekly payments | 9 (18.4%) | 4 (8.2%) | 5 → 0 |
| **Real D1 address** | 2 (7.1%) | 2 (7.1%) | 0 → 0 |

All the planted patterns are still caught: the value spike, the burst, the 80-day wake-up (F3 z = 8.8)
and the dust payment. Copy-ready Change Log text:

> **CR-04.** Change: F1 Size and F4 Relative size are compared only with earlier transactions in the same direction (in vs out). Reason: under the original rule, routine sweeps out are flagged every time, because they are compared with small incoming payments; in testing this pushed one address to 18.4% flagged (sanity limit 20%). Impact: report §2.3 anomaly definition and the detail panel's comparison text; no schedule impact. Reversible through `features.sizeComparison`. Evidence: WALKTHROUGH.md §6.4.

### 6.5 On the real data

On the real D1 address the baseline flags **2 of 28 scored transactions (7%)**, both for an unusually
long gap (F3 z = 5.6 and 3.5). That is the kind of flag the tool exists to surface: explainable, and
not a judgement.

### 6.6 A worked example

The prototype's most unusual transaction (14 Aug 2026, 09:00 UTC) received 0.044 BTC:

| Feature | This transaction | Usual (window median) | z |
|---|---|---|---|
| Size | 0.044 BTC | 0.001923 BTC | **+10.0**, flag level |
| Relative size | 23× | 1.1× | **+9.7**, flag level |
| Burst | 2 in the previous 7 days | 5 | −2.0, contributing |
| Gap | 21 hours | 25 hours | −0.3 |

This address's incoming amounts usually vary by a factor of about 1.4. A payment 23 times the usual
size is therefore about ten "typical spreads" above normal, far past the 3.5 flag level. The panel
lists both windows it was compared with, then the limitation line.

---

## 7. The front end

### 7.1 Three screens (`frontend/src/screens/`)

| Screen | Route | Shows |
|---|---|---|
| 1 Select | `#/` | Lookup box (validated in the browser) + table of snapshot addresses with activity and flag counts |
| 2 Timeline | `#/address/<addr>` | Address, source and snapshot date, 4 stat tiles, the **timeline chart**, a table version of the chart, and the **list of unusual days** |
| 3 Day | `#/address/<addr>/day/<YYYY-MM-DD>[/tx/<txid>]` | The day's transactions beside the detail panel: facts, "why it stands out", comparison basis, limitation line, the **feature deviation chart** and a feature table |

Every screen and state has its own URL. The back button works, and a usability task or screenshot can
start anywhere.

### 7.2 Every FR-05 state, and how to see it

| State | Where it appears | How to trigger it |
|---|---|---|
| Invalid | Lookup box (checksum, wrong network, Ethereum address, spaces, empty), or a bad link | Type a mistyped address; Prototype tools → "Invalid" |
| Unsupported | Lookup result or a link to an unknown address: explanation + 3 supported examples | Prototype tools → "Unsupported" |
| Loading | Every request | Prototype tools → delay 8 s, or `/?latency=8000` |
| Empty | Day screen before choosing a transaction; a day with no transactions; an empty snapshot | Open any day |
| Insufficient history | Whole address (timeline banner) or a single transaction (the 422 panel still shows the transaction's facts) | The two "short history" addresses |
| Network failure | Any request, with a working "Try again" | Prototype tools → "Simulate network failure", or `/?offline=1` |

### 7.3 How a click becomes a screen

1. A link changes the URL hash. `lib/router.ts` turns it into a route, and `App.tsx` renders the matching screen.
2. The screen calls `useRequest(key, fetcher)` (`hooks/useRequest.ts`). It returns loading, success or error, caches successes (the snapshot is frozen), and offers `retry`.
3. The fetcher calls `api` from `api/client.ts`. Today that is the mock. In A3, setting `VITE_API_MODE=http` (see `frontend/.env.example`) points the same calls at FastAPI. **No screen code changes**, because both sides follow `api/types.ts`.
4. Errors arrive as `ApiError` with an HTTP status and a typed body. `components/ErrorState.tsx` maps them to state panels: 400 → invalid, 404 → unsupported or not found, 0 → network failure. The 422 case has its own panel in `TransactionPanel.tsx`.

### 7.4 Design rules (and where they live)

- **Flags are orange, never red,** with a ▲ and the word "Unusual". They never rely on colour alone.
- **Chart colours:** blue for ordinary days, orange for flagged days. The pair was checked with a colour-blindness validator, in light and dark mode.
- **Monospace** for addresses, transaction IDs and amounts; amounts always show 8 decimals.
- **Wording:** "unusual", "stands out", "needs investigation". Tests block the five banned words (`settings.bannedWords`) in the source and on every rendered screen.
- **Keyboard:**
  - every action is a link or button, with a visible focus ring and a skip link;
  - focus moves to the new page heading after navigation;
  - the timeline chart is one tab stop: arrow keys move between days, Enter opens a day;
  - the unusual-days list and the table view are keyboard paths too.
- **Responsive:** checked at 1280, 820 and 390 px. `npm run screenshots` fails if any page scrolls sideways.
- **Dark mode** follows the system setting (or `?theme=dark`).
- **Illustrative data is always labelled:** a banner on every page, and "no public record" where a real transaction would link to blockstream.info.

### 7.5 The two charts (A3 requires 2+ chart types)

- **Timeline** (`charts/TimelineChart.tsx`): bars of transactions per day. Days with an unusual transaction are orange with a ▲.
  - The whole column under the pointer is the click target, because thin bars are hard to hit.
  - A tooltip shows the count and the unusual count.
  - The title, axis units, "Date (UTC)" and the snapshot date are all shown (NFR-01 condition 1).
- **Feature deviation** (`charts/FeatureChart.tsx`): one horizontal bar per feature, showing its z.
  - Dashed lines mark ±2 (contributing) and ±3.5 (flag). Orange bars are at flag level, blue are contributing, grey are within usual.
  - Off-scale values get an arrow, and the z column always shows the true number. The table below repeats every value.

---

## 8. Tests and what they prove

| File | Proves | Requirement |
|---|---|---|
| `tests/address.test.ts` | Accepts **real addresses of every type collected by D1**; catches every single-character typo in a bc1 address; gives specific messages (testnet, Ethereum, spaces) | FR-01, FR-05 invalid |
| `tests/sha256.test.ts` | The checksum hash matches Node's for 200 input lengths | — |
| `tests/scoring.test.ts` | **DR-02**: recomputing 20 transactions per address from earlier records only gives identical features; minimum-history rule; ≤20% flagged per address; planted patterns caught; CR-04 behaviour both ways | DR-02, sanity rule |
| `tests/mockApi.test.ts` | The API contract: 400/404/422; timeline totals add up; **every flagged transaction on every address** has reasons, a comparison basis and the limitation line | AC-01, AC-02, AC-03, FR-03, FR-04 |
| `tests/journey.test.tsx` | The **four usability tasks** run as automated journeys; every FR-05 state renders with a next step; keyboard use of the chart; no banned word on any screen | AC-01–03, FR-05, NFR-01, NFR-03 |
| `tests/prototype.test.ts` | Wording check on all source files; screenshot targets stay in sync with the data | NFR-01 condition 3 |
| `tests/test_amounts.py` | Amount rule on hand-made transactions (change, coinbase, several inputs) **and on the real D1 history** | Risk 18 |

Automated tests show the design *works*. They don't show people *understand* it. That still needs the
walkthrough with real participants (§2).

---

## 9. What comes next

| Phase (demo plan) | Dates | What I'll build |
|---|---|---|
| 1 Snapshot | 12–14 Oct | `scripts/select_addresses.py`, with the selection rule written into settings *before* collecting. `scripts/fetch_snapshot.py` reuses `EsploraClient.address_history`. Raw files go to `data/raw/`; `data/manifest.json` gets every DR-01 field. |
| 2 Features | 15–18 Oct | `explorer/features.py`: the Python version of `scoring.ts`. A **parity test** feeds both versions the same fixture and requires identical numbers, plus the DR-02 test in Python. |
| 3 Exploration | 19–21 Oct | Notebook: feature distributions, per-address activity, threshold notes |
| 4 Methods | 22–26 Oct | Baseline (done) + **one trained model** (below), fitted on the earliest 70% by time |
| 5 Evaluation | 27–29 Oct | Synthetic injection, stability, method agreement, reviewer check; the selection rule |
| 7–8 API | 30 Oct–8 Nov | FastAPI serving exactly `api/types.ts`: same paths, bodies and error codes |
| 9–10 Front end | 2–16 Nov | Mostly done already: switch to `VITE_API_MODE=http` and point the source links at blockstream.info |

**The "one model" decision.** I read "just train 1 model" as: train **one Isolation Forest shared by
all addresses**, not one per address. Its inputs are each transaction's per-address robust z-scores,
so "unusual" still means unusual *for that address*. **Open question:** the A2 brief (per report §4.1)
asks for "2+ ML models". If that's firm, I'd add Local Outlier Factor as a second, comparison-only model
at little cost. The app would still serve the one chosen model.

---

## 10. Glossary

| Term | Meaning |
|---|---|
| Address | A Bitcoin "account" identifier: starts with 1 (legacy), 3 (script) or bc1 (SegWit/Taproot) |
| Satoshi (sat) | 0.00000001 BTC |
| Esplora | The open-source block-explorer API behind blockstream.info (also served by mempool.space) |
| Snapshot | The frozen set of addresses and their histories the app reads; no live blockchain calls |
| Robust z-score | Distance from the median, measured in robust spreads (MAD × 1.4826) |
| Comparison window | The earlier transactions a feature is compared with (§6.3) |
| Flag level / contributing | \|z\| ≥ 3.5 flags a transaction; \|z\| ≥ 2 is listed as contributing |
| Illustrative data | Invented data used by the A1 prototype; always labelled as such |
| CR | A change request in the team's Change Log |
