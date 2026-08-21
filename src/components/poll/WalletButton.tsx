import { ExternalLink, Loader2, LogOut, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePollApp, ONE_AM, LACE, DEMO_WALLET } from "@/hooks/use-poll-app";
import { shorten } from "@/lib/poll/hash";

export function WalletButton() {
  const { wallet, connect, disconnect, phase, walletOptions } = usePollApp();

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground shadow-sm">
          {wallet.icon ? (
            <img src={wallet.icon} alt="" aria-hidden className="size-4 rounded-sm" />
          ) : (
            <Wallet className="size-3.5 text-primary" />
          )}
          <span className="font-sans font-medium text-foreground">
            {wallet.name.replace(/ wallet/i, "")}
          </span>
          <span className="opacity-70">({shorten(wallet.address, 6, 4)})</span>
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          title="Disconnect wallet"
          aria-label="Disconnect wallet"
          onClick={disconnect}
        >
          <LogOut className="size-3.5" />
        </Button>
      </div>
    );
  }

  const connecting = phase === "connecting";

  const oneAmOption = walletOptions.find((o) => o.isOneAm) || {
    rdns: ONE_AM.rdns,
    name: ONE_AM.name,
    icon: "",
    isOneAm: true,
    isLace: false,
    installed: false,
  };

  const laceOption = walletOptions.find((o) => o.isLace) || {
    rdns: LACE.rdns,
    name: LACE.name,
    icon: "",
    isOneAm: false,
    isLace: true,
    installed: false,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={connecting} className="gap-2 shadow-sm">
          {connecting ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
          {connecting ? "Connecting…" : "Connect Wallet"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">
          Select Midnight Wallet
        </DropdownMenuLabel>

        {/* 1AM Wallet Option */}
        <DropdownMenuItem
          className="flex cursor-pointer items-center justify-between gap-2 px-2.5 py-2"
          onSelect={() => void connect(oneAmOption.rdns)}
        >
          <div className="flex items-center gap-2.5">
            {oneAmOption.icon ? (
              <img src={oneAmOption.icon} alt="" aria-hidden className="size-4 rounded-sm" />
            ) : (
              <Wallet className="size-4 text-emerald-400" />
            )}
            <div className="flex flex-col">
              <span className="font-medium text-sm text-foreground">1AM Wallet</span>
              <span className="text-[10px] text-muted-foreground">Midnight native</span>
            </div>
          </div>
          {oneAmOption.installed ? (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
              Installed
            </span>
          ) : (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Connect
            </span>
          )}
        </DropdownMenuItem>

        {/* Lace Wallet Option */}
        <DropdownMenuItem
          className="flex cursor-pointer items-center justify-between gap-2 px-2.5 py-2"
          onSelect={() => void connect(laceOption.rdns)}
        >
          <div className="flex items-center gap-2.5">
            {laceOption.icon ? (
              <img src={laceOption.icon} alt="" aria-hidden className="size-4 rounded-sm" />
            ) : (
              <Wallet className="size-4 text-cyan-400" />
            )}
            <div className="flex flex-col">
              <span className="font-medium text-sm text-foreground">Lace Wallet</span>
              <span className="text-[10px] text-muted-foreground">Midnight & Cardano</span>
            </div>
          </div>
          {laceOption.installed ? (
            <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-400">
              Installed
            </span>
          ) : (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Connect
            </span>
          )}
        </DropdownMenuItem>

        {/* Demo Student Wallet Option */}
        <DropdownMenuItem
          className="flex cursor-pointer items-center justify-between gap-2 px-2.5 py-2"
          onSelect={() => void connect(DEMO_WALLET.rdns)}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-amber-400" />
            <div className="flex flex-col">
              <span className="font-medium text-sm text-foreground">Campus Demo ID</span>
              <span className="text-[10px] text-muted-foreground">Instant test wallet</span>
            </div>
          </div>
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
            Instant
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        <div className="px-2 py-1 text-[11px] text-muted-foreground">
          <span>Need a wallet?</span>
        </div>

        <DropdownMenuItem asChild>
          <a
            href={ONE_AM.install}
            target="_blank"
            rel="noreferrer noopener"
            className="flex cursor-pointer items-center justify-between px-2.5 py-1.5 text-xs"
          >
            <span>Get 1AM Wallet</span>
            <ExternalLink className="size-3 opacity-60" />
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a
            href={LACE.install}
            target="_blank"
            rel="noreferrer noopener"
            className="flex cursor-pointer items-center justify-between px-2.5 py-1.5 text-xs"
          >
            <span>Get Lace Wallet</span>
            <ExternalLink className="size-3 opacity-60" />
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
