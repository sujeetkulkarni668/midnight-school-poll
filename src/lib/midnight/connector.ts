import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

/**
 * Midnight DApp Connector integration (connector API 4.x).
 *
 * Wallets inject one or more `InitialAPI` objects under `window.midnight`.
 * We pick one, call `connect(networkId)` and read the shielded address of the
 * connected account. Nothing here is mocked: if no wallet is installed the
 * call fails with a clear, student-readable error.
 */

export interface ConnectedWallet {
  rdns: string;
  name: string;
  icon: string;
  apiVersion: string;
  address: string;
  coinPublicKey: string;
  api: ConnectedAPI;
  networkId: string;
}

export type WalletErrorCode = "NOT_INSTALLED" | "REJECTED" | "FAILED";

export class WalletError extends Error {
  constructor(
    readonly code: WalletErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WalletError";
  }
}

/**
 * 1AM — the first wallet built for Midnight (https://1am.xyz).
 * It injects a standard DApp Connector v4 provider, so no special-casing is
 * needed beyond recognising it and preferring it when present.
 */
export const ONE_AM = {
  id: "1am",
  name: "1AM Wallet",
  site: "https://1am.xyz",
  install: "https://1am.xyz",
} as const;

const isOneAm = (wallet: { rdns?: string; name?: string }) =>
  /(^|[^a-z0-9])1am([^a-z0-9]|$)/i.test(`${wallet.rdns ?? ""} ${wallet.name ?? ""}`);

export const listWallets = (): InitialAPI[] => {
  if (typeof window === "undefined" || !window.midnight) return [];
  const wallets = Object.values(window.midnight).filter(
    (entry): entry is InitialAPI => typeof entry?.connect === "function",
  );
  // 1AM first, everything else after.
  return wallets.sort((a, b) => Number(isOneAm(b)) - Number(isOneAm(a)));
};

export const isWalletInstalled = () => listWallets().length > 0;

export const isOneAmInstalled = () => listWallets().some(isOneAm);

export interface WalletOption {
  rdns: string;
  name: string;
  icon: string;
  isOneAm: boolean;
}

export const listWalletOptions = (): WalletOption[] =>
  listWallets().map((wallet) => ({
    rdns: wallet.rdns,
    name: wallet.name,
    icon: wallet.icon,
    isOneAm: isOneAm(wallet),
  }));

export const NETWORK_ID = import.meta.env["VITE_MIDNIGHT_NETWORK_ID"] ?? "undeployed";

export const connectWallet = async (preferred?: string): Promise<ConnectedWallet> => {
  const wallets = listWallets();
  const wallet = preferred ? wallets.find((w) => w.rdns === preferred) : wallets[0];

  if (!wallet)
    throw new WalletError(
      "NOT_INSTALLED",
      "No Midnight wallet detected. Install 1AM from https://1am.xyz (or the Lace Midnight extension), then reload this page.",
    );



  let api: ConnectedAPI;
  try {
    api = await wallet.connect(NETWORK_ID);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new WalletError(
      /reject|denied|cancel/i.test(message) ? "REJECTED" : "FAILED",
      /reject|denied|cancel/i.test(message)
        ? "You declined the connection request in your wallet."
        : `The wallet refused the connection: ${message}`,
    );
  }

  try {
    const addresses = await api.getShieldedAddresses();
    return {
      rdns: wallet.rdns,
      name: wallet.name,
      icon: wallet.icon,
      apiVersion: wallet.apiVersion,
      address: addresses.shieldedAddress,
      coinPublicKey: addresses.shieldedCoinPublicKey,
      api,
      networkId: NETWORK_ID,
    };
  } catch (error) {
    throw new WalletError(
      "FAILED",
      `Connected, but the wallet did not return an account: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};
