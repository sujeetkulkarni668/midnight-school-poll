# Private Campus Poll — Compact contract

`src/private-campus-poll.compact` is the on-chain program. It is written for
Compact `language_version >= 0.16` (Midnight SDK 4.x), the same generation the
official [`example-bboard`](https://github.com/midnightntwrk/example-bboard)
targets.

## Prerequisites

The Compact compiler is a native binary and is **not** an npm dependency:

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update            # installs the latest toolchain
export PATH="$HOME/.compact/bin:$PATH"
```

You also need Docker for the proof server:

```bash
docker run -p 6300:6300 midnightnetwork/proof-server:latest -- \
  'midnight-proof-server --network undeployed'
```

## Build

```bash
cd contract
npm run build        # fast, skips ZK key generation
npm run build:zk     # full build: verifier/prover keys + zkir
```

Artifacts land in `contract/managed/private-campus-poll/`. The web app auto-detects them
(`src/lib/midnight/chain.ts`) and switches from local simulation to on-chain
mode once they exist and the service URIs are configured.

## Deploy

Deployment uses `@midnight-ntwrk/midnight-js-contracts`
(`deployContract({ contract, initialPrivateState, providers })`) exactly as the
bboard reference does. Deploy from a Node CLI (the SDK's proof/indexer
providers are Node-oriented), then copy the returned contract address into
`.env` as `VITE_POLL_CONTRACT_ADDRESS`.

## Circuits

| Circuit | Public effect | Private input |
| --- | --- | --- |
| `createPoll` | appends a poll, bumps `pollCount` | creator's secret key (only its commitment is stored) |
| `closePoll` | flips status to `closed` | creator's secret key (proves ownership) |
| `vote` | inserts a nullifier, bumps one anonymous tally slot | secret key + chosen option |
