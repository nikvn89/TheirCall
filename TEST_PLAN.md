# TEST_PLAN

## Semantic cases (receiver label `the Buyer`; the author is the side that must perform)

| Case | Text | Expected |
|---|---|---|
| G1 | We may deliver to you in one shipment or in several. | PERFORMER_CHOOSES |
| G2 | Payment may be made by transfer or by card, as we find convenient. | PERFORMER_CHOOSES |
| G3 | The work may be carried out on site or remotely, at our option. | PERFORMER_CHOOSES |
| G4 | Either grade of material is open to us. | PERFORMER_CHOOSES |
| G5 | We decide which of the two routes is taken. | PERFORMER_CHOOSES |
| R1 | The Buyer may call for delivery in one shipment or in several. | RECEIVER_CHOOSES |
| R2 | Payment may be taken by transfer or by card, whichever the Buyer prefers. | RECEIVER_CHOOSES |
| R3 | You may require the work on site or remotely. | RECEIVER_CHOOSES |
| R4 | Either grade of material is open to you. | RECEIVER_CHOOSES |
| R5 | The Buyer decides which of the two routes is taken. | RECEIVER_CHOOSES |

Adversarial pairs — same surface, opposite label:

| Pair | Shared surface | Why opposite |
|---|---|---|
| **G4 / R4** | identical except the last word | `us` / `you` |
| **G5 / R5** | identical except the subject | `We decide` / `The Buyer decides` |
| **G1 / R3** | both speak to the other side in the second person | G1 is still the author's pick (`deliver to you`) |
| G2 / R2 | the same two payment methods | the closing phrase names who picks |
| G3 / R1 | no pronoun as subject in either | `at our option` / `The Buyer may call for` |

Classification:

- **Kill tests** (the rubric does not hint at the mechanism): G4/R4, G5/R5, G1/R3, G3/R1.
- **Definition check**: G2/R2 — `as we find convenient` and `whichever the Buyer prefers` follow directly from the
  rubric's definition.

`python3 WHOELECTS_KILLSET_CHECK.py contracts/WhoElects.py` → `NO LEAK` and `PASS`. The word `you` appears in both
classes (G1, R3, R4), so no token filter can separate them.

On-chain, the four-cell matrix was run on the G5/R5 pair after G4 was misread (`RUNTIME_EVIDENCE.md`).

## Deterministic cases (automated, `tests/contract/test_whoelects.py`)

| Case | Test |
|---|---|
| `_elector` / `_objector` for both holders, always different | `test_elector_and_objector_for_both_holders` |
| `get_option` reports elector/objector from the same functions | `test_view_reports_elector_and_objector_from_the_same_functions` |
| the four-cell matrix | `test_four_cell_matrix` |
| outcome → holder at open | `test_open_records_outcome_and_holder` |
| the on-chain table replayed in order | `test_runtime_table_in_order` |
| state before caller in `elect` | `test_elect_checks_state_before_caller` |
| course checked after caller | `test_course_checked_after_caller` |
| an objection changes nothing else | `test_objection_changes_nothing_else` |
| a third wallet is refused by `elect`, `object_to_election`, `withdraw_option` | `test_third_wallet_is_refused_everywhere` |
| whitespace variants share one id; another author gets a new id | `test_whitespace_variants_share_one_id`, `test_same_text_other_author_is_a_new_option` |
| id formula matches the app's | `test_local_id_formula_matches_contract`, `test_vectors_match_contract` |
| receiver wallet case-normalized | `test_receiver_wallet_case_normalized` |
| fail-safe on broken or unknown output | `test_fail_safe_on_unparseable_output`, `test_fail_safe_on_unknown_label` |
| fenced JSON parsed | `test_fenced_json_output_is_parsed` |
| validator rejects disagreement and bad shapes | `test_validator_rejects_disagreement_and_bad_shapes` |
| prompt never sees wallets; fence strip is a fixed point | `test_prompt_never_sees_wallets`, `test_fence_strip_is_fixed_point` |
| views on unknown ids, limits, rubric | `test_views_on_unknown_ids`, `test_limits_and_rubric` |
| no forbidden constructs (preview view, money, clock, web) | `test_no_forbidden_constructs_in_source` |
| each of the 22 revert sentences, verbatim, once | `test_revert_*` (22 tests) and `test_every_revert_string_has_exactly_one_dedicated_test` |

## Frontend (automated, `tests/js`)

Revert set equal to the contract's; `_elector`/`_objector` parity run against the contract source in Python; every
button's check order; postconditions; Python-exact strip/length; id vectors; receipt leader rule; calldata rows;
source hash; docs cross-check; no inferred holder and no seed data in the app.
