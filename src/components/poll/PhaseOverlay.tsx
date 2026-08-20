import { Loader2 } from "lucide-react";
import type { TxPhase } from "@/hooks/use-poll-app";

const copy: Record<Exclude<TxPhase, "idle">, string> = {
  connecting: "Waiting for your wallet…",
  proving: "Generating zero-knowledge proof…",
  submitting: "Submitting the transaction…",
  confirming: "Waiting for confirmation…",
};

export function PhaseOverlay({ phase }: { phase: TxPhase }) {
  if (phase === "idle") return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="card-shadow glow-ring flex items-center gap-3 rounded-xl border border-border bg-card px-6 py-4">
        <Loader2 className="size-4 animate-spin text-primary" />
        <div>
          <p className="font-display text-sm font-semibold">{copy[phase]}</p>
          <p className="text-xs text-muted-foreground">Your choice never leaves this device.</p>
        </div>
      </div>
    </div>
  );
}
