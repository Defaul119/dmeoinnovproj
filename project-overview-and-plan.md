# Bitcoin Address Activity Explorer
### COS30049 Computing Technology Innovation Project — Group HCMC_COS30049.1_4

**Team:** Cam Dan Bui (Leader), Cao Tri Tran (Data & ML lead), Le Quang Anh Hoang (PM & schedule lead), Minh Khang Nguyen (UX & web lead)
**Last updated:** 7 October 2026
**Source of truth:** Main Report (Confluence page 5210113), WBS Dictionary v.2, Risk & Change register, Change Log

> Role assignments follow report §3. Meeting Minutes 3 swaps the Data/ML and UX/web leads. Confirm which is correct at the next meeting.

---

## Part 1 — What this project is about

### 1.1 The problem

Bitcoin is a public ledger. Anyone can look up the full transaction history of a Bitcoin address on a block explorer. That history is just a long list of records, though. A researcher studying a single address has to scroll through hundreds of transactions and judge for themselves which ones are worth a closer look.

Research datasets that label Bitcoin activity as "fraud" or "illicit" exist, but most of their records are unlabelled or only loosely labelled (Elmougy and Liu 2023). So a tool that claims to *detect fraud* would be claiming something the data cannot support.

### 1.2 What we are building

A **research-oriented Bitcoin Address Activity Explorer**: a web app that lets a user:

1. **Pick a Bitcoin address** from a documented sample.
2. **See its activity over time** as a daily timeline.
3. **Drill into any day** to see the individual transactions.
4. **See which transactions are unusual** compared with that address's own earlier behaviour, and **why** each one was flagged.

The output is an **unusual-activity indicator, not a fraud verdict**. Every flagged transaction carries the line:

> *"Unusual activity requires investigation; it does not indicate wrongdoing."*

### 1.3 Who it is for

The target user is a **student researcher** examining the historical activity of one supported Bitcoin address. They need to find which transactions deserve attention, and understand why, without manually scanning every record.

### 1.4 What is in scope and what is not

| In scope | Out of scope |
|---|---|
| One Bitcoin address at a time, from a curated sample | Other blockchains (Ethereum, etc.) |
| Daily activity timeline | Addresses outside the sample (these get an explanation, not a result) |
| Transaction drilldown: ID, time, amount, direction, source link | Identifying who owns an address |
| Transparent anomaly indication with its reasons | Tracking whole wallets or monitoring private wallets |
| Clear error and empty states | Claims of fraud, guilt or criminality |
| A frozen snapshot of real data, read locally | Live blockchain calls from the app |

### 1.5 How the anomaly detection works

**Data source.** The Blockstream **Esplora** public API, called once offline to build a frozen snapshot of 20–30 addresses.

**Amount and direction for an address in a transaction:**
- received = sum of outputs paying the address
- sent = sum of inputs spent from the address
- net = received − sent (positive is "in", negative is "out")

**Four features,** each computed only from transactions confirmed *before* the one being scored, so the model never "sees the future":

| ID | Feature | What it means | What it catches |
|---|---|---|---|
| F1 | Size | log of the absolute net amount | Unusually large or small transfers |
| F2 | Burst | Number of transactions in the previous 7 days | Sudden bursts of activity |
| F3 | Gap | Hours since the previous transaction | A dormant address waking up |
| F4 | Relative size | Absolute net ÷ the address's usual (median) amount | Size compared with the address's own habit |

**Three methods compared:**
1. **Baseline (rule-based).** Robust z-score: how far each feature is from the address's own recent median. A transaction is flagged if any feature's z is 3.5 or more.
2. **Isolation Forest.** An unsupervised ML method that isolates unusual points (Liu, Ting and Zhou 2008).
3. **Local Outlier Factor (LOF).** An unsupervised ML method that compares local density.

**Minimum history:** a transaction is only scored if the address has at least 10 earlier transactions over at least 14 days. Otherwise the app shows an "insufficient history" message.

**Evaluation without fraud labels.** Because there is no trustworthy ground truth, the methods are compared on four label-free checks:

