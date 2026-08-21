import type { LedgerState } from "../poll/types";

/**
 * On-chain runtime wiring.
 *
 * The on-chain path needs three things that cannot be produced by the web
 * build alone:
 *   1. the Compact contract compiled with `compactc` (see contract/README.md),
 *   2. the `@midnight-ntwrk/midnight-js-*` providers,
 *   3. a running proof server + indexer + node.
 *
 * This module reports, truthfully, whether that path is available in the
 * current browser session. It never fabricates transactions: when the
 * artifacts are missing the app runs the identical rule set locally and says
 * so in the UI.
 */

export type RuntimeMode = "chain" | "local";

export interface RuntimeStatus {
  mode: RuntimeMode;
  reason: string;
}

export interface ChainConfig {
  indexerUri: string | undefined;
  indexerWsUri: string | undefined;
  nodeUri: string | undefined;
  proofServerUri: string | undefined;
  contractAddress: string | undefined;
}

export const chainConfig = (): ChainConfig => ({
  indexerUri: import.meta.env["VITE_INDEXER_URI"],
  indexerWsUri: import.meta.env["VITE_INDEXER_WS_URI"],
  nodeUri: import.meta.env["VITE_NODE_URI"],
  proofServerUri: import.meta.env["VITE_PROOF_SERVER_URI"],
  contractAddress: import.meta.env["VITE_POLL_CONTRACT_ADDRESS"],
});

/** Compiled Compact artifacts, emitted by `npm run contract:build`. */
export const loadContractArtifacts = async (): Promise<unknown | null> => {
  const modules = import.meta.glob("../../../contract/managed/**/contract-info.json");
  const entry = Object.values(modules)[0];
  if (!entry) return null;
  try {
    return await entry();
  } catch {
    return null;
  }
};

export const detectRuntime = async (walletConnected: boolean): Promise<RuntimeStatus> => {
  const config = chainConfig();
  const artifacts = await loadContractArtifacts();

  if (!artifacts)
    return {
      mode: "local",
      reason:
        "Compact artifacts not built. Run `npm run contract:build` (needs the compactc compiler) to enable on-chain mode.",
    };
  if (!config.proofServerUri || !config.indexerUri || !config.nodeUri)
    return {
      mode: "local",
      reason:
        "Midnight service URIs are not configured. Set VITE_NODE_URI, VITE_INDEXER_URI and VITE_PROOF_SERVER_URI in .env.",
    };
  if (!config.contractAddress)
    return {
      mode: "local",
      reason: "No deployed poll contract. Run `npm run contract:deploy` and set VITE_POLL_CONTRACT_ADDRESS.",
    };
  if (!walletConnected)
    return { mode: "local", reason: "Connect a Midnight wallet to submit on-chain transactions." };

  return { mode: "chain", reason: "Connected to the Midnight network." };
};

export type { LedgerState };
