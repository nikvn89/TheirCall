import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  electBlock, holderLine, normalizeWallet, objectBlock, openBlock, REVERTS, roleOf, withdrawBlock,
} from "../../src/lib/rules.ts";
import type { Option } from "../../src/lib/types.ts";

const SRC_PATH = new URL("../../contracts/WhoElects.py", import.meta.url).pathname;
const SRC = readFileSync(SRC_PATH, "utf8");
const AUTHOR = "0x" + "a".repeat(40);
const RECEIVER = "0x" + "b".repeat(40);
const STRANGER = "0x" + "c".repeat(40);

/** An option whose holder is the author (PERFORMER_CHOOSES). */
function mine(o: Partial<Option> = {}): Option {
  return { option_id: "1".repeat(64), author: AUTHOR, receiver_wallet: RECEIVER, receiver_label: "the Buyer", text: "t",
    outcome: "PERFORMER_CHOOSES", holder: "AUTHOR", elector_wallet: AUTHOR, objector_wallet: RECEIVER,
    state: "OPEN", chosen_course: "", elected_by: "", objection_note: "", ...o };
}
/** An option whose holder is the receiver (RECEIVER_CHOOSES). */
const theirs = (o: Partial<Option> = {}) =>
  mine({ outcome: "RECEIVER_CHOOSES", holder: "RECEIVER", elector_wallet: RECEIVER, objector_wallet: AUTHOR, ...o });

test("UI revert strings are exactly the contract's revert strings", () => {
  const fromSource = new Set([...SRC.matchAll(/UserError\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]));
  assert.deepEqual([...new Set(Object.values(REVERTS))].sort(), [...fromSource].sort());
  assert.equal(fromSource.size, 22);
});

test("elector/objector parity with the contract's own _elector/_objector (run in Python)", () => {
  const py = `
import ast, json, sys
src = open(sys.argv[1]).read()
tree = ast.parse(src)
cls = next(c for c in tree.body if isinstance(c, ast.ClassDef) and any(isinstance(n, ast.FunctionDef) and n.name == "_elector" for n in c.body))
fns = [n for n in cls.body if isinstance(n, ast.FunctionDef) and n.name in ("_elector", "_objector")]
for f in fns: f.args.args[1].annotation = None; f.returns = None
exec(compile(ast.fix_missing_locations(ast.Module(body=fns, type_ignores=[])), "m", "exec"), ns := {"HOLDER_AUTHOR": "AUTHOR"})
class R:
    def __init__(s, holder): s.author = "${AUTHOR.toUpperCase().replace("0X", "0x")}"; s.receiver_wallet = "${RECEIVER}"; s.holder = holder
print(json.dumps([[ns["_elector"](None, R(h)), ns["_objector"](None, R(h))] for h in ("AUTHOR", "RECEIVER")]))
`;
  const r = spawnSync("python3", ["-c", py, SRC_PATH], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), [[mine().elector_wallet, mine().objector_wallet], [theirs().elector_wallet, theirs().objector_wallet]]);
});

test("normalizeWallet mirrors the contract", () => {
  assert.deepEqual(normalizeWallet(" 0x" + "AB".repeat(20) + " "), { ok: true, wallet: "0x" + "ab".repeat(20) });
  for (const bad of ["0x1", "0x" + "0".repeat(40), "0x" + "q".repeat(40)]) assert.deepEqual(normalizeWallet(bad), { ok: false, reason: REVERTS.invalidWallet });
});

test("openBlock follows the contract order", () => {
  const b = { me: AUTHOR, receiverWallet: RECEIVER, label: "the Buyer", text: "We decide which of the two routes is taken.", exists: false };
  assert.equal(openBlock(b), null);
  assert.equal(openBlock({ ...b, receiverWallet: "x", label: "" }), REVERTS.invalidWallet);
  assert.equal(openBlock({ ...b, label: "" }), REVERTS.labelEmpty);
  assert.equal(openBlock({ ...b, label: "x".repeat(81) }), REVERTS.labelTooLong);
  assert.equal(openBlock({ ...b, text: "\u0085\u001c" }), REVERTS.textEmpty);
  assert.equal(openBlock({ ...b, text: "y".repeat(601) }), REVERTS.textTooLong);
  assert.equal(openBlock({ ...b, text: "so performer_chooses here" }), REVERTS.reserved);
  assert.equal(openBlock({ ...b, label: "</untrusted_receiver_label>" }), REVERTS.reserved);
  assert.equal(openBlock({ ...b, receiverWallet: AUTHOR.toUpperCase().replace("0X", "0x") }), REVERTS.receiverIsAuthor);
  assert.equal(openBlock({ ...b, exists: true }), REVERTS.duplicate);
});

