import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { randomSecretKey, shorten } from "../poll/hash";

/**
 * Midnight DApp Connector integration (connector API 4.x).
 *
 * Live linking support for Lace and 1AM Midnight wallets.
 */

export interface ConnectedWallet {
  rdns: string;
  name: string;
  icon: string;
  apiVersion: string;
  address: string;
  coinPublicKey: string;
  api: ConnectedAPI | null;
  networkId: string;
  isDemo?: boolean;
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
 * 1AM — the Midnight-native wallet (https://1am.xyz).
 */
export const ONE_AM = {
  id: "1am",
  rdns: "xyz.oneam.wallet",
  name: "1AM Wallet",
  site: "https://1am.xyz",
  install: "https://1am.xyz",
} as const;

/**
 * Lace — Light wallet with Midnight integration (https://www.lace.io).
 */
export const LACE = {
  id: "lace",
  rdns: "io.lace.midnight",
  name: "Lace Wallet",
  site: "https://www.lace.io",
  install: "https://www.lace.io",
} as const;

export const DEMO_WALLET = {
  id: "demo",
  rdns: "campus.student.demo",
  name: "Campus Demo ID",
  site: "#",
  install: "#",
} as const;

export const isOneAm = (wallet: { rdns?: string; name?: string }): boolean =>
  /(^|[^a-z0-9])1am([^a-z0-9]|$)/i.test(`${wallet.rdns ?? ""} ${wallet.name ?? ""}`);

export const isLace = (wallet: { rdns?: string; name?: string }): boolean =>
  /lace/i.test(`${wallet.rdns ?? ""} ${wallet.name ?? ""}`);

const isRejectError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message : String(error);
  return /reject|denied|cancel|closed|declined|disallowed|aborted/i.test(msg);
};

/** Find injected Lace Midnight connector */
export const findLaceWallet = (): InitialAPI | null => {
  if (typeof window === "undefined") return null;
  const win = window as unknown as Record<string, unknown>;

  // 1. Check window.midnight object
  const midnightObj = win["midnight"] as Record<string, InitialAPI> | undefined;
  if (midnightObj && typeof midnightObj === "object") {
    if (midnightObj["mnLace"] && typeof midnightObj["mnLace"].connect === "function") {
      return midnightObj["mnLace"];
    }
    if (
      midnightObj["io.lace.midnight"] &&
      typeof midnightObj["io.lace.midnight"].connect === "function"
    ) {
      return midnightObj["io.lace.midnight"];
    }
    if (midnightObj["lace"] && typeof midnightObj["lace"].connect === "function") {
      return midnightObj["lace"];
    }
    if (
      midnightObj["lace-midnight"] &&
      typeof midnightObj["lace-midnight"].connect === "function"
    ) {
      return midnightObj["lace-midnight"];
    }
    for (const [k, v] of Object.entries(midnightObj)) {
      if (v && typeof v.connect === "function" && isLace({ rdns: v.rdns || k, name: v.name })) {
        return v;
      }
    }
  }

  // 2. Check direct window globals
  const directMnLace = win["mnLace"] as InitialAPI | undefined;
  if (directMnLace && typeof directMnLace.connect === "function") return directMnLace;

  const directLace = win["lace"] as InitialAPI | undefined;
  if (directLace && typeof directLace.connect === "function") return directLace;

  // 3. Check window.cardano namespace if midnight connector is exposed there
  const cardanoObj = win["cardano"] as Record<string, unknown> | undefined;
  const cardanoLace = cardanoObj?.["lace"] as Record<string, unknown> | undefined;
  if (cardanoLace && typeof cardanoLace["midnight"] === "object") {
    const cardanoMidnight = cardanoLace["midnight"] as InitialAPI;
    if (cardanoMidnight && typeof cardanoMidnight.connect === "function") return cardanoMidnight;
  }
  const cardanoMnLace = cardanoObj?.["mnLace"] as InitialAPI | undefined;
  if (cardanoMnLace && typeof cardanoMnLace.connect === "function") {
    return cardanoMnLace;
  }

  return null;
};

export interface CardanoLaceExtension {
  enable: () => Promise<{
    getChangeAddress?: () => Promise<string>;
    getUsedAddresses?: () => Promise<string[]>;
    getUnusedAddresses?: () => Promise<string[]>;
    getRewardAddresses?: () => Promise<string[]>;
  }>;
  isEnabled?: () => Promise<boolean>;
  name?: string;
  icon?: string;
  apiVersion?: string;
}

/** Find injected Lace Cardano connector (window.cardano.lace) */
export const findCardanoLace = (): CardanoLaceExtension | null => {
  if (typeof window === "undefined") return null;
  const win = window as unknown as Record<string, unknown>;
  const cardano = win["cardano"] as Record<string, CardanoLaceExtension> | undefined;
  if (cardano?.["lace"] && typeof cardano["lace"].enable === "function") {
    return cardano["lace"];
  }
  return null;
};

/** Find injected 1AM wallet */
export const find1AmWallet = (): InitialAPI | null => {
  if (typeof window === "undefined") return null;
  const win = window as unknown as Record<string, unknown>;

  const midnightObj = win["midnight"] as Record<string, InitialAPI> | undefined;
  if (midnightObj && typeof midnightObj === "object") {
    if (midnightObj["1am"] && typeof midnightObj["1am"].connect === "function")
      return midnightObj["1am"];
    if (
      midnightObj["xyz.oneam.wallet"] &&
      typeof midnightObj["xyz.oneam.wallet"].connect === "function"
    ) {
      return midnightObj["xyz.oneam.wallet"];
    }
    for (const [k, v] of Object.entries(midnightObj)) {
      if (v && typeof v.connect === "function" && isOneAm({ rdns: v.rdns || k, name: v.name })) {
        return v;
      }
    }
  }

  const direct1Am = (win["oneAm"] || win["1am"]) as InitialAPI | undefined;
  if (direct1Am && typeof direct1Am.connect === "function") return direct1Am;

  return null;
};

export const listInjectedWallets = (): InitialAPI[] => {
  if (typeof window === "undefined") return [];

  const found: InitialAPI[] = [];
  const midnightObj = (window as unknown as { midnight?: Record<string, InitialAPI> }).midnight;

  if (midnightObj && typeof midnightObj === "object") {
    for (const val of Object.values(midnightObj)) {
      if (val && typeof val.connect === "function" && !found.includes(val)) {
        found.push(val);
      }
    }
  }

  const lace = findLaceWallet();
  if (lace && !found.includes(lace)) {
    found.push(lace);
  }

  const oneAm = find1AmWallet();
  if (oneAm && !found.includes(oneAm)) {
    found.push(oneAm);
  }

  return found.sort((a, b) => {
    if (isLace(a)) return -1;
    if (isLace(b)) return 1;
    if (isOneAm(a)) return -1;
    if (isOneAm(b)) return 1;
    return 0;
  });
};

export const isLaceInstalled = () => Boolean(findLaceWallet() || findCardanoLace());
export const isOneAmInstalled = () => Boolean(find1AmWallet());
export const isWalletInstalled = () =>
  isLaceInstalled() || isOneAmInstalled() || listInjectedWallets().length > 0;

export interface WalletOption {
  rdns: string;
  name: string;
  icon: string;
  isOneAm: boolean;
  isLace: boolean;
  installed: boolean;
}

export const listWalletOptions = (): WalletOption[] => {
  const injected = listInjectedWallets();
  const options: WalletOption[] = [];

  // Lace option
  const laceInjected = findLaceWallet();
  const cardanoLace = findCardanoLace();
  options.push({
    rdns: laceInjected?.rdns ?? LACE.rdns,
    name: laceInjected?.name ?? cardanoLace?.name ?? LACE.name,
    icon: laceInjected?.icon ?? cardanoLace?.icon ?? "",
    isOneAm: false,
    isLace: true,
    installed: Boolean(laceInjected || cardanoLace),
  });

  // 1AM option
  const oneAmInjected = find1AmWallet();
  options.push({
    rdns: oneAmInjected?.rdns ?? ONE_AM.rdns,
    name: oneAmInjected?.name ?? ONE_AM.name,
    icon: oneAmInjected?.icon ?? "",
    isOneAm: true,
    isLace: false,
    installed: Boolean(oneAmInjected),
  });

  // Any other injected wallets
  for (const w of injected) {
    if (!isOneAm(w) && !isLace(w) && !options.some((o) => o.rdns === w.rdns)) {
      options.push({
        rdns: w.rdns,
        name: w.name,
        icon: w.icon,
        isOneAm: false,
        isLace: false,
        installed: true,
      });
    }
  }

  return options;
};

export const NETWORK_ID = import.meta.env["VITE_MIDNIGHT_NETWORK_ID"] ?? "testnet-02";

/**
 * Connect to a live wallet extension.
 * Connects directly to Lace or 1AM by requesting user permission.
 */
export const connectWallet = async (preferred?: string): Promise<ConnectedWallet> => {
  // Explicit Demo Student Wallet connection
  if (preferred === DEMO_WALLET.rdns || preferred === "demo") {
    return createSimulatedWallet(DEMO_WALLET.name, DEMO_WALLET.rdns, null, true);
  }

  // 1. Explicit Lace selection
  if (preferred === LACE.rdns || /lace/i.test(preferred || "")) {
    return connectLaceWallet();
  }

  // 2. Explicit 1AM selection
  if (preferred === ONE_AM.rdns || /1am/i.test(preferred || "")) {
    return connect1AmWallet();
  }

  // 3. Any other injected wallet selected by RDNS
  if (preferred) {
    const injected = listInjectedWallets().find((w) => w.rdns === preferred);
    if (injected) {
      try {
        const api = await injected.connect(NETWORK_ID);
        const addrs = await api.getShieldedAddresses?.().catch(() => null);
        const unshielded = await api.getUnshieldedAddress?.().catch(() => null);
        const address =
          addrs?.shieldedAddress || unshielded?.unshieldedAddress || `mn1_${preferred}`;
        const coinPublicKey = addrs?.shieldedCoinPublicKey || address;

        return {
          rdns: injected.rdns,
          name: injected.name,
          icon: injected.icon,
          apiVersion: injected.apiVersion,
          address,
          coinPublicKey,
          api,
          networkId: NETWORK_ID,
          isDemo: false,
        };
      } catch (err) {
        if (isRejectError(err)) {
          throw new WalletError(
            "REJECTED",
            `You declined the connection request in ${injected.name}.`,
          );
        }
        throw new WalletError(
          "FAILED",
          `Failed to connect to ${injected.name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // 4. Generic / first available installed wallet
  if (isLaceInstalled()) {
    return connectLaceWallet();
  }

  if (isOneAmInstalled()) {
    return connect1AmWallet();
  }

  const otherWallets = listInjectedWallets();
  if (otherWallets.length > 0) {
    return connectWallet(otherWallets[0].rdns);
  }

  // If no wallet is installed at all, clearly explain rather than silently creating fake keys
  throw new WalletError(
    "NOT_INSTALLED",
    "No Midnight wallet extension detected. Please install Lace Wallet or 1AM Wallet, or use Campus Demo ID to test instantly.",
  );
};

/** Specialized live connection flow for Lace Wallet taking extension permission */
async function connectLaceWallet(): Promise<ConnectedWallet> {
  const midnightLace = findLaceWallet();
  const cardanoLace = findCardanoLace();

  if (!midnightLace && !cardanoLace) {
    throw new WalletError(
      "NOT_INSTALLED",
      "Lace Wallet extension is not detected. Please install the Lace extension (https://www.lace.io) and ensure it is enabled in your browser.",
    );
  }

  // Path A: Check for Midnight Lace connector (window.midnight.mnLace / io.lace.midnight)
  if (midnightLace && typeof midnightLace.connect === "function") {
    try {
      let api: ConnectedAPI | null = null;
      try {
        api = await midnightLace.connect(NETWORK_ID);
      } catch (netErr) {
        if (isRejectError(netErr)) {
          throw new WalletError("REJECTED", "You declined the connection request in Lace.");
        }
        // If connect with networkId threw due to network arg, retry with empty network or no arg
        try {
          api = await (midnightLace.connect as (net?: string) => Promise<ConnectedAPI>)();
        } catch (retryErr) {
          if (isRejectError(retryErr)) {
            throw new WalletError("REJECTED", "You declined the connection request in Lace.");
          }
          if (!cardanoLace) {
            throw retryErr;
          }
        }
      }

      if (api) {
        let shieldedAddr = "";
        let coinPk = "";
        let unshieldedAddr = "";

        try {
          const addrs = await api.getShieldedAddresses?.();
          if (addrs) {
            shieldedAddr = addrs.shieldedAddress || "";
            coinPk = addrs.shieldedCoinPublicKey || "";
          }
        } catch (err) {
          console.warn("Lace getShieldedAddresses info:", err);
        }

        if (!shieldedAddr) {
          try {
            const unshielded = await api.getUnshieldedAddress?.();
            if (unshielded) {
              unshieldedAddr = unshielded.unshieldedAddress || "";
            }
          } catch (err) {
            console.warn("Lace getUnshieldedAddress info:", err);
          }
        }

        const address = shieldedAddr || unshieldedAddr || coinPk;
        const coinPublicKey = coinPk || shieldedAddr || unshieldedAddr;

        if (!address) {
          throw new WalletError(
            "FAILED",
            "Connected to Lace, but could not retrieve account address.",
          );
        }

        return {
          rdns: midnightLace.rdns || LACE.rdns,
          name: midnightLace.name || "Lace Wallet",
          icon: midnightLace.icon || "",
          apiVersion: midnightLace.apiVersion || "4.0.0",
          address,
          coinPublicKey,
          api,
          networkId: NETWORK_ID,
          isDemo: false,
        };
      }
    } catch (err) {
      if (err instanceof WalletError) throw err;
      if (isRejectError(err)) {
        throw new WalletError("REJECTED", "You declined the connection request in Lace.");
      }
      if (!cardanoLace) {
        throw new WalletError(
          "FAILED",
          `Failed to connect to Lace: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // Path B: Check for Cardano Lace connector (window.cardano.lace.enable())
  if (cardanoLace && typeof cardanoLace.enable === "function") {
    try {
      const cardanoApi = await cardanoLace.enable();
      let address = "";

      if (typeof cardanoApi.getChangeAddress === "function") {
        address = await cardanoApi.getChangeAddress();
      } else if (typeof cardanoApi.getUsedAddresses === "function") {
        const addrs = await cardanoApi.getUsedAddresses();
        address = addrs[0] || "";
      } else if (typeof cardanoApi.getUnusedAddresses === "function") {
        const addrs = await cardanoApi.getUnusedAddresses();
        address = addrs[0] || "";
      } else if (typeof cardanoApi.getRewardAddresses === "function") {
        const addrs = await cardanoApi.getRewardAddresses();
        address = addrs[0] || "";
      }

      if (!address) {
        throw new WalletError("FAILED", "Connected to Lace, but no account address was returned.");
      }

      return {
        rdns: LACE.rdns,
        name: cardanoLace.name || "Lace Wallet",
        icon: cardanoLace.icon || "",
        apiVersion: cardanoLace.apiVersion || "1.0.0",
        address,
        coinPublicKey: address,
        api: null,
        networkId: NETWORK_ID,
        isDemo: false,
      };
    } catch (err) {
      if (err instanceof WalletError) throw err;
      if (isRejectError(err)) {
        throw new WalletError("REJECTED", "You declined the connection request in Lace.");
      }
      throw new WalletError(
        "FAILED",
        `Failed to connect to Lace: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  throw new WalletError("FAILED", "Could not establish connection with Lace wallet extension.");
}

/** Specialized live connection flow for 1AM Wallet taking extension permission */
async function connect1AmWallet(): Promise<ConnectedWallet> {
  const oneAm = find1AmWallet();
  if (!oneAm) {
    throw new WalletError(
      "NOT_INSTALLED",
      "1AM Wallet extension is not detected. Please install 1AM Wallet (https://1am.xyz) and ensure it is enabled in your browser.",
    );
  }

  try {
    let api: ConnectedAPI | null = null;
    try {
      api = await oneAm.connect(NETWORK_ID);
    } catch (netErr) {
      if (isRejectError(netErr)) {
        throw new WalletError("REJECTED", "You declined the connection request in 1AM.");
      }
      api = await (oneAm.connect as (net?: string) => Promise<ConnectedAPI>)();
    }

    if (!api) {
      throw new WalletError("FAILED", "1AM Wallet did not return a connected API session.");
    }

    let shieldedAddr = "";
    let coinPk = "";
    let unshieldedAddr = "";

    try {
      const addrs = await api.getShieldedAddresses?.();
      if (addrs) {
        shieldedAddr = addrs.shieldedAddress || "";
        coinPk = addrs.shieldedCoinPublicKey || "";
      }
    } catch (err) {
      console.warn("1AM getShieldedAddresses info:", err);
    }

    if (!shieldedAddr) {
      try {
        const unshielded = await api.getUnshieldedAddress?.();
        if (unshielded) {
          unshieldedAddr = unshielded.unshieldedAddress || "";
        }
      } catch (err) {
        console.warn("1AM getUnshieldedAddress info:", err);
      }
    }

    const address = shieldedAddr || unshieldedAddr || coinPk;
    const coinPublicKey = coinPk || shieldedAddr || unshieldedAddr;

    if (!address) {
      throw new WalletError("FAILED", "Connected to 1AM, but could not retrieve account address.");
    }

    return {
      rdns: oneAm.rdns || ONE_AM.rdns,
      name: oneAm.name || "1AM Wallet",
      icon: oneAm.icon || "",
      apiVersion: oneAm.apiVersion || "4.0.0",
      address,
      coinPublicKey,
      api,
      networkId: NETWORK_ID,
      isDemo: false,
    };
  } catch (err) {
    if (err instanceof WalletError) throw err;
    if (isRejectError(err)) {
      throw new WalletError("REJECTED", "You declined the connection request in 1AM.");
    }
    throw new WalletError(
      "FAILED",
      `Failed to connect to 1AM: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Simulated test wallet for the instant Campus Demo ID option */
export const createSimulatedWallet = (
  name: string,
  rdns: string,
  api: ConnectedAPI | null = null,
  isDemo = true,
): ConnectedWallet => {
  const existingKey = window.localStorage.getItem(`pcp:sim_wallet:${rdns}`);
  const key = existingKey || randomSecretKey();
  if (!existingKey) {
    window.localStorage.setItem(`pcp:sim_wallet:${rdns}`, key);
  }
  const cleanKey = key
    .replace(/[^a-f0-9]/gi, "")
    .padEnd(64, "0")
    .slice(0, 64);
  const address = `mn1shielded${cleanKey.slice(0, 24)}`;
  const coinPublicKey = `pk_${cleanKey.slice(0, 24)}`;

  return {
    rdns,
    name,
    icon: "",
    apiVersion: "4.0.0",
    address,
    coinPublicKey,
    api,
    networkId: "simulation",
    isDemo,
  };
};
