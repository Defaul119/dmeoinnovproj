# D1 data-source check

**Run:** 2026-10-07 01:24 UTC · **Command:** `python scripts/d1_check.py`
**Primary source:** Blockstream Esplora (https://blockstream.info/api) · **Fallback:** mempool.space (Esplora-compatible) (https://mempool.space/api)

## Verdict: PASS

| Requirement (gate D1) | Result |
|---|---|
| Transaction ID per transaction | Yes: `txid` |
| Confirmed time | Yes: `status.block_time` (unix seconds, shown in UTC) |
| Address-related amount | Yes: derived from `vout[].value` and `vin[].prevout.value` |
| Direction | Yes: sign of net = received − sent |
| Reproducible retrieval | Yes: `/address/<address>/txs/chain[/<last_seen_txid>]`, 25 per page, newest first |
| Source link per transaction | Yes: https://blockstream.info/tx/&lt;txid&gt; |

## Address inspected

- Address: `bc1qyzcv4kvxwvgtngfdjlmmwdhd3gwlwwzcm9n8qa` (v0_p2wpkh)
- How it was chosen: Block 970267 (000000000000000000007c706cbd48529acfa91a0772d9813820b9f66a74d117): 142 candidate addresses, visited in seeded random order (seed 30049). Checked 3 candidates; picked the first with 50-300 confirmed transactions (59).
- Confirmed transactions: 59 (41 in, 18 out)
- First and last confirmed: 2026-09-04 00:40:43 UTC → 2026-10-07 01:16:27 UTC (33 days)
- Total received 0.00927460 BTC; total sent 0.00908580 BTC
- The address was picked at random from a recent block. Nothing here says who controls it or why it transacts.

## Five transactions with derived amount and direction

| # | Transaction ID | Confirmed (UTC) | Block | Received | Sent | Net | Direction |
|---|---|---|---|---|---|---|---|
| 1 | [`038e9305ff16…35f7b2`](https://blockstream.info/tx/038e9305ff161e9c611bb45348a825cc0c9e0f871336f8733fef9861c735f7b2) | 2026-09-04 00:40:43 UTC | 965403 | 0.00029729 BTC | 0.00000000 BTC | +0.00029729 BTC | in |
| 2 | [`13b77ad17175…e20caa`](https://blockstream.info/tx/13b77ad17175f7d350b246362d742f0a4bcb7625e085ba02ee2833895ae20caa) | 2026-09-09 20:14:20 UTC | 966265 | 0.00026838 BTC | 0.00000000 BTC | +0.00026838 BTC | in |
| 3 | [`0a4d23185704…f623a7`](https://blockstream.info/tx/0a4d23185704d582d6930560bfe7312aef61e0e38913a8a99d757a39a4f623a7) | 2026-10-03 21:11:56 UTC | 969762 | 0.00018856 BTC | 0.00000000 BTC | +0.00018856 BTC | in |
| 4 | [`42cce76fa179…a26587`](https://blockstream.info/tx/42cce76fa17980bb86fdb5a1164fdbaa0cfbd1042e5e95c3790272b6cea26587) | 2026-10-06 10:44:06 UTC | 970163 | 0.00000000 BTC | 0.00037473 BTC | -0.00037473 BTC | out |
| 5 | [`d145bc2541c3…d1fd32`](https://blockstream.info/tx/d145bc2541c3c4c0b8b481f4c0cdd64d9c8bc5b5662953bad095975bc0d1fd32) | 2026-10-07 01:16:27 UTC | 970267 | 0.00018880 BTC | 0.00000000 BTC | +0.00018880 BTC | in |

Full transaction IDs:

1. `038e9305ff161e9c611bb45348a825cc0c9e0f871336f8733fef9861c735f7b2`
2. `13b77ad17175f7d350b246362d742f0a4bcb7625e085ba02ee2833895ae20caa`
3. `0a4d23185704d582d6930560bfe7312aef61e0e38913a8a99d757a39a4f623a7`
4. `42cce76fa17980bb86fdb5a1164fdbaa0cfbd1042e5e95c3790272b6cea26587`
5. `d145bc2541c3c4c0b8b481f4c0cdd64d9c8bc5b5662953bad095975bc0d1fd32`

**Hand check (a team member, not the script):** open transaction 1 on the block explorer, find the
address in the inputs and outputs, and confirm the received and sent values above. Record who checked
and when: ____________________

## Automated checks

| Check | Result | Detail |
|---|---|---|
| History is complete (count matches the API's chain_stats.tx_count) | PASS | 59 fetched vs 59 reported |
| No duplicate transaction IDs | PASS | 59 unique of 59 |
| Every transaction is confirmed and has a block time | PASS | status.confirmed and status.block_time present |
| History is ordered newest first | PASS | block heights never increase down the list |
| Paging: every page except the last holds 25 | PASS | 3 pages, sizes [25, 25, 9] |
| Every transaction involves the address (received or sent > 0) | PASS | derived from vout and vin.prevout |
| Sum of received equals the API's funded_txo_sum | PASS | 0.00927460 BTC vs 0.00927460 BTC |
| Sum of sent equals the API's spent_txo_sum | PASS | 0.00908580 BTC vs 0.00908580 BTC |
| Fallback source returns the same times and amounts | PASS | 25 transactions on both sources' first page; 0 differ in time or amount |

The two sum checks are the strongest evidence: adding up the derived amounts over the whole
history reproduces the totals the API computes independently, so the received/sent rule is right
for this address (Risk 18).

## Paging, limits and errors

- History endpoint returns 25 confirmed transactions per page, newest first. The next page is
  requested with the last transaction ID seen, e.g. `/address/<address>/txs/chain/<last_txid>`.
- History pages fetched: 3. A page shorter than 25 marks the end.
- Requests to Blockstream Esplora: 13 (HTTP 429: 0, 5xx: 0, retries: 0, median latency 719 ms).
- Requests to the fallback: 2 (HTTP 429: 0).
- Pace: one request every 0.5 s, exponential back-off on 429/5xx, honouring `Retry-After`.
- Esplora caps how much history it will serve for very busy addresses; the snapshot rule already
  excludes addresses above 1000 transactions, and the client caps at 1000.

## Fields used

`txid`, `status.confirmed`, `status.block_height`, `status.block_time`, `vout[].scriptpubkey_address`,
`vout[].value`, `vin[].prevout.scriptpubkey_address`, `vin[].prevout.value`; and from `/address/<address>`:
`chain_stats.tx_count`, `funded_txo_sum`, `spent_txo_sum` (used only for the checks above).

## Access and use terms

- API documentation: https://github.com/Blockstream/esplora/blob/master/API.md. It states no rate limits or terms.
- Blockstream's general Terms of Use (v1.0, 16 Jan 2018, https://blockstream.com/terms/) cover its
  website and services but do not mention the Explorer or its API.
- Third-party comparisons report the free public API allows roughly 50 requests per second. This project
  sends at most 2 per second and calls the API only offline, once, to build the snapshot.
- **Team action:** record in the manifest that no explicit API terms were found, and confirm with the
  tutor that using public blockchain data this way is acceptable.

## Raw evidence

Unchanged API responses are in `data/d1/bc1qyzcv4kvxwvgtngfdjlmmwdhd3gwlwwzcm9n8qa/`. Rerun with `python scripts/d1_check.py --address bc1qyzcv4kvxwvgtngfdjlmmwdhd3gwlwwzcm9n8qa` to reproduce (new blocks may add transactions).