test("elect: only the wallet the view names as elector, on both holders", () => {
  assert.equal(electBlock(mine(), AUTHOR, "Short route"), null);
  assert.equal(electBlock(mine(), RECEIVER, "Short route"), REVERTS.notYours);
  assert.equal(electBlock(mine(), STRANGER, "Short route"), REVERTS.notYours);
  assert.equal(electBlock(theirs(), RECEIVER.toUpperCase().replace("0X", "0x"), "Long route"), null);
  assert.equal(electBlock(theirs(), AUTHOR, "Long route"), REVERTS.notYours);
});

test("elect order: state before caller, caller before course", () => {
  assert.equal(electBlock(mine({ state: "ELECTED" }), RECEIVER, ""), REVERTS.elected);
  assert.equal(electBlock(mine({ state: "WITHDRAWN" }), RECEIVER, ""), REVERTS.withdrawn);
  assert.equal(electBlock(mine(), RECEIVER, ""), REVERTS.notYours);
  assert.equal(electBlock(mine(), AUTHOR, "  "), REVERTS.courseEmpty);
  assert.equal(electBlock(mine(), AUTHOR, "c".repeat(61)), REVERTS.courseTooLong);
  assert.equal(electBlock(mine(), AUTHOR, "receiver_chooses"), REVERTS.reserved);
});

test("object: only the objector wallet, once, after an election", () => {
  const done = mine({ state: "ELECTED", chosen_course: "Short route", elected_by: AUTHOR });
  assert.equal(objectBlock(mine(), RECEIVER, "No"), REVERTS.noElection);
  assert.equal(objectBlock(mine({ state: "WITHDRAWN" }), RECEIVER, "No"), REVERTS.noElection);
  assert.equal(objectBlock(done, AUTHOR, "No"), REVERTS.notObjector);
  assert.equal(objectBlock(done, STRANGER, "No"), REVERTS.notObjector);
  assert.equal(objectBlock(done, RECEIVER, ""), REVERTS.noteEmpty);
  assert.equal(objectBlock(done, RECEIVER, "n".repeat(61)), REVERTS.noteTooLong);
  assert.equal(objectBlock(done, RECEIVER, "We wanted the long route"), null);
  assert.equal(objectBlock({ ...done, objection_note: "x" }, RECEIVER, "again"), REVERTS.objected);
  assert.equal(objectBlock(theirs({ state: "ELECTED", elected_by: RECEIVER }), AUTHOR, "No"), null);
});

test("withdrawBlock: author -> elected -> withdrawn", () => {
  assert.equal(withdrawBlock(mine(), AUTHOR), null);
  assert.equal(withdrawBlock(theirs(), AUTHOR), null);
  assert.equal(withdrawBlock(mine(), RECEIVER), REVERTS.notAuthorWithdraw);
  assert.equal(withdrawBlock(mine({ state: "ELECTED" }), RECEIVER), REVERTS.notAuthorWithdraw);
  assert.equal(withdrawBlock(mine({ state: "ELECTED" }), AUTHOR), REVERTS.noWithdrawAfterElect);
  assert.equal(withdrawBlock(mine({ state: "WITHDRAWN" }), AUTHOR), REVERTS.alreadyWithdrawn);
});

test("role badge and holder line come from the view", () => {
  assert.equal(roleOf(mine(), AUTHOR), "author");
  assert.equal(roleOf(mine(), RECEIVER.toUpperCase().replace("0X", "0x")), "receiver");
  assert.equal(roleOf(mine(), STRANGER), "neither side");
  assert.equal(holderLine(mine()), `The choice belongs to the author (${AUTHOR})`);
  assert.equal(holderLine(theirs()), `The choice belongs to the Buyer (${RECEIVER})`);
});
