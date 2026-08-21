export type PollStatus = "open" | "closed";

export interface Poll {
  id: number;
  question: string;
  options: string[];
  status: PollStatus;
  /** commitment to the creator's voting key, never the wallet address */
  creator: string;
}

/** Exactly the data the Compact contract keeps in public ledger state. */
export interface LedgerState {
  pollCount: number;
  polls: Record<number, Poll>;
  /** tallySlot(pollId, option) -> count */
  tallies: Record<string, number>;
  /** spent nullifiers */
  nullifiers: string[];
}

export interface PollResults {
  pollId: number;
  total: number;
  options: { index: number; label: string; votes: number; percent: number }[];
}

export type PollErrorCode =
  | "POLL_NOT_FOUND"
  | "POLL_CLOSED"
  | "INVALID_OPTION"
  | "ALREADY_VOTED"
  | "NOT_CREATOR"
  | "INVALID_POLL_INPUT";

export class PollError extends Error {
  constructor(
    readonly code: PollErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PollError";
  }
}

/** Friendly copy for anything that can go wrong, in student language. */
export const friendlyError = (error: unknown): string => {
  if (error instanceof PollError) return error.message;
  if (error && typeof error === "object" && "name" in error && (error.name === "WalletError" || error.name === "PollError")) {
    return (error as Error).message;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/user rejected|denied|cancell?ed|declined|disallowed|aborted/i.test(message))
    return "You cancelled the request in your wallet.";
  if (/not installed|no wallet|undefined/i.test(message))
    return "No Midnight wallet found. Please install a supported extension and reload.";
  if (/proof/i.test(message))
    return "Proof generation failed. Make sure your proof server is running, then try again.";
  if (/fetch|network|timeout/i.test(message))
    return "Network problem while talking to the Midnight node. Check your connection and retry.";
  return message || "Something went wrong. Please try again.";
};
