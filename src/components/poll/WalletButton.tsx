import { ExternalLink, Loader2, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePollApp, ONE_AM } from "@/hooks/use-poll-app";
import { shorten } from "@/lib/poll/hash";

export function WalletButton() {
  const { wallet, connect, disconnect, phase, walletOptions } = usePollApp();

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
          {wallet.icon ? (
            <img src={wallet.icon} alt="" aria-hidden className="size-4 rounded-sm" />
          ) : null}
          {shorten(wallet.address, 8, 6)}
        </span>
        <Button variant="ghost" size="icon" aria-label="Disconnect wallet" onClick={disconnect}>
          <LogOut className="size-4" />
        </Button>
      </div>
    );
  }

  const connecting = phase === "connecting";

  // No Midnight wallet injected — point students at 1AM, the Midnight-native wallet.
  if (walletOptions.length === 0) {
    return (
      <Button asChild className="gap-2">
        <a href={ONE_AM.install} target="_blank" rel="noreferrer noopener">
          <Wallet className="size-4" />
          Get {ONE_AM.name}
          <ExternalLink className="size-3.5 opacity-70" />
        </a>
      </Button>
    );
  }

  if (walletOptions.length === 1) {
    const only = walletOptions[0]!;
    return (
      <Button onClick={() => void connect(only.rdns)} disabled={connecting} className="gap-2">
        {connecting ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
        {connecting ? "Connecting…" : `Connect ${only.name}`}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={connecting} className="gap-2">
          {connecting ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
          {connecting ? "Connecting…" : "Connect Wallet"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Midnight wallets</DropdownMenuLabel>
        {walletOptions.map((option) => (
          <DropdownMenuItem
            key={option.rdns}
            className="gap-2"
            onSelect={() => void connect(option.rdns)}
          >
            {option.icon ? (
              <img src={option.icon} alt="" aria-hidden className="size-4 rounded-sm" />
            ) : (
              <Wallet className="size-4" />
            )}
            <span className="flex-1 truncate">{option.name}</span>
            {option.isOneAm ? (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Native
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={ONE_AM.site} target="_blank" rel="noreferrer noopener" className="gap-2">
            <ExternalLink className="size-3.5" />
            About {ONE_AM.name}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
