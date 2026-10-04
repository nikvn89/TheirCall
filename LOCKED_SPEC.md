# LOCKED_SPEC — WhoElects

Frozen source: `contracts/WhoElects.py`, SHA-256 `0ae947019525a9d499bd2b85225053c8eb8e68730f3d9c6ff256a4617c81267a`.
Header: exactly the four lines `# v0.2.16`, the py-genlayer `Depends` line, a blank line, `from genlayer import *`.

## 1 · The question, and what the answer controls

A text puts two courses on the table. **Does the pick belong to the side that must perform (the author) or to the
side that receives (the receiver)?** "We may deliver to you in one shipment or in several" and "The Buyer may call
for delivery in one shipment or in several" describe the same two courses and give the pick to opposite sides.

The verdict decides **one address**: which wallet may call `elect`.

| | `PERFORMER_CHOOSES` (holder `AUTHOR`) | `RECEIVER_CHOOSES` (holder `RECEIVER`) |
|---|---|---|
| `elect` by the author | succeeds | **reverts** |
| `elect` by the receiver | **reverts** | succeeds |
| `object_to_election` | receiver | author |
| `withdraw_option` | author, only before an election | author, only before an election |
| after `elect` | `ELECTED`, once, permanent | `ELECTED`, once, permanent |

Novelty, stated plainly: the verdict decides **which wallet holds a single power of choice**. Both wallets are
proper parties to the same record and both keep a method of their own (`elect` for the holder,
`object_to_election` for the other side). Nobody is shut out of the record; the verdict decides whose power it is,
not who may enter.

### The tooth — four cells, two wallets, one method

```text
AUTHOR-holder option     elect by author    -> OK
AUTHOR-holder option     elect by receiver  -> REVERT "The choice here is not yours to make"
RECEIVER-holder option   elect by receiver  -> OK
RECEIVER-holder option   elect by author    -> REVERT "The choice here is not yours to make"
```

All four cells must run. Two OK cells prove nothing alone; neither do two reverts. The proof is the full matrix: the
same wallet succeeds on one option and is blocked on the other, and the only difference between the options is the
sentence.

## 2 · Enums and state

- Outcome (model): `PERFORMER_CHOOSES` | `RECEIVER_CHOOSES`.
- Holder (stored once at open, immutable): `AUTHOR` | `RECEIVER`.
- State: `OPEN` → `ELECTED` or `OPEN` → `WITHDRAWN`; both terminal.
- One storage map `options: TreeMap[str, OptionRecord]` with `author, receiver_wallet, receiver_label, text, holder,
  state, chosen_course, elected_by, objection_note`.

**The permission rule lives in exactly two functions:** `_elector(record)` returns the author when `holder ==
AUTHOR`, otherwise `receiver_wallet`; `_objector(record)` returns the other one. `elect`, `object_to_election` and
`get_option` all call these; no other code decides who holds the choice.

## 3 · Limits and ids

| Constant | Value | Why |
|---|---|---|
| `MAX_TEXT_LENGTH` | 600 | contract cap; only about 168 characters fit the 255-byte calldata limit |
| `MAX_LABEL_LENGTH` | 80 | |
| `MAX_COURSE_LENGTH` | 60 | **calldata ceiling**, not meaning: id + 60 chars = 153 bytes |
| `MAX_NOTE_LENGTH` | 60 | calldata ceiling: id + 60 chars = 167 bytes |

Option id = `keccak256("WHO_ELECTS:OPTION:V1|" + author_lower + "|" + len(normalized_text) + "|" + normalized_text)`,
where `normalized_text = " ".join(text.split())`. The text is part of the id, so the same author cannot reopen the
same sentence to ask for another label. The receiver wallet is lower-cased and format-checked.

## 4 · Methods and check order

| Method | Order of checks (first failing check wins) |
|---|---|
| `open_option(receiver_wallet, receiver_label, text)` | wallet → label → text → reserved token → receiver ≠ author → duplicate id → model call |
| `elect(option_id_hex, chosen_course)` | unknown id → **ELECTED → WITHDRAWN** → caller = `_elector` → course (empty, length, reserved) |
| `object_to_election(option_id_hex, note)` | unknown id → state is ELECTED → caller = `_objector` → not yet objected → note |
| `withdraw_option(option_id_hex)` | unknown id → caller = author → not ELECTED → not WITHDRAWN |

State is checked before the caller in `elect`: a wallet that does not hold the choice, calling an option already
elected, gets *"This option has already been elected"*, not *"The choice here is not yours to make"*. The app mirrors
every order exactly.

The 22 revert sentences are listed in `src/lib/rules.ts` and must equal the contract's set (test in
`tests/js/rules.test.ts`).

Views: `get_option` (all fields plus `outcome`, `elector_wallet`, `objector_wallet`; unknown id → `"{}"`),
`get_rubric`, `get_limits`. There is **no** `preview_*`, `classify_*` or `dry_run_*` view: a try-before view would
turn the mechanism into free off-chain fishing, and here the author has one branch it plainly wants.

## 5 · Fail-safe direction: `RECEIVER_CHOOSES`

Broken, unparseable or unknown model output becomes `RECEIVER_CHOOSES`. The question is which wrong guess harms the
side that did **not** write the text:

- a wrong `PERFORMER_CHOOSES` gives the author the pick although the words give it to the receiver. The author will
  pick what is cheap for itself, and the receiver is left with one objection next to a final choice. The author
  profits from its own ambiguity — there is a victim;
- a wrong `RECEIVER_CHOOSES` gives the receiver the pick although it was the author's. The author loses a right
  through its own wording; the receiver loses nothing — no outside victim.

So the safe direction hands the pick to the receiver. Ambiguity must not become a reward for the writer, and here the
choice has direct economic value.

## 6 · "Why not polish the wording until it gets the branch the author wants?"

Here the author **plainly wants** `PERFORMER_CHOOSES`. The two branches are **not** balanced, so the answer has to be
a mechanism, in three layers:

1. **The fail-safe runs against the author's wish** (§5). Unclear polishing loses the pick; ambiguity is a cost, not
   a strategy.
2. **To get `PERFORMER_CHOOSES` the author must write a sentence anyone reads as its own pick** — and that sentence is
   what the receiver reads before agreeing. The price of the pick is clarity, which is exactly what the receiver needs.
3. **The text is part of the id** (§3). The same sentence cannot be reopened for another label; another try must be a
   genuinely different sentence, and it stays on chain next to the label it received.

## 7 · Rubric

Used verbatim from the contract (`get_rubric`). It defines the two roles, asks "whose say-so settles which course is
followed", tells the model not to judge fairness or supply what the text leaves unsaid, and ends the semantic rules
with "Where the text does not settle whose pick it is, return RECEIVER_CHOOSES." It contains no word that separates
the test classes (`WHOELECTS_KILLSET_CHECK.py`).

## 8 · Prompt fence

Label and text go in `<UNTRUSTED_RECEIVER_LABEL>` and `<UNTRUSTED_OPTION_TEXT>`. Those four tags and both answer
tokens are reserved: text, label or course containing one (compared after upper-casing) is rejected, and the prompt
copy is stripped to a fixed point. The model never sees a wallet, the state, or what the contract does with the
answer. Validators re-run the classification and must agree on the exact label.
