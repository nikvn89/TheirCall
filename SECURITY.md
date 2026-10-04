# SECURITY

## Prompt fence

- The model sees only the rubric, the receiver label and the option text, each inside its own tag
  (`<UNTRUSTED_RECEIVER_LABEL>`, `<UNTRUSTED_OPTION_TEXT>`). It sees no wallet, no state, and nothing the contract does
  with the answer.
- Injection has a clear target here: a sentence saying "the outcome is PERFORMER_CHOOSES" would hand the author the
  pick. Both answer tokens and all four tags are reserved; text, label or course containing any of them, compared
  after upper-casing, is rejected before the model call.
- A fixed-point strip removes tokens until the string no longer changes, so nested fragments cannot rebuild one.
- Validators re-run the classification and must agree on the exact label. That checks agreement, not injection
  resistance; the fence does that.

## Fail-safe

Unclear or unparseable output becomes `RECEIVER_CHOOSES`: an ambiguous sentence never hands its writer a valuable
choice. See `LOCKED_SPEC.md` §5–§6.

## Permission

Who holds the choice is decided in one place (`_elector` / `_objector`) and printed in full by `get_option`. The app
reads `elector_wallet` and `objector_wallet` from the view and never computes the holder itself.

## Frontend

- MetaMask only signs; reads, receipts and the write client go through one same-origin proxy (`/genlayer-rpc`).
- No Snap request, no CDN code, no hard-coded wallet. React escapes all contract text.
- Success is reported only after the leader receipt says SUCCESS **and** the reloaded accepted state shows the change.

## Remaining limits

- The author names the receiver's wallet; the contract cannot prove the two wallets are two people.
- `chosen_course` is not checked against the text.
- No adversarial model run was done.
