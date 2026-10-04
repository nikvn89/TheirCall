# TESTING

```
COMPILE PASS ≠ RUNTIME PASS
SUBMITTED ≠ ACCEPTED ≠ FINALIZED ≠ EXECUTION SUCCESS ≠ POSTCONDITION PASS
```

## Run automatically (offline, also in CI)

| Gate | Command | Result |
|---|---|---|
| kill-set + rubric overlap | `python3 WHOELECTS_KILLSET_CHECK.py contracts/WhoElects.py` | NO LEAK + PASS, rc 0 |
| genvm-linter (AST, offline) | `python3 -m genvm_linter.cli lint contracts/WhoElects.py` | passed (3 checks), rc 0 |
| genvm-linter schema / typecheck | `python3 -m genvm_linter.cli schema` / `typecheck` | 7 methods (4 write, 3 view); no type errors (run once, not in CI) |
| contract tests, Direct Mode | `python3 -m pytest tests/contract -q` | 46 passed |
| frontend logic tests | `npm test` | 44 passed |
| build | `npm run build` (`tsc -b && vite build`) | rc 0 |
| source hash | `npm run verify:source` | PASS |
| calldata table | `node tools/calldata-bytes.mjs` | every hard-block row ≤ 255 bytes |

`lint` is used, not `check`: `check` calls the network and exits 1 in CI.

Twelve deliberate faults were injected into the contract one at a time (the elector fixed to the author, the objector
fixed, the caller check skipped, the check order reversed, withdraw allowed after election, `elected_by` forged, the
holder fixed, the fail-safe flipped, an objection that reopens the option, a second objection allowed, an answer token
removed from the fence, withdraw open to anyone); each was caught by a contract test.

The app screens were also rendered against a local mock of the RPC with the two Project wallets, on both options,
before and after the elections, at desktop and phone width.

### Calldata size (offline, encoded exactly as genlayer-js 1.1.8 `writeContract`)

| Row | Bytes |
|---|---|
| open_option G1 / G2 / G3 / G4 / G5 | 139 / 153 / 150 / 126 / 130 |
| open_option R1 / R2 / R3 / R4 / R5 | 149 / 160 / 132 / 127 / 138 |
| elect (id + 60-char course) | 153 |
| object_to_election (id + 60-char note) | 167 |
| withdraw_option (id) | 101 |
| open_option at the caps (label 80 + text 600) — measure only | 761, over the limit |

Longest ASCII option that fits with label `the Buyer`: **168 characters**. The app shows a live meter and blocks
sending above 255 bytes.

### Calldata on the real RPC

`node tools/probe-calldata.mjs <address>` sends each row as a `gen_call` write simulation (no wallet, no transaction,
no model call). StudioNet's `gen_call` answers with a generic "execution failed" rather than the revert sentence, so a
row counts as decoded when the node reports execution (or returns the sentence) and fails only on a network error or
no answer. CI runs it for the addresses in `deployments.json` (job `probe`). The `gen_call` path does not reproduce
the 255-byte cliff of the transaction path; that limit is enforced by the offline table and the app's meter.

## Run by hand on StudioNet

Only what needs a real wallet, a real signature or a human eye. Results and hashes: `RUNTIME_EVIDENCE.md`.

- Intelligent Contract: deploy, then 16 transactions with two wallets. Labels: G5, R5, G1, R3 as expected; **G4 was
  read `RECEIVER_CHOOSES` (FAIL)**. The four-cell matrix (on G5/R5), once-only, objection, no-undo and withdraw all
  passed.
- Project: the same frozen source deployed again at its own address, then 5 transactions through the app and
  3 screenshots. All passed.

A call the app already knows will revert is **not** sent — the button is disabled with the contract's sentence — so
its proof in the Project run is a screenshot, not a hash.

## Agreement margins

Every `PERFORMER_CHOOSES` case was close (G4 misread 3–2, G5 accepted after a leader rotation, G1 3–2); both
`RECEIVER_CHOOSES` cases were 3/3. The rubric's "where the text does not settle it, return RECEIVER_CHOOSES" pulls
the model toward the receiver when a sentence names the author only through a pronoun. The rubric was not changed
after the run.

## Consensus behaviour

The model is called once, in `open_option`. Validators re-run the classification and must agree on the exact label;
a disagreement rotates the leader or reverts the transaction (fail-closed): no option is stored with a label the
validators did not agree on.

## What this run does NOT prove

- The Direct Mode tests use **mocked** model answers. They prove the deterministic code paths, not what the model
  returns. Only RUNTIME_EVIDENCE proves labels.
- One of the five labels sent was wrong (G4); five of the ten cases were not sent; label stability across repeated
  runs or validator sets is not measured.
- Sentences longer than about 168 characters (the contract allows 600) are not proven on StudioNet.
- Prompt-injection resistance rests on the fence and the reserved-token check; no adversarial model run was done.
- Nothing proves that the elected course is one of the two courses in the text, or that the two wallets are two people.
