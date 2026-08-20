import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { WalletButton } from "./WalletButton";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="size-4" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">
            Private Campus Poll
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/"
            className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Polls
          </Link>
          <WalletButton />
        </nav>
      </div>
    </header>
  );
}
