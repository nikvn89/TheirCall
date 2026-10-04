// Mirrors every revert of contracts/WhoElects.py that can be predicted from
// state already read, in the SAME order the contract checks them. Who holds
// the choice is NEVER inferred here: it is read from get_option().elector_wallet
// and .objector_wallet, which the contract computes with _elector/_objector.

import { pyContainsToken, pyLen, pyStrip } from "./pytext.ts";
import type { Option } from "./types.ts";

export const MAX_TEXT_LENGTH = 600;
export const MAX_LABEL_LENGTH = 80;
export const MAX_COURSE_LENGTH = 60;
export const MAX_NOTE_LENGTH = 60;

export const RESERVED_TOKENS = [
  "<UNTRUSTED_OPTION_TEXT>",
  "</UNTRUSTED_OPTION_TEXT>",
  "<UNTRUSTED_RECEIVER_LABEL>",
  "</UNTRUSTED_RECEIVER_LABEL>",
  "PERFORMER_CHOOSES",
  "RECEIVER_CHOOSES",
] as const;

export const REVERTS = {
  invalidWallet: "Invalid wallet address",
  labelEmpty: "Label is empty",
  labelTooLong: "Label is too long",
  textEmpty: "Text is empty",
  textTooLong: "Text is too long",
  reserved: "Text or label contains a reserved token",
  receiverIsAuthor: "The receiver cannot be the author",
  duplicate: "This option already exists",
  unknownOption: "Unknown option id",
  elected: "This option has already been elected",
  withdrawn: "This option has been withdrawn",
  notYours: "The choice here is not yours to make",
  courseEmpty: "Course is empty",
  courseTooLong: "Course is too long",
  noElection: "There is no election to object to",
  notObjector: "Only the side that did not hold the choice may object",
  objected: "This election has already been objected to",
  noteEmpty: "Note is empty",
  noteTooLong: "Note is too long",
  notAuthorWithdraw: "Only the author may withdraw this option",
  noWithdrawAfterElect: "This option has been elected; it can no longer be withdrawn",
  alreadyWithdrawn: "This option is already withdrawn",
} as const;

const ZERO = "0x0000000000000000000000000000000000000000";

export type WalletCheck = { ok: true; wallet: string } | { ok: false; reason: string };

/** The contract's _normalize_wallet. */
export function normalizeWallet(value: string): WalletCheck {
  const wallet = pyStrip(value).toLowerCase();
  if (wallet.length !== 42 || !wallet.startsWith("0x") || !/^[0-9a-f]{40}$/.test(wallet.slice(2)) || wallet === ZERO) {
    return { ok: false, reason: REVERTS.invalidWallet };
  }
  return { ok: true, wallet };
}

/** "The choice belongs to the Buyer (0x…)" / "The choice belongs to the author (0x…)", from the view's own fields. */
export function holderLine(o: Option): string {
  const who = o.holder === "AUTHOR" ? "the author" : o.receiver_label;
  return `The choice belongs to ${who} (${o.elector_wallet})`;
}

export type Role = "author" | "receiver" | "neither side";

export function roleOf(o: Option, me: string): Role {
  const m = me.toLowerCase();
  if (m === o.author.toLowerCase()) return "author";
  if (m === o.receiver_wallet.toLowerCase()) return "receiver";
  return "neither side";
}

export type OpenInput = { me: string; receiverWallet: string; label: string; text: string; exists: boolean };

/** open_option order: wallet -> label -> text -> reserved -> receiver != author -> duplicate. */
export function openBlock(i: OpenInput): string | null {
  const w = normalizeWallet(i.receiverWallet);
  if (!w.ok) return w.reason;
  const label = pyStrip(i.label);
  if (pyLen(label) === 0) return REVERTS.labelEmpty;
  if (pyLen(label) > MAX_LABEL_LENGTH) return REVERTS.labelTooLong;
  const text = pyStrip(i.text);
  if (pyLen(text) === 0) return REVERTS.textEmpty;
  if (pyLen(text) > MAX_TEXT_LENGTH) return REVERTS.textTooLong;
  if (pyContainsToken(label, RESERVED_TOKENS) || pyContainsToken(text, RESERVED_TOKENS)) return REVERTS.reserved;
  if (w.wallet === i.me.toLowerCase()) return REVERTS.receiverIsAuthor;
  if (i.exists) return REVERTS.duplicate;
  return null;
}

/** elect order: ELECTED -> WITHDRAWN -> caller == elector_wallet -> course. */
export function electBlock(o: Option, me: string, course: string): string | null {
  if (o.state === "ELECTED") return REVERTS.elected;
  if (o.state === "WITHDRAWN") return REVERTS.withdrawn;
  if (me.toLowerCase() !== o.elector_wallet.toLowerCase()) return REVERTS.notYours;
  const c = pyStrip(course);
  if (pyLen(c) === 0) return REVERTS.courseEmpty;
  if (pyLen(c) > MAX_COURSE_LENGTH) return REVERTS.courseTooLong;
  if (pyContainsToken(c, RESERVED_TOKENS)) return REVERTS.reserved;
  return null;
}

/** object_to_election order: ELECTED -> caller == objector_wallet -> not yet objected -> note. */
export function objectBlock(o: Option, me: string, note: string): string | null {
  if (o.state !== "ELECTED") return REVERTS.noElection;
  if (me.toLowerCase() !== o.objector_wallet.toLowerCase()) return REVERTS.notObjector;
  if (o.objection_note !== "") return REVERTS.objected;
  const n = pyStrip(note);
  if (pyLen(n) === 0) return REVERTS.noteEmpty;
  if (pyLen(n) > MAX_NOTE_LENGTH) return REVERTS.noteTooLong;
  return null;
}

/** withdraw_option order: author -> ELECTED -> WITHDRAWN. */
export function withdrawBlock(o: Option, me: string): string | null {
  if (me.toLowerCase() !== o.author.toLowerCase()) return REVERTS.notAuthorWithdraw;
  if (o.state === "ELECTED") return REVERTS.noWithdrawAfterElect;
  if (o.state === "WITHDRAWN") return REVERTS.alreadyWithdrawn;
  return null;
}