| Check | How | Target |
|---|---|---|
| Synthetic injection | Plant fake spikes, bursts and dormant wake-ups; count how many each method flags | 70%+ for at least 2 of 3 patterns |
| Stability | Re-run with different seeds and resamples; compare the top 50 flags | Overlap of 0.7 or more |
| Method agreement | How much the three methods agree | Reported only |
| Reviewer check | Two members blindly rate flagged vs unflagged transactions | Reported as judgement, not truth |

### 1.6 System architecture

```
OFFLINE (Assignment 2, run once)
  Esplora API ──► Snapshot script ──► Features & scoring ──► Local store
                  (paged, rate-limited)  (F1–F4, baseline,     (snapshot, scores,
                                          IF, LOF)              manifest)

LIVE IN THE DEMO (Assignment 3)
  React front end ◄──GET/POST──► FastAPI back end ──reads only──► Local store
```

**Planned API:**

| Method | Endpoint | Returns |
|---|---|---|
| GET | /api/addresses | Supported addresses, date ranges, snapshot date |
| POST | /api/lookup | Whether a typed address is supported, unsupported or invalid |
| GET | /api/addresses/{address}/timeline | Daily counts and flagged days |
| GET | /api/addresses/{address}/transactions?date= | One day's transactions |
| GET | /api/transactions/{txid}?address= | Full detail, features vs usual, limitation line |

Errors: **400** invalid format · **404** address not in sample · **422** insufficient history.

### 1.7 The three assignments

| Assignment | Weight* | Due* | Deliverable |
|---|---|---|---|
| A1 — Project plan & prototype | 15% | 11 Oct 2026, 23:59 | Project management plan, WBS, Gantt, risk register, prototype with usability explanation, minutes, contribution form |
| A2 — Data & ML | 40% | 8 Nov 2026, 23:59 | Data snapshot, feature pipeline, 2+ ML methods evaluated, code, README, 3,000-word report |
| A3 — Web app & demo | 45% | 6 Dec 2026, 23:59 | React + FastAPI app, 2+ chart types, README, 8-page report with API docs, demo video of 7 minutes or less |

\*Weights and dates as recorded in Confluence. Confirm them on Canvas, including the time zone.

### 1.8 What "done" looks like

The project succeeds when, in the A3 build, **every address in the snapshot** passes:
- **AC-01:** picking a sample address shows its timeline, date range and a path to the flagged transactions.
- **AC-02:** an address outside the sample gets an explanation and examples, never a made-up result.
- **AC-03:** a flagged transaction shows its contributing features, comparison basis and the limitation line.
- **FR-05:** invalid, unsupported, loading, empty and insufficient-history states are each clear and offer a next step.

---

## Part 2 — Step-by-step plan

Each phase lists its **WBS code**, **lead**, **steps** and a **done when** test.

### Phase 0 — Finish Assignment 1 (now → 11 Oct)

| When | Step | Lead | Done when |
|---|---|---|---|
| 7 Oct | Hold Meeting 4: confirm roles, product scope, A1 deadline and time zone; minute it | All | Minutes posted and verified |
| 7–8 Oct | Run the **D1 data check** (see Phase 1, step 1) | Data/ML lead | D1 worksheet filled with one real address |
| 7–9 Oct | Build the **new prototype in VS Code**: three screens and five feedback states | UX/web lead | Prototype runs locally; screenshots taken |
| 8–9 Oct | Usability walkthrough with 2+ people on the new prototype | UX/web lead | Issues and fixes recorded in report §10 |
| 9 Oct | Update report §10 with new screenshots; replace Figure 3 | UX/web lead | §10 matches the new prototype |
| 9 Oct | Regenerate Gantt and critical-path images to match the updated WBS | PM lead | Figures 1–2 replaced |
| 10 Oct | Proofread, sign contribution form, export PDF, check every page | All | PDF checked |
| 10 Oct | **Submit A1** (a day early) | Leader | Canvas receipt saved |

**New prototype (VS Code) must include:**
- Screen 1: address selection, with a list of sample addresses and a lookup box.
- Screen 2: daily activity timeline with flagged days marked.
- Screen 3: the day's transactions plus a detail panel showing why a transaction was flagged.
- The five states: invalid, unsupported, loading, empty, insufficient history.
- Illustrative data only, clearly labelled as such.

### Phase 1 — Data snapshot (12–14 Oct) · WBS 1.2.1

