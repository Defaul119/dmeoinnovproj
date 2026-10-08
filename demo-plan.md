# Plan: Working end-to-end demo with real Bitcoin data

**Project:** Bitcoin Address Activity Explorer (COS30049, group HCMC_COS30049.1_4)
**Prepared:** 6 October 2026
**Covers:** Assignment 2 (data and method, due 8 Nov) and Assignment 3 (web app and demo video, due 6 Dec)
**Source of truth:** Main Report v20, WBS Dictionary v.2, Risk & Change register, Change Log (CR-01)

---

## 1. What the finished demo must show

One complete journey on **real Bitcoin data**, run locally, recorded in a demo video of 7 minutes or less:

1. The researcher picks a supported address from the snapshot (or types one).
2. A daily activity timeline appears, with flagged days highlighted.
3. Clicking a day lists its transactions.
4. Clicking a transaction shows its ID, confirmed time, amount, direction and a link to the public block explorer.
5. For a flagged transaction, the detail panel shows:
   - which features made it unusual;
   - what they were compared against;
   - the line "Unusual activity requires investigation; it does not indicate wrongdoing."
6. Invalid, unsupported, loading, empty and insufficient-history inputs each show a clear message and a next step.

**Done means:** AC-01 to AC-03 and FR-05 pass on every address in the snapshot, the app runs from a clean install using only the README, and the A2 evaluation is reported without any fraud accuracy claims.

---

## 2. Timeline at a glance

| Phase | Dates (2026) | WBS | Lead role | Output |
|---|---|---|---|---|
| 0. Data source check (D1) | 6–9 Oct | 1.1.2 | Data/ML lead | Filled D1 worksheet with one real address |
| 1. Data snapshot | 12–14 Oct | 1.2.1 | Data/ML lead | Raw snapshot, retrieval script, manifest |
| 2. Features | 15–18 Oct | 1.2.2 | Data/ML lead | Processed dataset with F1–F4 |
| 3. Exploration | 19–21 Oct | 1.2.3 | Data/ML lead + UX/web lead | Notebook with plots and threshold notes |
| 4. Baseline and ML methods | 22–26 Oct | 1.2.4 | Data/ML lead | Baseline, Isolation Forest, LOF, scores |
| 5. Evaluation and selection | 27–29 Oct | 1.2.5 | Data/ML lead | Evaluation table, chosen method |
| 6. A2 code, README, report | 30 Oct–2 Nov | 1.2.6, 1.2.7 | Data/ML lead + PM lead | A2 submission (buffer to 8 Nov) |
| 7. API design | 30 Oct–1 Nov | 1.4.1 | UX/web lead + back-end owner | Endpoint spec (report §2.6) |
| 8. Back end | 2–8 Nov | 1.4.2 | Back-end owner | FastAPI service reading the snapshot |
| 9. Front end | 2–10 Nov | 1.4.3 | UX/web lead | React explorer with all states |
| 10. Charts | 11–16 Nov | 1.4.4 | UX/web lead + Data/ML lead | Timeline chart and feature chart |
| 11. Buffer / optional extras | 17–22 Nov | 1.4.5 | PM lead decides | Only via change control |
| 12. Test and fix | 23–27 Nov | 1.4.6 | All | Test log, clean-install check |
| 13. Report, video, submit | 28 Nov–2 Dec | 1.4.7 | All | A3 submission (buffer to 6 Dec) |

Roles follow report §3. Confirm who holds Data/ML lead and UX/web lead before starting: Minutes 3 and the report currently disagree (Risk 20).

---

## 3. Phase-by-phase plan

### Phase 0 — Data source check (D1), 6–9 Oct

**Why first:** every requirement depends on the source giving per-address transaction times, amounts and direction. If it can't, the scope changes now, not in A2.

**Steps**
1. Pick one active Bitcoin address from any recent block on blockstream.info.
2. Pull its first page of confirmed transactions from the Esplora API (`/address/<address>/txs/chain`).
3. For 5 transactions, work out the address's amount and direction:
   - received = sum of outputs paying the address;
   - sent = sum of inputs spent from the address;
   - net = received − sent;
   - positive net is "in", negative is "out".
4. Check one of them by hand against the block explorer page.
5. Record in the D1 worksheet:
   - the address and the transaction IDs;
   - confirmed times and the derived amounts;
   - how paging works (25 per page, continued from the last transaction ID);
   - the API terms link;
   - any limits you hit.

**Done when:** the D1 worksheet on Confluence is filled and the team agrees at the next meeting that Esplora is the source. If it fails, log a change request (Risk 17) and narrow FR-03 before A1 is submitted.

