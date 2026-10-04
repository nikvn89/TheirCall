# CHANGELOG

## 1.0.1 — 2026-10-04

- A leader receipt that says SUCCESS while validators are still proposing, committing, revealing or rotating the
  leader is now shown as *confirmation delayed*, not success; the app waits for ACCEPTED before checking the state.
- *Check again* re-runs the same postcondition check and reloads the option.
- Project run through the app with two wallets: 5 transactions and 3 screenshots, all as expected.

## 1.0.0 — 2026-10-04

- `WhoElects` contract frozen (SHA-256 `0ae947019525a9d499bd2b85225053c8eb8e68730f3d9c6ff256a4617c81267a`).
- Intelligent Contract run on StudioNet with two wallets: 16 transactions. G4 misread as `RECEIVER_CHOOSES` (recorded
  as a FAIL, rubric unchanged); the four-cell matrix was run on G5/R5 and passed.
- TheirCall app: options (load any id without a wallet), open an option, side-by-side view with the same connected
  wallet, holder shown by full address from the view, Elect / Object / Withdraw disabled with the contract's own
  sentences, history, live calldata meter, receipt rule and postcondition checks.
- Project deployment of the same frozen source at its own address.
