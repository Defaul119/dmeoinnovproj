# Usability walkthrough kit (A1, report §10)

The report commits to a walkthrough of the prototype with **at least two people who did not design it**.
Each person does four tasks, and at least two must explain a flag as "needs investigation", not
"wrongdoing" (NFR-01 pass condition 4). This file is the facilitator's script and recording sheet.
**Fill in results only from real sessions; never invent them.**

## Before the session

1. Start the prototype: `cd frontend`, `npm run dev`, then open http://localhost:5173.
2. Leave **Prototype tools** (bottom-right button) closed. Participants don't need it. Response delay stays at the default 0.6 s, so they see real loading states.
3. Print or copy the two test inputs below onto a card. Don't let participants see this file.
4. Ask the participant's consent to take notes (and to record the screen, if you will). Write down the date, time and device.

| Test input | What it is |
|---|---|
| `bc1qr4n2l7zp3tf3cedw7aqgn5smvjklv0ugk90y57` | A valid address that isn't in the snapshot (task 4) |
| `bc1qytpc4frzkxt0vwsnvt9kfcrers8k5pejunwjuq` | A supported address with its last character mistyped (optional extra task) |

## Script (read out, keep it neutral)

> "This is an early prototype of a tool for researchers who study one Bitcoin address at a time.
> All the data is invented. I'm testing the design, not you, so there are no wrong answers.
> Please think aloud as you go. I won't help during the tasks, but I'll answer questions afterwards."

| # | Say this | Success looks like | Watch for |
|---|---|---|---|
| 1 | "You are researching the address starting **bc1qytpc4frz**. Open its activity." | Reaches the timeline and can say which dates it covers (AC-01). | Do they look up the address or find it in the list? Do they notice the date range and source line? |
| 2 | "Find a day when something unusual happened, and open it." | Opens a day marked ▲ / orange, from the chart or the "Days with unusual transactions" list. | Do they understand the orange bars and triangles? Do they find the list? |
| 3 | "Find the transaction that stands out on that day. In your own words, what does the marker tell you?" | Opens the flagged transaction and explains it as "different from this address's usual activity / worth a closer look", **not** "this is wrong / criminal" (NFR-01 condition 4). | Do they read "Why this transaction stands out"? Do they notice the limitation line? Is the z-score confusing? |
| 4 | Hand over the card. "Look up this address. What happens, and what would you do next?" | Understands the address isn't covered, then picks a suggested address or clears the box (AC-02). | Do they mistake "not in the snapshot" for "invalid"? Do they find the next step? |

Optional extra: "Now look up this one" (the typo card). Success: they realise it's mistyped.

## Debrief questions

1. "What does 'unusual' mean in this tool?"
2. "If a transaction is marked unusual, would you conclude the address owner did something wrong? Why?" (Expected: no.)
3. "What was confusing or slow?"
4. "Was anything missing that you expected to see?"

## Recording sheet (one per participant)

Participant: ______ (role or initials only) · Date and time: ______ · Device and width: ______ · Facilitator: ______

| Task | Completed? (yes / with help / no) | Time | Errors or wrong turns | Quotes |
|---|---|---|---|---|
| 1 Open address | | | | |
| 2 Find unusual day | | | | |
| 3 Explain the flag | | | | |
| 4 Recover from unsupported | | | | |

Their answer to "what does unusual mean?": ______________________________

NFR-01 condition 4 met (said "needs investigation", not "wrongdoing")? yes / no

## Issues and revisions (goes into report §10)

Severity uses Nielsen's scale: 0 not a problem · 1 cosmetic · 2 minor · 3 major · 4 catastrophe.
The plan says every severity 3–4 issue is fixed before submission.

| # | Issue observed | Task | Participants affected | Severity | Revision made | Re-checked? |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |

## Screenshots for the report

`docs/screenshots/` holds every screen and state at desktop, tablet and mobile widths, produced by
`npm run screenshots` (see the README). Replace Figure 3 with 05-timeline, 07/08 and 01, and use 02–04, 06,
09 and 10 to show the five feedback states.
