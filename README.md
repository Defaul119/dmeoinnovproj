# Bitcoin Address Activity Explorer

COS30049 Computing Technology Innovation Project · group HCMC_COS30049.1_4

A research tool for one Bitcoin address at a time. It shows the address's daily activity, lists each
day's transactions, and marks the transactions that are unusual **compared with that address's own
earlier activity**, explaining why. Unusual activity requires investigation; it does not indicate
wrongdoing.

**Current state:** the A1 prototype runs on illustrative data, and the D1 check confirms the real
data source works. See [WALKTHROUGH.md](WALKTHROUGH.md) for the full guide to the project.

## Requirements

- Node.js 22 or later (tested with 24)
- Python 3.12 (the D1 check and its tests use only the standard library)
- Microsoft Edge or Google Chrome, only for `npm run screenshots`

## Run the prototype

```bash
cd frontend
npm install
npm run dev          # open http://localhost:5173
```

The prototype labels itself as illustrative. The **Prototype tools** button (bottom right) can slow
responses, simulate a network failure and jump to each state.

## Test

```bash
cd frontend
npm test             # 66 tests: validation, scoring (DR-02), API contract, AC-01–AC-03, FR-05 states, wording
npm run typecheck

cd ..
python -m unittest discover -s tests -t . -v     # 9 tests: amount and direction rule, real D1 data
```

## D1 data-source check

```bash
python scripts/d1_check.py                     # picks an active address from a recent block
python scripts/d1_check.py --address <addr>    # or checks a given one
```

This writes the worksheet to `reports/d1-check.md` and the unchanged API responses to `data/d1/`. It
sends about 15 requests, with a pause between each.

## Screenshots for the report

```bash
cd frontend
npm run dev              # terminal 1
npm run screenshots      # terminal 2: writes docs/screenshots/, and fails if any page scrolls sideways
```

## Layout

| Path | What it holds |
|---|---|
| `config/settings.json` | Every threshold, shared by the Python pipeline and the front end |
| `explorer/` | Python package: settings loader, Esplora client, amount and direction rule |
| `scripts/` | One command per pipeline step (so far: `d1_check.py`) |
| `tests/` | Python unit tests |
| `data/d1/` | Raw responses from the D1 check |
| `reports/` | D1 worksheet |
| `frontend/` | React + TypeScript app, its mock API and its tests |
| `docs/` | Usability walkthrough kit, screenshots |
