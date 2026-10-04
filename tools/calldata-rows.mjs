// Shared rows for tools/calldata-bytes.mjs, tools/probe-calldata.mjs and tests.
export const RECEIVER = "0x" + "1".repeat(40);
export const LABEL = "the Buyer";
export const ID = "f".repeat(64);
export const NOTE60 = "n".repeat(60);
export const COURSE60 = "c".repeat(60);

export const CASES = {
  G1: "We may deliver to you in one shipment or in several.",
  G2: "Payment may be made by transfer or by card, as we find convenient.",
  G3: "The work may be carried out on site or remotely, at our option.",
  G4: "Either grade of material is open to us.",
  G5: "We decide which of the two routes is taken.",
  R1: "The Buyer may call for delivery in one shipment or in several.",
  R2: "Payment may be taken by transfer or by card, whichever the Buyer prefers.",
  R3: "You may require the work on site or remotely.",
  R4: "Either grade of material is open to you.",
  R5: "The Buyer decides which of the two routes is taken.",
};

/** HARD BLOCK: any of these over 255 bytes stops the release. */
export function hardBlockRows() {
  const rows = Object.entries(CASES).map(([name, text]) => ({
    name: `open_option ${name}`, method: "open_option", args: [RECEIVER, LABEL, text],
  }));
  rows.push({ name: "elect (id + 60-char course)", method: "elect", args: [ID, COURSE60] });
  rows.push({ name: "object_to_election (id + 60-char note)", method: "object_to_election", args: [ID, NOTE60] });
  rows.push({ name: "withdraw_option (id)", method: "withdraw_option", args: [ID] });
  return rows;
}

/** MEASURE ONLY: the contract caps are wider than the proven path. */
export function measureOnlyRows() {
  return [
    { name: "open_option at max label 80 + max text 600", method: "open_option", args: [RECEIVER, "l".repeat(80), "t".repeat(600)] },
  ];
}
