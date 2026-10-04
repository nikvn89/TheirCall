export type Option = {
  option_id: string;
  author: string;
  receiver_wallet: string;
  receiver_label: string;
  text: string;
  outcome: "PERFORMER_CHOOSES" | "RECEIVER_CHOOSES" | string;
  holder: "AUTHOR" | "RECEIVER" | string;
  elector_wallet: string;
  objector_wallet: string;
  state: "OPEN" | "ELECTED" | "WITHDRAWN" | string;
  chosen_course: string;
  elected_by: string;
  objection_note: string;
};

export type TxPhase = "idle" | "checking" | "signing" | "submitted" | "delayed" | "success" | "error";

export type TxStatus = {
  phase: TxPhase;
  message: string;
  hash?: string;
};