1. **D1 check.** Pull one real address's transactions from Esplora (`/address/<addr>/txs/chain`). For 5 transactions, calculate the amount and direction, check one by hand on blockstream.info, and record the fields, paging and API terms.
2. **Write the selection rule before collecting**, to avoid picking addresses because they already look odd. Take addresses from recent blocks in a fixed random order; keep those with 50–1,000 transactions over 90+ days, plus 2–3 with only 3–9 transactions.
3. **Collect** each address's history with a polite, rate-limited script that backs off on HTTP 429.
4. **Save** the raw responses unchanged.
5. **Write the dataset manifest:** source, date, selection rule, fields, kept and skipped addresses, how to rebuild.

**Done when:** 20–30 qualifying addresses are collected and a second member has reviewed the manifest.

### Phase 2 — Features (15–18 Oct) · WBS 1.2.2

1. Turn each raw transaction into one row: txid, time, received, sent, net, direction.
2. Remove unconfirmed transactions and duplicates.
3. Compute F1–F4 using only earlier transactions.
4. Mark transactions with too little history as "not scorable".
5. Write a unit test: recompute features for 20 random transactions and confirm they match.

**Note:** use a comparison window of *"previous 30 days, extended back to at least the last 20 transactions"*. Otherwise an address that was quiet for over 30 days has nothing to compare against, and dormant wake-ups can't be flagged. Log this as change request **CR-02** and update report §2.3.

**Done when:** the processed dataset loads cleanly, has no duplicates, and the unit test passes.

### Phase 3 — Explore the data (19–21 Oct) · WBS 1.2.3

1. Plot each feature's distribution.
2. Plot a few addresses' daily activity to see what "normal" looks like.
3. Note which features have heavy tails (likely F3 and F4) and any threshold changes needed.

**Done when:** a notebook shows and explains the plots.

### Phase 4 — Build the methods (22–26 Oct) · WBS 1.2.4

1. **Split by time:** the earliest 70% of scorable transactions is the fit period, the rest is the evaluation period. Never shuffle across time.
2. **Baseline:** robust z-score per feature, flag at 3.5.
3. **Isolation Forest and LOF:** fit on the fit period only; flag the top 2% of scores.
4. Save the models and one scores table with all three methods.

**Done when:** all three methods score every scorable transaction.

### Phase 5 — Evaluate and choose (27–29 Oct) · WBS 1.2.5

1. Run the four label-free checks (table in §1.5).
2. **Sanity rule:** no address should have more than 20% of its transactions flagged. If one does, tune, log it and re-run.
3. **Selection rule:** among stable methods, pick the highest synthetic recall. If two are within 5 points, pick the easier one to explain (baseline, then Isolation Forest, then LOF).

**Done when:** the evaluation table and choice are written up, with no fraud accuracy, precision or recall claims anywhere.

### Phase 6 — Package and submit A2 (30 Oct–2 Nov) · WBS 1.2.6, 1.2.7

1. Organise the code into one command per pipeline step: select, fetch, features, score, evaluate.
2. Write a README: setup, commands in order, expected outputs.
3. A second member runs the README on a fresh machine.
4. Write the A2 report (3,000 words max): data, methods, evaluation, limitations (no labels, selection bias, per-address cap).
5. Minutes and contribution form; **submit with buffer before 8 Nov**.

### Phase 7 — Design the API (30 Oct–1 Nov) · WBS 1.4.1

Write a request and response example for each of the five endpoints in §1.6, including the 400, 404 and 422 errors. These go straight into the A3 report.

### Phase 8 — Back end (2–8 Nov) · WBS 1.4.2

1. Load the scores table, manifest and evaluation result at start-up.
2. Keep query logic separate from the routes so it can be tested without a server.
3. Validate address format (legacy addresses start with 1 or 3, SegWit with bc1) before lookup.
4. Test every endpoint, including all three error codes.

**Done when:** a sample address returns its timeline and flag details, and bad inputs return the correct error.

### Phase 9 — Front end (2–10 Nov) · WBS 1.4.3

1. Rebuild the three prototype screens in React, calling the API.
2. Implement all five states, each with a message and a next action.
3. Use a warm "look here" colour for flags, not red, because unusual is not guilty.
4. Keyboard access throughout; test at desktop, tablet and mobile widths.

