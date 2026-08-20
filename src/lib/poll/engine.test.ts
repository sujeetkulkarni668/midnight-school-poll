import { describe, expect, it } from "vitest";
import {
  castVote,
  closePoll,
  createPoll,
  emptyLedger,
  hasVoted,
  listPolls,
  resultsFor,
} from "./engine";
import { PollError } from "./types";
import { nullifierFor, voterPublicKey } from "./hash";

const ALICE = "a".repeat(64);
const BOB = "b".repeat(64);

const seeded = () =>
  createPoll(
    emptyLedger(),
    {
      question: "Which workshop should our college conduct next?",
      options: ["Blockchain", "Artificial Intelligence", "Cybersecurity", "Web3"],
    },
    ALICE,
  );

describe("private campus poll contract logic", () => {
  it("1. creates a poll successfully", () => {
    const { ledger, poll } = seeded();
    expect(poll.id).toBe(0);
    expect(ledger.pollCount).toBe(1);
    expect(listPolls(ledger)).toHaveLength(1);
    expect(poll.options).toHaveLength(4);
    expect(poll.status).toBe("open");
    expect(poll.creator).toBe(voterPublicKey(ALICE));
  });

  it("2. accepts a valid vote", () => {
    const { ledger } = seeded();
    const after = castVote(ledger, 0, 2, ALICE).ledger;
    expect(hasVoted(after, 0, ALICE)).toBe(true);
    expect(resultsFor(after, 0).total).toBe(1);
  });

  it("3. rejects an invalid option", () => {
    const { ledger } = seeded();
    expect(() => castVote(ledger, 0, 9, ALICE)).toThrow(PollError);
    expect(() => castVote(ledger, 0, -1, ALICE)).toThrow(/not part of this poll/);
  });

  it("4. rejects a second vote from the same participant", () => {
    const { ledger } = seeded();
    const after = castVote(ledger, 0, 0, ALICE).ledger;
    expect(() => castVote(after, 0, 1, ALICE)).toThrow(/already voted/);
    // …but the same student may vote in a different poll
    const second = createPoll(after, { question: "Fest theme?", options: ["Retro", "Neon"] }, BOB);
    expect(() => castVote(second.ledger, 1, 0, ALICE)).not.toThrow();
  });

  it("5. updates aggregated results correctly", () => {
    let ledger = seeded().ledger;
    const voter = (n: number) => `v${n}`.padEnd(64, "0");
    ledger = castVote(ledger, 0, 0, voter(1)).ledger;
    ledger = castVote(ledger, 0, 0, voter(2)).ledger;
    ledger = castVote(ledger, 0, 1, voter(3)).ledger;
    ledger = castVote(ledger, 0, 3, voter(4)).ledger;

    const results = resultsFor(ledger, 0);
    expect(results.total).toBe(4);
    expect(results.options.map((o) => o.votes)).toEqual([2, 1, 0, 1]);
    expect(results.options.map((o) => o.percent)).toEqual([50, 25, 0, 25]);
  });

  it("6. never exposes who voted for what", () => {
    const { ledger } = seeded();
    const after = castVote(ledger, 0, 1, ALICE).ledger;
    const published = JSON.stringify(after);

    // the secret key and the choice are not recoverable from public state
    expect(published).not.toContain(ALICE);
    expect(after.nullifiers).toEqual([nullifierFor(ALICE, 0)]);
    // public state holds only opaque tally slots, never voter -> option pairs
    expect(Object.keys(after.tallies)).toHaveLength(1);
    expect(Object.keys(after.tallies)[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.values(after)).not.toContainEqual(expect.objectContaining({ voter: ALICE }));
  });

  it("7. rejects interaction with a poll that does not exist or is closed", () => {
    const { ledger } = seeded();
    expect(() => castVote(ledger, 42, 0, ALICE)).toThrow(/does not exist/);
    expect(() => resultsFor(ledger, 42)).toThrow(/does not exist/);

    const closed = closePoll(ledger, 0, ALICE);
    expect(() => castVote(closed, 0, 0, BOB)).toThrow(/closed/);
    expect(() => closePoll(ledger, 0, BOB)).toThrow(/only the student who created/i);
  });
});