### Phase 1 — Data snapshot, 12–14 Oct (WBS 1.2.1)

**Steps**
1. **Write the selection rule down before collecting** (Risk 19). Recommended rule:
   - take output addresses from transactions in a few recent blocks;
   - visit them in a fixed random order (seeded);
   - keep addresses with 50–1,000 confirmed transactions, plus 2–3 addresses with 3–9 transactions to exercise the insufficient-history state.
2. Fetch each address's full confirmed history with paging. Pause about half a second between requests and back off on HTTP 429 (Risk 15). Cap at 1,000 transactions per address.
3. Keep main addresses whose history spans at least 90 days, until you have 20–30 (Objective 1).
4. Save the raw responses unchanged, one file per address.
5. Write the dataset manifest (DR-01):
   - source and collection date;
   - the selection rule and the blocks scanned;
   - fields used and the per-address cap;
   - kept and skipped addresses, with reasons;
   - how missing values are handled;
   - the exact command to rebuild.

**Done when:** the snapshot meets Objective 1, the manifest has every DR-01 field, and a second member has reviewed it.

### Phase 2 — Features, 15–18 Oct (WBS 1.2.2)

**Steps**
1. Flatten each raw transaction into one row per address: txid, block time, received, sent, net, direction.
2. Drop unconfirmed transactions and duplicate (address, txid) pairs.
3. Compute features using **only transactions confirmed strictly earlier** (DR-02):

   | Feature | Definition |
   |---|---|
   | F1 Size | log10(1 + absolute net amount in satoshis) |
   | F2 Burst | number of the address's transactions in the previous 7 days |
   | F3 Gap | hours since the address's previous transaction |
   | F4 Relative size | absolute net divided by the median absolute net of the comparison window |

4. Mark a transaction **scorable** only if it has at least 10 earlier transactions spanning at least 14 days. Everything else shows the insufficient-history state.
5. Write a unit test: recompute F1–F4 for 20 random transactions from earlier records only, and confirm the values match (DR-02 pass condition 1).

**Important finding to apply.** A comparison window of only "the previous 30 days" is empty for a dormant address that wakes up after more than 30 days. The baseline then cannot flag the exact pattern it's meant to catch. Use **the previous 30 days, extended back to include at least the last 20 transactions**, and update the report's anomaly definition to say so (log it as CR-02).

**Done when:** the processed dataset loads cleanly, there are no duplicates, features are documented, and the DR-02 unit test passes.

### Phase 3 — Exploration, 19–21 Oct (WBS 1.2.3)

**Steps**
1. Plot the distribution of each feature, overall and per address.
2. Plot a few addresses' daily activity so the team sees what "normal" looks like.
3. Note heavy tails. F3 (gaps) and F4 (relative size) are likely to be skewed and to drive most flags.
4. Record proposed threshold adjustments for Phase 4.

**Done when:** the notebook shows and interprets distributions, per-address activity and correlations.

### Phase 4 — Baseline and ML methods, 22–26 Oct (WBS 1.2.4)

**Steps**
1. **Split by time.** The earliest 70% of scorable transactions form the fit period; the rest is the evaluation period. Never shuffle across time.
2. **Baseline.** For each feature, robust z = (value − median of the window) / (1.4826 × median absolute deviation of the window). Flag a transaction when any feature reaches an absolute z of 3.5 or more. Record the median and deviation per row so the detail panel can show "usual" values.
3. **Isolation Forest and Local Outlier Factor.**
   - Input: F1, F2, log of F3 and log of F4, standardised, with missing values filled from fit-period medians.
   - Fit on the fit period only.
   - Flag threshold: the top 2% of fit-period scores.
4. Save the fitted models and a scores table: one row per transaction, with all three scores and flags.

**Done when:** all three methods score every scorable transaction and the fit and evaluation periods are separate.

### Phase 5 — Evaluation and selection, 27–29 Oct (WBS 1.2.5)

Run the four label-free checks from report §2.3 on the evaluation period:

| Check | How | Target |
|---|---|---|
| Synthetic injection | Modify 50 real transactions per pattern: value spike (10× usual), burst (10 more in a day), dormant wake-up (60–90 idle days). Count how many each method flags. | 70% or more for at least two patterns |
| Stability | Re-fit each ML method 5 times (different seed, 80% of the fit period). Compare the top 50 flagged each time. | Jaccard overlap 0.7 or more |
| Method agreement | Overlap of flagged sets between the three methods | Reported only |
| Reviewer check | Two members blindly rate 20 top-flagged and 20 random unflagged transactions as "worth a look" or not | Reported as judgement, not truth |

