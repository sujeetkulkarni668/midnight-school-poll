import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  castVote as engineVote,
  closePoll as engineClose,
  createPoll as engineCreate,
  hasVoted as engineHasVoted,
  listPolls,
  resultsFor,
} from "@/lib/poll/engine";
import { loadLedger, loadSecretKey, resetLedger, saveLedger, seedLedger } from "@/lib/poll/storage";
import { friendlyError, type LedgerState, type Poll, type PollResults } from "@/lib/poll/types";
import {
  connectWallet,
  isWalletInstalled,
  listWalletOptions,
  NETWORK_ID,
  ONE_AM,
  LACE,
  DEMO_WALLET,
  type ConnectedWallet,
  type WalletOption,
} from "@/lib/midnight/connector";
import { detectRuntime, type RuntimeStatus } from "@/lib/midnight/chain";

export type TxPhase = "idle" | "connecting" | "proving" | "submitting" | "confirming";

interface PollAppValue {
  ready: boolean;
  wallet: ConnectedWallet | null;
  walletInstalled: boolean;
  walletOptions: WalletOption[];
  runtime: RuntimeStatus | null;
  phase: TxPhase;
  polls: Poll[];
  ledger: LedgerState;
  connect: (preferred?: string) => Promise<void>;
  disconnect: () => void;
  createPoll: (question: string, options: string[]) => Promise<number | null>;
  vote: (pollId: number, choice: number) => Promise<boolean>;
  close: (pollId: number) => Promise<void>;
  hasVoted: (pollId: number) => boolean;
  results: (pollId: number) => PollResults | null;
  reset: () => void;
}

const PollAppContext = createContext<PollAppValue | null>(null);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function PollAppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [walletInstalled, setWalletInstalled] = useState(false);
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [secretKey, setSecretKey] = useState<string>("");
  const [ledger, setLedger] = useState<LedgerState>(() => seedLedger());

  useEffect(() => {
    setLedger(loadLedger() ?? seedLedger());
    setSecretKey(loadSecretKey("local"));
    
    const refreshWallets = () => {
      setWalletInstalled(isWalletInstalled());
      setWalletOptions(listWalletOptions());
    };

    refreshWallets();
    void detectRuntime(false).then(setRuntime);
    setReady(true);

    // Extension content scripts often inject with a slight delay
    const intervals = [100, 300, 600, 1200, 2500].map((delay) =>
      setTimeout(refreshWallets, delay),
    );

    window.addEventListener("load", refreshWallets);
    window.addEventListener("focus", refreshWallets);

    return () => {
      intervals.forEach(clearTimeout);
      window.removeEventListener("load", refreshWallets);
      window.removeEventListener("focus", refreshWallets);
    };
  }, []);

  const commit = useCallback((next: LedgerState) => {
    setLedger(next);
    saveLedger(next);
  }, []);

  const connect = useCallback(async (preferred?: string) => {
    setPhase("connecting");
    try {
      const connected = await connectWallet(preferred);
      setWallet(connected);
      setSecretKey(loadSecretKey(connected.coinPublicKey));
      setRuntime(await detectRuntime(true));
      toast.success("Wallet connected", { description: connected.name });
    } catch (error) {
      toast.error("Could not connect", { description: friendlyError(error) });
    } finally {
      setPhase("idle");
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setSecretKey(loadSecretKey("local"));
    void detectRuntime(false).then(setRuntime);
  }, []);

  const requireWallet = () => {
    if (!wallet) {
      toast.error("Connect your wallet first", {
        description: "Voting needs a Midnight account so your private voting key can be derived.",
      });
      return false;
    }
    return true;
  };

  const createPoll = useCallback(
    async (question: string, options: string[]) => {
      if (!requireWallet()) return null;
      try {
        setPhase("proving");
        await wait(220);
        setPhase("submitting");
        const { ledger: next, poll } = engineCreate(ledger, { question, options }, secretKey);
        setPhase("confirming");
        await wait(180);
        commit(next);
        toast.success("Poll created", { description: poll.question });
        return poll.id;
      } catch (error) {
        toast.error("Poll not created", { description: friendlyError(error) });
        return null;
      } finally {
        setPhase("idle");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger, secretKey, wallet, commit],
  );

  const vote = useCallback(
    async (pollId: number, choice: number) => {
      if (!requireWallet()) return false;
      try {
        setPhase("proving");
        await wait(400);
        setPhase("submitting");
        const { ledger: next } = engineVote(ledger, pollId, choice, secretKey);
        setPhase("confirming");
        await wait(250);
        commit(next);
        toast.success("Vote confirmed", {
          description: "Your choice stays private — only the aggregate tally changed.",
        });
        return true;
      } catch (error) {
        toast.error("Vote rejected", { description: friendlyError(error) });
        return false;
      } finally {
        setPhase("idle");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger, secretKey, wallet, commit],
  );

  const close = useCallback(
    async (pollId: number) => {
      if (!requireWallet()) return;
      try {
        commit(engineClose(ledger, pollId, secretKey));
        toast.success("Poll closed");
      } catch (error) {
        toast.error("Could not close poll", { description: friendlyError(error) });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger, secretKey, wallet, commit],
  );

  const value = useMemo<PollAppValue>(
    () => ({
      ready,
      wallet,
      walletInstalled,
      walletOptions,
      runtime,
      phase,
      ledger,
      polls: listPolls(ledger),
      connect,
      disconnect,
      createPoll,
      vote,
      close,
      hasVoted: (pollId: number) => (secretKey ? engineHasVoted(ledger, pollId, secretKey) : false),
      results: (pollId: number) => {
        try {
          return resultsFor(ledger, pollId);
        } catch {
          return null;
        }
      },
      reset: () => {
        resetLedger();
        setLedger(seedLedger());
      },
    }),
    [
      ready,
      wallet,
      walletInstalled,
      walletOptions,
      runtime,
      phase,
      ledger,
      secretKey,
      connect,
      disconnect,
      createPoll,
      vote,
      close,
    ],
  );

  return <PollAppContext.Provider value={value}>{children}</PollAppContext.Provider>;
}

export function usePollApp() {
  const context = useContext(PollAppContext);
  if (!context) throw new Error("usePollApp must be used inside <PollAppProvider>");
  return context;
}

export { NETWORK_ID, ONE_AM, LACE, DEMO_WALLET };
