import { nullifierFor, tallySlot, voterPublicKey } from "./hash";
import { PollError, type LedgerState, type Poll, type PollResults } from "./types";

/**
 * Pure TypeScript mirror of the circuits in
 * `contract/src/private-campus-poll.compact`.
 *
 * Every rule enforced here is enforced by the contract as well; this module
 * exists so the rules can be unit tested without a proof server, and so the
 * UI can run the exact same state machine in local simulation mode.
 */

export const emptyLedger = (): LedgerState => ({
  pollCount: 0,
  polls: {},
  tallies: {},
  nullifiers: [],
});

const clone = (ledger: LedgerState): LedgerState => ({
  pollCount: ledger.pollCount,
  polls: { ...ledger.polls },
  tallies: { ...ledger.tallies },
  nullifiers: [...ledger.nullifiers],
});

export interface CreatePollInput {
  question: string;
  options: string[];
}

/** circuit createPoll(question, options, optionCount) */
export const createPoll = (
  ledger: LedgerState,
  input: CreatePollInput,
  secretKey: string,
): { ledger: LedgerState; poll: Poll } => {
  const question = input.question.trim();
  const options = input.options.map((o) => o.trim()).filter(Boolean);

  if (question.length < 3)
    throw new PollError("INVALID_POLL_INPUT", "Write a question of at least 3 characters.");
  if (options.length < 2)
    throw new PollError("INVALID_POLL_INPUT", "A poll needs at least two options.");
  if (options.length > 4)
    throw new PollError("INVALID_POLL_INPUT", "A poll can have at most four options.");

  const next = clone(ledger);
  const poll: Poll = {
    id: next.pollCount,
    question,
    options,
    status: "open",
    creator: voterPublicKey(secretKey),
  };
  next.polls[poll.id] = poll;
  next.pollCount += 1;
  return { ledger: next, poll };
};

/** circuit closePoll(pollId) */
export const closePoll = (ledger: LedgerState, pollId: number, secretKey: string): LedgerState => {
  const poll = requirePoll(ledger, pollId);
  if (poll.creator !== voterPublicKey(secretKey))
    throw new PollError("NOT_CREATOR", "Only the student who created this poll can close it.");
  if (poll.status === "closed") throw new PollError("POLL_CLOSED", "This poll is already closed.");
  const next = clone(ledger);
  next.polls[pollId] = { ...poll, status: "closed" };
  return next;
};

const requirePoll = (ledger: LedgerState, pollId: number): Poll => {
  const poll = ledger.polls[pollId];
  if (!poll) throw new PollError("POLL_NOT_FOUND", "That poll does not exist.");
  return poll;
};

export const hasVoted = (ledger: LedgerState, pollId: number, secretKey: string) =>
  ledger.nullifiers.includes(nullifierFor(secretKey, pollId));

/** circuit vote(pollId) with `voteChoice()` supplied as a private witness */
export const castVote = (
  ledger: LedgerState,
  pollId: number,
  choice: number,
  secretKey: string,
): { ledger: LedgerState; nullifier: string } => {
  const poll = requirePoll(ledger, pollId);
  if (poll.status !== "open") throw new PollError("POLL_CLOSED", "This poll is closed.");
  if (!Number.isInteger(choice) || choice < 0 || choice >= poll.options.length)
    throw new PollError("INVALID_OPTION", "That option is not part of this poll.");

  const nullifier = nullifierFor(secretKey, pollId);
  if (ledger.nullifiers.includes(nullifier))
    throw new PollError("ALREADY_VOTED", "You have already voted in this poll.");

  const next = clone(ledger);
  next.nullifiers.push(nullifier);
  const slot = tallySlot(pollId, choice);
  next.tallies[slot] = (next.tallies[slot] ?? 0) + 1;
  return { ledger: next, nullifier };
};

export const resultsFor = (ledger: LedgerState, pollId: number): PollResults => {
  const poll = requirePoll(ledger, pollId);
  const votes = poll.options.map((label, index) => ({
    index,
    label,
    votes: ledger.tallies[tallySlot(pollId, index)] ?? 0,
  }));
  const total = votes.reduce((sum, o) => sum + o.votes, 0);
  return {
    pollId,
    total,
    options: votes.map((o) => ({
      ...o,
      percent: total === 0 ? 0 : Math.round((o.votes / total) * 100),
    })),
  };
};

export const listPolls = (ledger: LedgerState): Poll[] =>
  Object.values(ledger.polls).sort((a, b) => b.id - a.id);