**Sanity rule:** no address should have more than 20% of its transactions flagged. If one does, adjust the features or threshold, log the change and re-run.

**Selection rule:** among methods meeting the stability target, choose the highest average synthetic recall. If two are within 5 points, choose the one that is easier to explain. The baseline is easiest, then Isolation Forest, then LOF.

**Expect:** the baseline may flag too often at first, mostly from F3 and F4 tails. Tuning that is legitimate A2 work: record it as a finding, not a failure.

**Done when:** the evaluation table, the chosen method and the reasons are written up, with no accuracy, precision or recall against fraud labels anywhere.

### Phase 6 — A2 packaging and report, 30 Oct–2 Nov (WBS 1.2.6, 1.2.7)

**Steps**
1. Organise the code into small modules plus one command per pipeline step: select, fetch, build features, score, evaluate.
2. Write a README with:
   - conda setup;
   - the pipeline commands in order;
   - expected outputs;
   - how to rebuild the snapshot.
3. A second member runs the README on a fresh environment (NFR-02).
4. Write the A2 report (3,000 words max). Use the evaluation table, the selection reasoning, and limitations: no labels, selection bias, and the cap per address.
5. Update meeting minutes and the contribution form, then submit with the buffer to 8 Nov.

### Phase 7 — API design, 30 Oct–1 Nov (WBS 1.4.1)

Use the five endpoints already in report §2.6. The API only reads the local snapshot and scores: no live blockchain calls.

| Method | Endpoint | Returns |
|---|---|---|
| GET | /api/addresses | Supported addresses, date ranges, snapshot date, data source |
| POST | /api/lookup | Supported, unsupported or invalid for a typed address |
| GET | /api/addresses/{address}/timeline | Daily counts and flagged counts |
| GET | /api/addresses/{address}/transactions?date= | One day's transactions with flag status |
| GET | /api/transactions/{txid}?address= | Full detail, feature values vs usual, comparison basis, limitation line |

**Error contract (FR-05):**
- 400: invalid address format;
- 404: address not in the snapshot (include 2–3 supported examples);
- 422: insufficient history (return the transaction record and what history would be needed).

Write request and response examples for each endpoint. They go into the A3 report's API documentation.

### Phase 8 — Back end, 2–8 Nov (WBS 1.4.2)

**Steps**
1. Load the scores table, manifest and evaluation result once at start-up.
2. Keep the query logic in a plain module separate from the FastAPI routes, so it can be tested without a server.
3. Validate addresses with a format check (legacy addresses start with 1 or 3, SegWit with bc1) before looking them up.
4. Return the selected method's flags, all three scores, and the "usual" value and z for each feature.
5. Test every endpoint, including all three error codes.

**Done when:** a supported address returns its timeline and flag detail, and the invalid, unsupported and short-history cases return 400, 404 and 422 with clear messages.

### Phase 9 — Front end, 2–10 Nov (WBS 1.4.3)

**Screens** (same three as the A1 prototype):
1. Address selection (list plus a lookup box).
2. Daily timeline with flagged days marked.
3. Day's transaction list beside the transaction detail panel.

**States to build and show:** invalid, unsupported, loading, empty (nothing selected yet) and insufficient history. Each state explains what happened and offers the next action.

**Design rules**
- Flags use a warm "look here" colour, not red: unusual is not guilty.
- Transaction IDs and amounts use a monospace font, everything else a plain sans.
- Every flagged detail shows the limitation line.
- Keyboard access everywhere. Mirror chart clicks with a list of flagged-day buttons, because chart bars can't be reached by keyboard.
- Responsive: test at desktop, tablet and mobile widths for the video.

**Done when:** the layout matches the A1 prototype, all five states appear, and the form validates before calling the API.

### Phase 10 — Charts, 11–16 Nov (WBS 1.4.4)

Two chart types are required:
1. **Timeline bar chart:** transactions per day, with flagged days in the flag colour. Clicking a bar opens that day.
2. **Feature deviation chart:** horizontal bars of each feature's z for the selected transaction, with reference lines at ±2 ("contributing") and 3.5 ("flag").

Both need titles, axis labels with units (date, count, z) and the snapshot date (NFR-01 pass condition 1). A third chart or zoom and filter only go in through Phase 11.

### Phase 11 — Buffer and optional extras, 17–22 Nov (WBS 1.4.5)

