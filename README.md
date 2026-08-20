# Private Campus Poll

## Deployment Details

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

Midnight's zero-knowledge execution model lets a contract *check* facts about
data it never sees. The chosen option is a **private witness**: it is constrained
inside the proof (it must be a real option of a real, open poll) but is never
published alongside an identity.

## Features

- Connect a Midnight wallet through the DApp Connector API (connector 4.x).
- Create polls with 2–4 options.
- Poll list with question, options, total votes, open/closed status and whether
  *you* already voted.
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

**Public (written to the ledger)**

| Value | Why it is safe |
| --- | --- |
| `pollCount`, poll question, options, status | the ballot itself is meant to be public |
| `creator` | a commitment `H("pcp:pk", sk)`, not a wallet address |
| `tallies[H("pcp:tally", pollId, option)]` | an aggregate count, with no voter attached |
| `nullifiers` | one-way `H("pcp:nullifier", sk, pollId)` values |

**Private (never leaves the device)**

- the voting secret key `sk` (witness `localSecretKey()`)
- the selected option (witness `voteChoice()`)

**How validity is proven.** The `vote` circuit asserts, inside the proof, that the
poll exists, that it is open, that `choice < poll.optionCount`, and that the
derived nullifier is unused. If any assert fails, no proof exists and no
transaction can be built. Frontend checks are for UX only.

**How double voting is prevented.** `nullifier = H("pcp:nullifier", sk, pollId)`
is deterministic per (student, poll) and is inserted into a public set. A second
vote with the same key produces the same nullifier and is rejected by the
contract. Because the hash is one-way and domain-separated, the nullifier reveals
nothing about `sk`, and nullifiers for different polls are unlinkable.

**Honest limitation — what is *not* hidden.** The tally increment itself is a
public state change, so a chain observer can see that *someone* voted for option
2. What they cannot do is link that increment to a wallet: the transaction
discloses no voter identity, only the nullifier. So this gives **unlinkability of
voter ↔ choice**, not concealment of the aggregate delta. Hiding the increments
too would require homomorphic tallying, which current Compact ledger types do not
express. This is documented rather than faked.

**Eligibility (MVP).** Eligibility is "holds a voting secret key", enforced by
nullifier uniqueness. The architecture is built so this can be tightened without
touching the UI: replace the nullifier check with a Merkle membership proof over a
`HistoricMerkleTree` of registered student commitments, adding a merkle-path
witness. No centralised login is introduced anywhere.

## Installation

```bash
npm install
cp .env.example .env
```

## Configuration

| Variable | Meaning |
| --- | --- |
| `VITE_MIDNIGHT_NETWORK_ID` | network hint passed to `wallet.connect()` (`undeployed`, `testnet`, `mainnet`) |
| `VITE_NODE_URI` | Midnight node RPC |
| `VITE_INDEXER_URI` / `VITE_INDEXER_WS_URI` | indexer GraphQL endpoints |
| `VITE_PROOF_SERVER_URI` | local proof server |
| `VITE_POLL_CONTRACT_ADDRESS` | address of the deployed poll contract |

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
4. Watch proving → submitting → confirming → *Vote confirmed*.
5. Aggregated results update.
6. Try voting again → *"You have already voted in this poll."*
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
