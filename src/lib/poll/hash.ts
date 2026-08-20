import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes, concatBytes } from "@noble/hashes/utils.js";

/**
 * TypeScript mirror of the hashing helpers in
 * `contract/src/private-campus-poll.compact`.
 *
 * The Compact contract uses Midnight's `persistentHash`; here we use SHA-256
 * with the same domain separation tags. The two are not byte-compatible, but
 * the *scheme* is identical, which is what the local engine and the unit tests
 * verify (one-way, domain separated, key-derived).
 */

const tag = (label: string) => {
  const padded = new Uint8Array(32);
  padded.set(utf8ToBytes(label).slice(0, 32));
  return padded;
};

const u64 = (value: number) => {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(value));
  return out;
};

const hex = (...parts: Uint8Array[]) => bytesToHex(sha256(concatBytes(...parts)));

export const pollIdBytes = (pollId: number) => sha256(u64(pollId));

export const voterPublicKey = (secretKeyHex: string) =>
  hex(tag("pcp:pk"), utf8ToBytes(secretKeyHex));

export const nullifierFor = (secretKeyHex: string, pollId: number) =>
  hex(tag("pcp:nullifier"), utf8ToBytes(secretKeyHex), pollIdBytes(pollId));

export const tallySlot = (pollId: number, option: number) =>
  hex(tag("pcp:tally"), pollIdBytes(pollId), sha256(Uint8Array.of(option)));

/** 32 random bytes, used as the voter's local voting secret. */
export const randomSecretKey = () => {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};

export const shorten = (value: string, lead = 6, tail = 4) =>
  value.length <= lead + tail + 3 ? value : `${value.slice(0, lead)}…${value.slice(-tail)}`;
