# RUNTIME_EVIDENCE

Network: GenLayer StudioNet, chain 61999. Source SHA-256: `0ae947019525a9d499bd2b85225053c8eb8e68730f3d9c6ff256a4617c81267a`.
Every row: wallet, method, exact input, expected, tx hash, execution result, post-state from a view.
"EP" is the equivalence-principle output (the label the validators agreed on). A screenshot or a FINALIZED status alone is not evidence of execution.

## Project — TheirCall (through the app)

Project contract: [`0xB89D0Cbfd3572557D7090f85E1e6DEA5c167A3c7`](https://explorer-studio.genlayer.com/address/0xB89D0Cbfd3572557D7090f85E1e6DEA5c167A3c7) — the same frozen source deployed again at its own address (not the Intelligent
Contract address). Deploy tx `0xb5292c6c1d38a53810b703ed4ef49aa537dfafc4e1f6f5957a7f9f7879789bb4` (SUCCESS).

Wallets: author `0x6276095FAEA15108740445ff277fdA8c304657F4` · receiver `0x037f58E33c1Ec8fdA272361E0aAC1e31054a1CDE`.
Every option opened with label `the Buyer`. The matrix uses the G5/R5 pair (see the Intelligent Contract note on G4).

| # | Wallet | Action in the app | Expected | Tx hash | Result | Status |
|---|---|---|---|---|---|---|
| P1 | author | Open G5 (`We decide which of the two routes is taken.`) | `PERFORMER_CHOOSES`, holder AUTHOR, OPEN | `0xcd520fac1a30d7e53692e86e2ad3ff01dd7be97f1cc8e1c3e5a94992372a51b5` | FINALIZED · SUCCESS · EP `PERFORMER_CHOOSES`; card *The choice belongs to the author (0x6276…57f4)* (see note) | PASS |
| P2 | author | Open R5 (`The Buyer decides which of the two routes is taken.`) | `RECEIVER_CHOOSES`, holder RECEIVER, OPEN | `0xe4ebd865a713049f51ca8aa46ec944b069a4d29f9024293ca9eb40edf718da5d` | SUCCESS; card *The choice belongs to the Buyer (0x037f…1cde)* | PASS |
| P3 | receiver | Elect on R5, course `The long route` | ELECTED, `elected_by` = receiver | `0x6362bece8eba2d17fd3a149d873a460e04c20bfeda6effcfed4693db9d0e92e1` | SUCCESS; `elected_by` `0x037f58e33c1ec8fda272361e0aac1e31054a1cde`, ✓ matches the elector wallet | PASS |
| P4 | author | Elect on G5, course `The short route` | ELECTED, `elected_by` = author | `0x03991683cbd5172f9b7e5f3e2105b34b2c3dfa1b21e9428a092a48c4b086dddf` | SUCCESS; `elected_by` `0x6276095faea15108740445ff277fda8c304657f4`, ✓ matches the elector wallet | PASS |
| P5 | receiver | Object on G5, note `We wanted the long route` | objection stored, election unchanged | `0x416789e5e1d64f98fb4a07813750d5efe5273d75ef70be0c838cdd828041781e` | SUCCESS; *objection by the other side: "We wanted the long route"*, course and `elected_by` unchanged | PASS |

Run date 2026-10-04, through the live app with MetaMask. 5 transactions, all as expected.

**Note on P1.** The first build of the app treated a leader receipt that said SUCCESS as final while validators were still
in consensus, read the state too early and showed *"the receipt reports success but the accepted state does not show the
expected change yet"*. The transaction itself was finalized with `PERFORMER_CHOOSES`, and loading the id a moment later
showed the option OPEN with holder AUTHOR. The app was fixed (1.0.1: wait for ACCEPTED, then check the state) before P3;
P2–P5 were reported as success by the app only after the reloaded state showed the change.

Option ids (author `0x6276…57f4`, the same as on the Intelligent Contract because the id hashes author and text):
G5 `480b104d9323573dee6299b4c6b65f773da6a2d81f5e42befd96f929c54ffc34` ·
R5 `451b16ab69de6f520260686b563b4f8cdddb3b886397127a8e21a84e54091f23`.

### Screenshots

| # | File | What it shows |
|---|---|---|
| 1 | `docs/evidence/1-author-side-by-side.png` | author connected, both options OPEN, course typed on both: Elect **enabled** on G5 (*holds the choice here*), **disabled** on R5 with *"The choice here is not yours to make"*; both `elector_wallet` addresses in full |
| 2 | `docs/evidence/2-receiver-side-by-side.png` | the same two cards with the receiver connected: the buttons swapped — G5 disabled with the same sentence, R5 enabled; Withdraw disabled on both with *"Only the author may withdraw this option"* |
| 3 | `docs/evidence/3-author-after-election.png` | author connected after P5: G5 ELECTED "The short route", `elected_by` in full matching `elector_wallet`, the receiver's objection beside it, Withdraw disabled with *"This option has been elected; it can no longer be withdrawn"* |
| — | `docs/evidence/4-receiver-elected-r5.png` | the receiver's view right after P3 |
| — | `docs/evidence/5-author-elected-g5.png` | the author's view right after P4 |
| — | `docs/evidence/6-receiver-objected-g5.png` | the receiver's view right after P5: Object on G5 now disabled with *"This election has already been objected to"* |