### Phase 10 — Charts (11–16 Nov) · WBS 1.4.4

1. **Timeline bar chart:** transactions per day; flagged days highlighted; click a bar to open that day.
2. **Feature chart:** each feature's z for the selected transaction, with reference lines at ±2 and 3.5.

Both need titles, axis labels with units, and the snapshot date.

### Phase 11 — Buffer (17–22 Nov) · WBS 1.4.5

Spare time by default. Optional extras (CSV export, a third chart) only go in if the core journey already passes and a change request is approved.

### Phase 12 — Test and fix (23–27 Nov) · WBS 1.4.6

| Test | Pass condition |
|---|---|
| AC-01 to AC-03 on every address | Logged as passed |
| Error states | 400, 404, 422 and network failure each show the right message |
| Wording check | None of: fraud, criminal, illicit, guilty, suspicious |
| Responsive | Usable on desktop, tablet and mobile |
| Clean install | Someone who didn't write the code runs it from the README |
| Usability | Two people explain a flag as "needs investigation" |

### Phase 13 — Report, video, submit (28 Nov–2 Dec) · WBS 1.4.7

**Demo video (aim for about 6 minutes; limit 7):**

| Time | Content |
|---|---|
| 0:00–0:40 | Problem, user, "unusual is not guilty" |
| 0:40–1:30 | Data source, selection rule, snapshot date |
| 1:30–3:30 | Full journey: address → timeline → flagged day → transaction → why |
| 3:30–4:30 | Error states |
| 4:30–5:15 | Evaluation results and chosen method |
| 5:15–6:00 | Desktop, tablet, mobile; limitations |

Upload the video as unlisted, keep a backup copy, and test playback in a private window. Write the A3 report (8 pages max, with API docs). Then minutes, contribution form, and **submit before 6 Dec**.

---

## Part 3 — Key risks to watch

| Risk | Early warning | First response |
|---|---|---|
| Esplora can't give the needed fields | D1 check fails | Narrow the drilldown via change request |
| Amounts calculated wrongly | Hand check disagrees | Unit-test 10 hand-checked transactions |
| Rate limits or outages | HTTP 429 errors | Slow down, collect early, cache |
| Biased sample | No written selection rule | Write the rule before collecting; report the bias |
| Too many or too few flags | Flag rate under 1% or over 20% | Tune thresholds and log the change |
| Fraud-accuracy claims creep in | Any "precision/recall" against fraud | Remove; restate as unusual-activity ranking |
| Role confusion | Minutes and report disagree | Confirm at Meeting 4 |
| Code won't run for the marker | Clean-install test fails | Pin versions; fix the README |
| Video broken or too long | Private-window test fails | Two copies; trim to 7 minutes |
| Confluence trial ends 15 Oct | Features locked | Export report and tables before 15 Oct |

---

## Part 4 — Final checklist

- [ ] Roles, scope and A1 deadline confirmed and minuted
- [ ] New VS Code prototype built, tested with 2+ people, screenshots in report §10
- [ ] Gantt and critical path regenerated; **A1 submitted**
- [ ] D1 check done; snapshot of 20–30 addresses with reviewed manifest
- [ ] Features pass the "earlier transactions only" unit test
- [ ] Baseline, Isolation Forest and LOF scored and evaluated without labels
- [ ] README runs on a clean machine; **A2 submitted**
- [ ] Five endpoints working, including 400, 404 and 422
- [ ] Three screens, five states, two charts, limitation line on every flag
- [ ] AC-01 to AC-03 and FR-05 pass on every snapshot address
- [ ] Video 7 minutes or less, tested, two copies; **A3 submitted**

---

## References

- Blockstream (n.d.) *Esplora HTTP API*. https://github.com/Blockstream/esplora/blob/master/API.md
- Elmougy, Y. and Liu, L. (2023) 'Demystifying fraudulent transactions and illicit nodes in the Bitcoin network for financial forensics', *KDD '23*. https://doi.org/10.1145/3580305.3599803
- Liu, F.T., Ting, K.M. and Zhou, Z.-H. (2008) 'Isolation Forest', *ICDM 2008*, pp. 413–422. https://doi.org/10.1109/ICDM.2008.17
- Nielsen, J. (1994) '10 usability heuristics for user interface design', Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/
