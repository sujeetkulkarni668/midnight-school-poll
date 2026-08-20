import { emptyLedger } from "./engine";
import { randomSecretKey } from "./hash";
import type { LedgerState } from "./types";

/**
 * Local persistence for the voter's private state and — in local simulation
 * mode — for the ledger snapshot. The voting secret key never leaves the
 * browser: it is the private witness the vote circuit consumes.
 */

const SECRET_PREFIX = "pcp:secret:";
const LEDGER_KEY = "pcp:ledger";

export const loadSecretKey = (accountId: string): string => {
  const key = `${SECRET_PREFIX}${accountId}`;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const fresh = randomSecretKey();
  window.localStorage.setItem(key, fresh);
  return fresh;
};

export const loadLedger = (): LedgerState | null => {
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    return raw ? (JSON.parse(raw) as LedgerState) : null;
  } catch {
    return null;
  }
};

export const saveLedger = (ledger: LedgerState) => {
  window.localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
};

export const resetLedger = () => window.localStorage.removeItem(LEDGER_KEY);

export const seedLedger = (): LedgerState => {
  const base = emptyLedger();
  base.polls[0] = {
    id: 0,
    question: "Which workshop should our college conduct next?",
    options: ["Blockchain", "Artificial Intelligence", "Cybersecurity", "Web3"],
    status: "open",
    creator: "campus-council",
  };
  base.pollCount = 1;
  return base;
};
