import { test } from "node:test";
import assert from "node:assert/strict";
import { electVerified, objectVerified, openVerified, withdrawVerified } from "../../src/lib/verify.ts";
import type { Option } from "../../src/lib/types.ts";

const ME = "0x" + "a".repeat(40);
const RECEIVER = "0x" + "b".repeat(40);
const STRANGER = "0x" + "c".repeat(40);
const ID = "1".repeat(64);
const mine = (o: Partial<Option> = {}): Option => ({ option_id: ID, author: ME, receiver_wallet: RECEIVER, receiver_label: "the Buyer",
  text: "We decide.", outcome: "PERFORMER_CHOOSES", holder: "AUTHOR", elector_wallet: ME, objector_wallet: RECEIVER,
  state: "OPEN", chosen_course: "", elected_by: "", objection_note: "", ...o });
const theirs = (o: Partial<Option> = {}) => mine({ outcome: "RECEIVER_CHOOSES", holder: "RECEIVER", elector_wallet: RECEIVER, objector_wallet: ME, ...o });
const sub = { me: ME, receiverWallet: RECEIVER, label: " the Buyer ", text: " We decide. ", optionId: ID };

test("open postcondition: either holder, but outcome/holder/elector/objector must agree", () => {
  assert.equal(openVerified(mine(), sub), true);
  assert.equal(openVerified(theirs(), sub), true);
  assert.equal(openVerified(mine({ holder: "RECEIVER" }), sub), false);
  assert.equal(openVerified(theirs({ elector_wallet: ME }), sub), false);
  assert.equal(openVerified(mine({ text: "Other." }), sub), false);
  assert.equal(openVerified(mine({ receiver_wallet: STRANGER, objector_wallet: STRANGER }), sub), false);
  assert.equal(openVerified(null, sub), false);
});

test("elect postcondition: elected_by is me and equals the elector wallet", () => {
  assert.equal(electVerified(mine({ state: "ELECTED", chosen_course: "Short route", elected_by: ME }), ME, " Short route "), true);
  assert.equal(electVerified(theirs({ state: "ELECTED", chosen_course: "Long", elected_by: RECEIVER }), RECEIVER, "Long"), true);
  assert.equal(electVerified(mine({ state: "ELECTED", chosen_course: "Long", elected_by: RECEIVER }), RECEIVER, "Long"), false);
  assert.equal(electVerified(mine({ state: "ELECTED", chosen_course: "Other", elected_by: ME }), ME, "Short route"), false);
  assert.equal(electVerified(mine(), ME, "Short route"), false);
});

test("object postcondition: note stored, election untouched", () => {
  const before = mine({ state: "ELECTED", chosen_course: "Short route", elected_by: ME });
  assert.equal(objectVerified(before, { ...before, objection_note: "We wanted the long route" }, " We wanted the long route "), true);
  assert.equal(objectVerified(before, { ...before, objection_note: "x", chosen_course: "Long" }, "x"), false);
  assert.equal(objectVerified(before, null, "x"), false);
});

test("withdraw postcondition", () => {
  assert.equal(withdrawVerified(mine({ state: "WITHDRAWN" })), true);
  assert.equal(withdrawVerified(mine({ state: "ELECTED", elected_by: ME })), false);
  assert.equal(withdrawVerified(null), false);
});
