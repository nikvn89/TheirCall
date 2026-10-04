// Postconditions checked AFTER the receipt says SUCCESS, against reloaded
// accepted state. Every written field must match the submission.

import { pyStrip } from "./pytext.ts";
import type { Option } from "./types.ts";

export type OpenSubmission = { me: string; receiverWallet: string; label: string; text: string; optionId: string };

export function openVerified(o: Option | null, s: OpenSubmission): boolean {
  if (!o) return false;
  const me = s.me.toLowerCase();
  const author = o.outcome === "PERFORMER_CHOOSES" && o.holder === "AUTHOR" && o.elector_wallet === me && o.objector_wallet === s.receiverWallet;
  const receiver = o.outcome === "RECEIVER_CHOOSES" && o.holder === "RECEIVER" && o.elector_wallet === s.receiverWallet && o.objector_wallet === me;
  return (
    (author || receiver) &&
    o.option_id === s.optionId &&
    o.author.toLowerCase() === me &&
    o.receiver_wallet === s.receiverWallet &&
    o.receiver_label === pyStrip(s.label) &&
    o.text === pyStrip(s.text) &&
    o.state === "OPEN" &&
    o.chosen_course === "" && o.elected_by === "" && o.objection_note === ""
  );
}

export function electVerified(after: Option | null, me: string, course: string): boolean {
  return !!after && after.state === "ELECTED" && after.chosen_course === pyStrip(course) &&
    after.elected_by === me.toLowerCase() && after.elected_by === after.elector_wallet;
}

export function objectVerified(before: Option, after: Option | null, note: string): boolean {
  return !!after && after.state === "ELECTED" && after.objection_note === pyStrip(note) &&
    after.chosen_course === before.chosen_course && after.elected_by === before.elected_by;
}

export function withdrawVerified(after: Option | null): boolean {
  return !!after && after.state === "WITHDRAWN" && after.elected_by === "";
}