The two reverting cells of the matrix were not sent through the app: screenshots 1 and 2 are their proof, and the
Intelligent Contract run below has their transaction hashes (M1, M6).

Calls the app already knows will revert are not sent: the button is disabled with the contract's sentence, and the
proof is a screenshot, not a hash.

## Intelligent Contract — WhoElects

Contract address: [`0xcdc35FbD8EC6453d5d8be228D5976625a40226b0`](https://explorer-studio.genlayer.com/address/0xcdc35FbD8EC6453d5d8be228D5976625a40226b0) · deploy tx `0x15cfd86623ca80234c0d8be91a08d88e6fcd0006a3e0b2d97f08bff5fa71cc0c` (SUCCESS)
Author wallet `0x6276095FAEA15108740445ff277fdA8c304657F4` · receiver wallet `0xAD05365aFe0C2450d4FFBcdbE555b6E5fB7Dfa35` · every option opened with label `the Buyer`.
Run date 2026-10-04, GenLayer Studio, Normal (Full Consensus). 16 transactions in all (after the deploy), listed below in the order they were sent.

### The pair that carries the concept: M1 vs M6

**The same revert sentence, two different wallets.** G5 and R5 differ only in their subject (`We decide` / `The Buyer decides`).

| | on G5 (`holder = AUTHOR`) | on R5 (`holder = RECEIVER`) |
|---|---|---|
| `elect` by the **receiver** `0xAD05365aFe0C2450d4FFBcdbE555b6E5fB7Dfa35` | **M1 reverts** *The choice here is not yours to make* · `0x56ceb05fda51783c7b5fc73e4bfadc4c2936192275156096308afe2528320dad` | **M7 succeeds** · `0xe221daa8d7f2253b443168ff33e92c7cc73d25c5a4c61066ca4f823c4e42a989` |
| `elect` by the **author** `0x6276095FAEA15108740445ff277fdA8c304657F4` | **M2 succeeds** · `0xada31bc9644ca549d6e79a58cdecc8eff778648c5b06adcc00329e199f7d7a6b` | **M6 reverts** *The choice here is not yours to make* · `0xb45528a0bbb356d8a65438a90cff1f3bd731c5cc10ca24e054e98e80099f0e35` |

### Part 1 — semantic labels (5 options opened)

| Case | Text | Expected | Tx hash | EP / consensus | Status |
|---|---|---|---|---|---|
| G4 | Either grade of material is open to us. | `PERFORMER_CHOOSES` | `0x13d7073eb6dcffc1ece90afd2295aee79e72a862bf5588e7f229e999c7d45065` | **`RECEIVER_CHOOSES`**, 3 agree / 2 disagree | **FAIL** (see note) |
| G5 | We decide which of the two routes is taken. | `PERFORMER_CHOOSES` | `0x6c3479f72ca10297880e27745f8ea6b12484d38a670be996ed18e1a841915ea8` | `PERFORMER_CHOOSES`, accepted after one leader rotation | PASS |
| R5 | The Buyer decides which of the two routes is taken. | `RECEIVER_CHOOSES` | `0xacc7e3e41a450dca8e4be65ee1eae34a878e0ea65d47616720d290ee8f1db7e0` | `RECEIVER_CHOOSES`, 3/3 agree | PASS |
| G1 | We may deliver to you in one shipment or in several. | `PERFORMER_CHOOSES` | `0x2dc702d8d4183c0872e0fa71c8bd57f420fe8ae769b6240d2bc412fbc7994a5f` | `PERFORMER_CHOOSES`, 3 agree / 2 disagree | PASS |
| R3 | You may require the work on site or remotely. | `RECEIVER_CHOOSES` | `0xa3ee5ef7536d364e069660bbe8200fbab0bd4342602d7bee8de9f287847b0be9` | `RECEIVER_CHOOSES`, 3/3 agree | PASS |

R4 (`…open to you.`) was not opened: after G4 was misread, the four-cell matrix was moved to the G5/R5 pair.

**Note on G4.** The shortest case, whose only signal is the final pronoun, was read `RECEIVER_CHOOSES` by a 3–2 majority.
The error went in the fail-safe direction (unclear → the receiver holds the choice), which is exactly what the rubric
asks for when the text does not settle it; but it is a misread of the expected label and is recorded as a FAIL. The
rubric was not changed. Every PERFORMER case was decided by a narrow margin, every RECEIVER case 3/3 — see TESTING.

### Part 2 — the four-cell matrix and the exits

| # | Wallet | Method and input | Expected | Tx hash | Result | Status |
|---|---|---|---|---|---|---|
| M1 | receiver | `elect(480b104d…fc34, "the short route")` | revert *The choice here is not yours to make* | `0x56ceb05fda51783c7b5fc73e4bfadc4c2936192275156096308afe2528320dad` | ERROR · `[rollback]` that sentence (validators agree) | PASS (expected revert) |
| M2 | author | `elect(480b104d…fc34, "the short route")` | success, `elected_by` = author | `0xada31bc9644ca549d6e79a58cdecc8eff778648c5b06adcc00329e199f7d7a6b` | ACCEPTED · SUCCESS (5/5 agree) | PASS (read R1) |
| M3 | author | `elect(480b104d…fc34, "the long route")` | revert *This option has already been elected* | `0x62617673d0b80a0af3b72de32261521ea54a1e22e3a8bc207e2df5f3989091ce` | ERROR · `[rollback]` that sentence | PASS (expected revert) |
| M4 | receiver | `object_to_election(480b104d…fc34, "We wanted the long route")` | success, state stays ELECTED | `0x235e0ae7955e961e52689b080332f1b0ed892ba0ee36f09ed70831d603f96e50` | ACCEPTED · SUCCESS (5/5 agree) | PASS (read R1) |
| M5 | author | `withdraw_option(480b104d…fc34)` | revert *This option has been elected; it can no longer be withdrawn* | `0xe4455cd43d29eb16242d01a60a5bb0c15eee1e3928342a79ac714ef42a38c114` | ERROR · `[rollback]` that sentence | PASS (expected revert) |
| M6 | author | `elect(451b16ab…1f23, "the short route")` | revert *The choice here is not yours to make* | `0xb45528a0bbb356d8a65438a90cff1f3bd731c5cc10ca24e054e98e80099f0e35` | FINALIZED · ERROR · `[rollback]` that sentence | PASS (expected revert) |
| M7 | receiver | `elect(451b16ab…1f23, "the long route")` | success, `elected_by` = receiver | `0xe221daa8d7f2253b443168ff33e92c7cc73d25c5a4c61066ca4f823c4e42a989` | ACCEPTED · SUCCESS | PASS (read R2) |
| M8 | author | `withdraw_option(1415f12e…ea29)` (the G1 option) | WITHDRAWN | `0xbb4ddf70be5038e8ba827894d7161a5548a929911d974564c96d406cd1edb188` | ACCEPTED · SUCCESS | PASS |

### Read-back (views, no transaction)

| # | View | Option | Returned |
|---|---|---|---|
| R1 | `get_option` | G5, after M5 | `PERFORMER_CHOOSES`, holder **AUTHOR**, elector_wallet = author, objector_wallet = receiver, **ELECTED**, chosen_course "the short route", **elected_by = author** `0x6276…57f4`, objection_note "We wanted the long route" |
| R2 | `get_option` | R5, after M7 | `RECEIVER_CHOOSES`, holder **RECEIVER**, elector_wallet = receiver, objector_wallet = author, **ELECTED**, chosen_course "the long route", **elected_by = receiver** `0xad05…fa35` |

Option ids (author `0x6276…57f4`):
G4 `33cfd6a38236dcdd1aba71ab2643784f60de6e18e8a75515cc121fdbc6e2f677` ·
G5 `480b104d9323573dee6299b4c6b65f773da6a2d81f5e42befd96f929c54ffc34` ·
R5 `451b16ab69de6f520260686b563b4f8cdddb3b886397127a8e21a84e54091f23` ·
G1 `1415f12e0d4c9c0b7d83eaed7565acf297a71130a65711af576fc855e98bea29` ·
R3 `60ae398b4976c66ac758baa6b3b976884df507e13634ad482ff82ea1a6d4c7a6`

### Other transactions on this contract

| Tx | What happened |
|---|---|
| `0x47d6fff2e3dd0df2ca59f40e275da12f658ace15c2567d7645c5c7ce36d17566` | the receiver elected on G4 — SUCCESS, consistent with the G4 misread (the receiver held the choice there) |
| `0xfe1c83dae287757ff8fbf1b36453917ec65a7679c86cc6845be6852ad226eb75` | the author then tried to elect on G4 — reverted *This option has already been elected* (state is checked before the caller) |
| `0xdd6204e0408ee101dc0db1457faa182a260d07d81a790ddcacb37823e1e89700` | the receiver called `withdraw_option` on G1 by mistake — reverted *Only the author may withdraw this option*; no state changed |
