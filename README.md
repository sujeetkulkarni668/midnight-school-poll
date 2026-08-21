# Private Campus Poll

[![CI/CD](https://github.com/sujeetkulkarni668/midnight-school-poll/actions/workflows/ci.yml/badge.svg)](https://github.com/sujeetkulkarni668/midnight-school-poll/actions/workflows/ci.yml)

## Deployment Details

- **Vercel Link:** [Midnight Preview](https://midnight-school-poll.vercel.app/)
- **Network:** Midnight Preview
- **Contract Address:** `5165f1e5a05546bb57c2ff7aed5e169e8a39f7dff42a792e3ba893823ca5f15f`
- **RPC:** `https://rpc.preview.midnight.network`
- **Indexer:** `https://indexer.preview.midnight.network/api/v4/graphql`
- **Proof Server:** `http://127.0.0.1:6300`
- **Deployment Status:** ✅ Successfully deployed
- **Wallet Status:** ✅ Synced
- **DUST Generation:** ✅ Completed
- **Providers:** ✅ Ready
- **ZK Proof Generation:** ✅ Completed
- **Environment Configuration:** ✅ `.env` updated successfully

- <img width="1599" height="949" alt="Screenshot 2026-08-15 024557 png" src="https://github.com/user-attachments/assets/5aed41e4-9a72-48bc-900e-1485dfb26e39" />

<img width="1365" height="720" alt="compile_circuits" src="https://github.com/user-attachments/assets/14056de4-b3b3-49a1-9f76-9c80bd346c2b" />

### Deployment Confirmation

The contract was successfully deployed to the **Midnight Preview Network** after generating the required ZK proofs and submitting the deployment transaction.
**Vote privately. Verify publicly.**

A campus polling DApp on the [Midnight](https://midnight.network) network. Students
vote in college polls while the network proves each vote is valid and unique —
without ever learning which option any individual picked.

---

## Why Midnight?

On a normal public chain, `vote(pollId, option)` is a transaction. Anyone can read
it forever:

```
0xA1B2… → "Cybersecurity"
0xC3D4… → "Web3"
```

That is not a secret ballot. It enables coercion ("show me your wallet"),
vote-buying, and permanent political profiling of students. Hiding it behind a
backend just moves the trust to a server admin.

Midnight's zero-knowledge execution model lets a contract _check_ facts about
data it never sees. The chosen option is a **private witness**: it is constrained
inside the proof (it must be a real option of a real, open poll) but is never
published alongside an identity.

## Features

- Connect a Midnight wallet through the DApp Connector API (connector 4.x).
- Create polls with 2–4 options.
- Poll list with question, options, total votes, open/closed status and whether
  _you_ already voted.
- Private voting: option supplied as a witness, only an anonymous tally slot is
  incremented.
- On-chain double-vote protection via per-poll nullifiers.
- Aggregated results only — there is no screen, endpoint or ledger field that maps
  a voter to a choice.
- Creator-only poll closing.
- Full status UX: connecting → proving → submitting → confirming → confirmed,
  plus friendly errors for every failure mode.

## Architecture

```
React + TanStack Start frontend      src/routes, src/components/poll
            ↓
Poll engine (rule mirror + tests)    src/lib/poll/engine.ts
            ↓
Midnight connector + providers       src/lib/midnight/*
            ↓
Compact smart contract               contract/src/private-campus-poll.compact
            ↓
Midnight Network (node, indexer, proof server)
```

`src/lib/poll/engine.ts` is a line-for-line TypeScript mirror of the Compact
circuits. It exists so the voting rules can be unit tested without a proof
server, and so the UI can run the exact same state machine in local simulation
mode. It is **not** a replacement for the contract: nothing it computes is
authoritative.

## Privacy model

### Privacy Claim

> **Core Guarantee**: No participant or external observer—including node operators, indexers, poll creators, or other voters—can determine which option a specific voter selected, or associate any voter's identity or wallet address with their vote choice, while still mathematically guaranteeing on-chain that every counted vote is valid, authorized, and cast exactly once per poll.

### What an Observer CAN and CANNOT Learn

| Observer Visibility | Data / Event                     | Details                                                                                                                                 |
| :------------------ | :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **CAN Learn**       | **Poll Metadata**                | Poll question, candidate options, option count, and open/closed status (the ballot is public by design).                                |
| **CAN Learn**       | **Creator Commitment**           | The creator's public commitment `H("pcp:pk", sk)` to verify authority to close the poll (does not reveal the creator's wallet address). |
| **CAN Learn**       | **Aggregate Tallies**            | Aggregate counts per option `tallies[H("pcp:tally", pollId, option)]` as anonymous slots are incremented.                               |
| **CAN Learn**       | **Spent Nullifiers**             | The one-way hash `H("pcp:nullifier", sk, pollId)` added to the on-chain nullifier set when a vote is accepted.                          |
| **CAN Learn**       | **Transaction Metadata**         | Standard blockchain execution metadata (transaction timestamp, block inclusion, gas/fee payment).                                       |
| **CANNOT Learn**    | **Voter Identity ↔ Choice Link** | Which voter picked which option. The voter's choice is kept as a local private witness inside the ZK proof.                             |
| **CANNOT Learn**    | **Voting Secret Key (`sk`)**     | The voter's secret key (`localSecretKey()`), which remains strictly on the client device.                                               |
| **CANNOT Learn**    | **Identity from Nullifier**      | Who generated a given nullifier, due to preimage resistance and one-way cryptographic hashing.                                          |
| **CANNOT Learn**    | **Cross-Poll Voter Activity**    | Whether two votes in different polls came from the same person (nullifiers across different polls are completely unlinkable).           |

---

### Ledger State: Public vs. Private

**Public (written to the ledger)**

| Value                                       | Why it is safe                                       |
| ------------------------------------------- | ---------------------------------------------------- |
| `pollCount`, poll question, options, status | The ballot itself is meant to be public              |
| `creator`                                   | A commitment `H("pcp:pk", sk)`, not a wallet address |
| `tallies[H("pcp:tally", pollId, option)]`   | An aggregate count, with no voter identity attached  |
| `nullifiers`                                | One-way `H("pcp:nullifier", sk, pollId)` values      |

**Private (never leaves the device)**

- **Voting secret key `sk`** (witness `localSecretKey()`): long-lived private key used to prove authorization and construct nullifiers.
- **Selected option `choice`** (witness `voteChoice()`): option index supplied privately at proving time.

---

### Cryptographic Guarantees & Implementation

**How validity is proven.** The `vote` circuit asserts, inside the zero-knowledge proof:

1. The target poll exists (`polls.member(pollId)`).
2. The poll is active and open (`poll.status == PollStatus.open`).
3. The selected option index is in-bounds (`choice < poll.optionCount`).
4. The derived nullifier has not been recorded before (`!nullifiers.member(nullifier)`).

If any assertion fails, no valid zero-knowledge proof can be constructed and no transaction can be submitted. Frontend checks are for UX only; verification is enforced purely by the Midnight contract circuits.

**How double voting is prevented.** `nullifier = H("pcp:nullifier", sk, pollId)` is deterministic per (student, poll) and is inserted into a public set. A second vote with the same key produces the same nullifier and is rejected by the contract. Because the hash is one-way and domain-separated:

- The nullifier reveals nothing about `sk`.
- Nullifiers for different polls are unlinkable (`pollId` is included in the hash preimage).

**Honest limitation — what is _not_ hidden.** The tally increment itself is a public state change, so a chain observer can see that _someone_ voted for option 2. What they cannot do is link that increment to a wallet: the transaction discloses no voter identity, only the nullifier. So this gives **unlinkability of voter ↔ choice**, not concealment of the aggregate delta. Hiding the increments too would require homomorphic tallying, which current Compact ledger types do not express. This is documented rather than faked.

**Eligibility (MVP).** Eligibility is "holds a voting secret key", enforced by nullifier uniqueness. The architecture is built so this can be tightened without touching the UI: replace the nullifier check with a Merkle membership proof over a `HistoricMerkleTree` of registered student commitments, adding a merkle-path witness. No centralised login is introduced anywhere.

## Installation

```bash
npm install
cp .env.example .env
```

## Configuration

| Variable                                   | Meaning                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `VITE_MIDNIGHT_NETWORK_ID`                 | network hint passed to `wallet.connect()` (`undeployed`, `testnet`, `mainnet`) |
| `VITE_NODE_URI`                            | Midnight node RPC                                                              |
| `VITE_INDEXER_URI` / `VITE_INDEXER_WS_URI` | indexer GraphQL endpoints                                                      |
| `VITE_PROOF_SERVER_URI`                    | local proof server                                                             |
| `VITE_POLL_CONTRACT_ADDRESS`               | address of the deployed poll contract                                          |

No secrets are required — every variable above is public client configuration.

## Running locally

```bash
npm run dev      # http://localhost:8080
npm run build    # production build
npm run preview
```

With no compiled contract or service URIs, the app runs in **local simulation
mode** and says so in a banner at the top of every page: the real rules execute,
but no ZK proof is generated and nothing touches the network.

## Contract deployment

```bash
# 1. install the Compact toolchain (see contract/README.md)
compact update && export PATH="$HOME/.compact/bin:$PATH"

# 2. proof server
docker run -p 6300:6300 midnightnetwork/proof-server:latest -- \
  'midnight-proof-server --network undeployed'

# 3. compile the contract
npm run contract:build:zk        # emits contract/managed/private-campus-poll/

# 4. deploy with @midnight-ntwrk/midnight-js-contracts (see contract/README.md)
#    then put the returned address in .env
VITE_POLL_CONTRACT_ADDRESS=0200…
```

Restart `npm run dev`; the banner disappears and the app switches to on-chain mode.

## Testing

```bash
npm test
```

Covers: poll creation, a successful vote, invalid-option rejection, second-vote
rejection, result aggregation, non-exposure of private vote data, and interaction
with a missing/closed poll.

## Demo flow

1. Open the app → the campus workshop poll is already there.
2. **Connect Wallet**.
3. Pick an option → **Vote Privately**.
4. Watch proving → submitting → confirming → _Vote confirmed_.
5. Aggregated results update.
6. Try voting again → _"You have already voted in this poll."_
7. Point at the ledger: it proves validity and uniqueness, and it does not know
   what you chose.

## Limitations

- **`compactc` is a native binary and is not vendored in this repo.** Install it
  locally (see `contract/README.md`) and run `npm run contract:build:zk` once;
  this generates `contract/managed/private-campus-poll/` (contract bindings,
  ZK IR, and prover/verifier keys), which is committed to source control so the
  on-chain path works without a rebuild.
- Tally increments are public (see the privacy model above).
- Eligibility is self-sovereign in the MVP; a Merkle-registry upgrade path is
  described above.
- In local simulation mode the ledger snapshot lives in `localStorage`, so it is
  per-browser. That mode is always labelled and never claims to be on-chain.