Treat this as schedule buffer by default. An optional feature (for example CSV export of the current day's transactions) is added only if:
- the core journey already passes AC-01 to AC-03;
- a change request is logged and approved in the Change Log;
- the feature is tested and shown in the video.

### Phase 12 — Test and fix, 23–27 Nov (WBS 1.4.6)

| Test | Pass condition |
|---|---|
| AC-01 to AC-03 on every snapshot address | Script or checklist run, results logged |
| Error states | 400, 404, 422 and network failure each show the right message |
| Wording check | None of: fraud, criminal, illicit, guilty, suspicious |
| Responsive | Usable at desktop, tablet and mobile widths |
| Clean install | A member who didn't write the code runs it from the README alone |
| Usability | Two participants explain what a flag means as "needs investigation" (NFR-01 pass condition 4) |

### Phase 13 — Report, video, submit, 28 Nov–2 Dec (WBS 1.4.7)

**Demo video script (aim for about 6 minutes, hard limit 7):**

| Time | Shows |
|---|---|
| 0:00–0:40 | The problem and the user; the line that unusual is not guilty |
| 0:40–1:30 | Data source, selection rule and snapshot date (real data, frozen snapshot) |
| 1:30–3:30 | The full journey: pick address → timeline → flagged day → transaction → why it was flagged |
| 3:30–4:30 | Error states: invalid input, unsupported address, insufficient history |
| 4:30–5:15 | Evaluation results and why the chosen method won |
| 5:15–6:00 | Desktop, tablet and mobile layouts, then limitations |

**Steps**
1. Record and rehearse the video, then upload it as unlisted plus a file backup. Test it in a private browser window the day before (Risk 8).
2. Write the A3 report (8 pages max) with API documentation from Phase 7.
3. Update minutes and the contribution form, then submit with the buffer to 6 Dec.

---

## 4. Project structure (description only)

| Folder | Contents |
|---|---|
| explorer/ | Shared code: settings (every threshold in one place), Esplora client, amount derivation, features and baseline, ML methods, API query logic |
| scripts/ | One command per pipeline step: D1 check, select addresses, fetch snapshot, build features, score, evaluate |
| data/raw/ | Unchanged API responses, one file per address |
| data/processed/ | Feature table, scores table, saved models |
| data/ | Manifest, selection record, address list |
| reports/ | D1 check, evaluation summary, blind reviewer sample and answer key |
| app/ | FastAPI routes |
| frontend/ | React app |

Keep every threshold in one settings file so the report and the code can't drift apart.

---

## 5. Decisions and changes to log

| ID | Decision or change | When | Who |
|---|---|---|---|
| D1 | Esplora confirmed as the source, or scope narrowed | By 9 Oct | Team |
| CR-02 | Comparison window extended to at least the last 20 transactions (dormant-address fix); update report §2.3 | Before Phase 2 | Data/ML lead |
| CR-03 | Any threshold or feature change after the Phase 5 sanity check | Phase 5 | Data/ML lead |
| — | Final method choice, with evaluation evidence | 29 Oct | Team |
| — | Any optional A3 feature | Phase 11 | Team |

---

## 6. Risks to watch during the build

| Risk ID | Watch for | First response |
|---|---|---|
| 17 | Source can't give per-address times, amounts or direction | Narrow FR-03 via change request |
| 18 | Derived amounts wrong | Unit-test 10 hand-checked transactions |
| 15 | Rate limits or outages | Slow down, cache, collect early |
| 19 | Selection bias | Rule written before collecting; report it |
| 1, 4 | Too many or too few flags; checks failed | Tune, log, report honestly |
| 13 | Any fraud-accuracy claim creeping in | Remove; restate as unusual-activity ranking |
| 9 | Code won't run for the marker | Pinned requirements; clean-install test |
| 8 | Video broken or too long | Two copies; private-window test |
| 20 | Role confusion | Confirm roles before Phase 1 |

---

## 7. Final checklist

- [ ] D1 worksheet complete and source agreed
- [ ] Snapshot meets Objective 1; manifest reviewed
- [ ] DR-02 unit test passes
- [ ] Baseline, Isolation Forest and LOF score every scorable transaction
- [ ] Four label-free checks reported; method chosen by the rule
- [ ] A2 README runs on a clean machine; A2 submitted
- [ ] Five endpoints working with 400, 404 and 422
- [ ] Three screens, five states, two charts, limitation line on every flag
- [ ] AC-01 to AC-03 and FR-05 pass on every snapshot address
- [ ] Wording check and usability check passed
- [ ] Video 7 minutes or less, tested, two copies
- [ ] A3 report with API docs; minutes and contribution form; submitted
