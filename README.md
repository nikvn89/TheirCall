TheirCall does not ask who must act first, and it does not check an action against a policy. Both wallets are proper parties to the record and each has a method of its own. It asks one thing: when a sentence puts two courses on the table, whose say-so settles which course is followed — and it hands that single power to exactly one of the two addresses, for good.

<p><img src="logo.png" alt="TheirCall logo" width="96"></p>

# TheirCall

A GenLayer dApp on StudioNet (chain 61999) built on the Intelligent Contract `WhoElects`
(`contracts/WhoElects.py`, py-genlayer v0.2, `# v0.2.16`).

**The contract holds no money, moves nothing and enforces nothing off chain.** It records which wallet holds the
choice, what that wallet elected, and whether the other side objected.

| | |
|---|---|
| Live app | deployed on Vercel from this repository |
| Project contract | [`0xB89D0Cbfd3572557D7090f85E1e6DEA5c167A3c7`](https://explorer-studio.genlayer.com/address/0xB89D0Cbfd3572557D7090f85E1e6DEA5c167A3c7) |
| Intelligent Contract (separate submission) | `0xcdc35FbD8EC6453d5d8be228D5976625a40226b0` |
| Source SHA-256 | `0ae947019525a9d499bd2b85225053c8eb8e68730f3d9c6ff256a4617c81267a` (`SOURCE_SHA256.txt`) |
| Evidence | `RUNTIME_EVIDENCE.md` · `TESTING.md` |

## What it does

An author opens an option naming a receiver wallet and a sentence that puts two courses on the table. GenLayer
validators read it **once**:

- **`PERFORMER_CHOOSES`** → holder `AUTHOR`: only the author may `elect`; only the receiver may object;
- **`RECEIVER_CHOOSES`** → holder `RECEIVER`: only the receiver may `elect`; only the author may object.

`elect` works once and is permanent. The other side may record one objection next to the choice; it changes nothing
else. The author may withdraw an option only while nobody has elected. Unclear model output fails safe to
`RECEIVER_CHOOSES`: ambiguity must not hand the pick to the side that wrote the sentence.

The same method, the same wallet, two options — one call succeeds, the other reverts with *"The choice here is not
yours to make"*. The only difference between the two options is the sentence.

## What the app shows

- **The holder, by full address**, on every option from the first read: *The choice belongs to the author (0x…)* or
  *The choice belongs to the Buyer (0x…)*, with `elector_wallet` and `objector_wallet` exactly as `get_option` returns
  them. The app never works out the holder itself.
- **The connected wallet's role** — `author`, `receiver` or `neither side` — and whether it holds the choice here.
- **Elect**, **Object** and **Withdraw** follow the contract's exact check order and, when disabled, show the
  contract's own sentence for the step that blocked it.
- After an election: the course, `elected_by` in full, a check that it equals the elector wallet, and the objection.
- **Side by side**: two options seen by the same wallet — one Elect enabled, one disabled. Switch wallets and they swap.
- The id of a new option is computed locally and shown before sending; the app checks the accepted state first and
  never sends a duplicate. Success is reported only after the leader receipt says SUCCESS and the reloaded state shows
  the change. A live meter blocks calldata over 255 bytes.

## How to try it

Open your own options — nothing here depends on shared state. You need **two wallets of your own** on GenLayer
StudioNet to see the whole matrix; one wallet is enough to open options, elect where you hold the choice, see the
disabled buttons and withdraw.

1. Connect your **first wallet** (author). On *Open an option*, enter your **second wallet** as receiver, label
   `the Buyer`, and `We decide which of the two routes is taken.` Open it, then open
   `The Buyer decides which of the two routes is taken.` Copy both ids.
2. Open *Side by side* with both ids and type a course on both cards. As the author: Elect is **enabled** on the
   first and **disabled** on the second with *"The choice here is not yours to make"*.
3. Switch MetaMask to your **second wallet**. The two buttons swap. The two screens differ only in the connected
   wallet — that is the four-cell matrix.
4. As the receiver, elect on the second option. Switch back to the author and elect on the first. Switch to the
   receiver and object on the first. As the author, Withdraw on the first is now disabled with *"This option has been
   elected; it can no longer be withdrawn"*.

## Methods

| Write | Who | Notes |
|---|---|---|
| `open_option(receiver_wallet, receiver_label, text)` | author | the only model call |
| `elect(option_id_hex, chosen_course)` | `elector_wallet` | state → caller → course; once, permanent |
| `object_to_election(option_id_hex, note)` | `objector_wallet` | only after an election; once; changes nothing else |
| `withdraw_option(option_id_hex)` | author | only before anyone elected |

Views: `get_option` (every field, plus `outcome`, `elector_wallet`, `objector_wallet`), `get_rubric`, `get_limits`.
Unknown id → `"{}"`. No preview or dry-run view. Full rules: `LOCKED_SPEC.md`.

## Run locally

```
npm ci
npm run dev          # http://localhost:5173, proxied to StudioNet
npm test             # frontend logic tests
npm run build
python3 -m pytest tests/contract -q    # contract tests in GenLayer Direct Mode
```

`VITE_CONTRACT_ADDRESS` overrides the Project address in `src/lib/config.ts`.

## Honest limitation

1. **The contract holds no money, moves nothing and enforces nothing off chain.** It only records which wallet holds
   the choice and which course that wallet elected.
2. **`chosen_course` is the holder's own statement.** The contract does not check that it is one of the two courses
   in the text — it cannot, because the courses exist only in natural language. The value is that *who may press the
   button* is frozen before any choice is made, plus the other side's objection.
3. **One branch is plainly better for the author.** `PERFORMER_CHOOSES` gives the writer the pick, so the two
   branches are not balanced. The safeguard is a mechanism: unclear text fails to the receiver; to get the pick the
   author must write a sentence anyone can read as theirs — which the receiver reads before agreeing; and the text is
   part of the id, so the same sentence cannot be reopened to fish for another label.
4. **A wrong `PERFORMER_CHOOSES` is the main risk** — a choice with economic value moves to the author. The nets: the
   fail-safe direction, one objection per election, and `elector_wallet` shown in full from the first transaction.
   On StudioNet one `PERFORMER_CHOOSES` case (G4, the pronoun-only sentence) was read `RECEIVER_CHOOSES`, and every
   `PERFORMER_CHOOSES` case was decided by a narrow margin: the model leans to the receiver (`RUNTIME_EVIDENCE.md`).
5. **The author declares the receiver's wallet.** `open_option` blocks the author's own wallet, but a second wallet is
   cheap — and here that matters most: if both wallets belong to one person, `RECEIVER_CHOOSES` protects nobody. The
   contract cannot prove that the two wallets are two people. This is the largest limitation of the project.
6. **`MAX_COURSE_LENGTH = 60` is a hard ceiling set by calldata, not by meaning.** A course that needs more than 60
   characters cannot be recorded.

The contract accepts 600 characters of text, but `open_option` at the caps measures 761 bytes of calldata; only
sentences up to about 168 characters fit the 255-byte limit. Longer ones would be refused by the RPC, and the app
blocks them.

License: MIT.
