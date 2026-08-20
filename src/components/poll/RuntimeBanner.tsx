import { Info } from "lucide-react";
import { usePollApp } from "@/hooks/use-poll-app";

export function RuntimeBanner() {
  const { runtime } = usePollApp();
  if (!runtime || runtime.mode === "chain") return null;

  return (
    <div className="border-b border-accent/30 bg-accent/10">
      <div className="mx-auto flex max-w-5xl items-start gap-2 px-4 py-2.5 text-xs text-accent">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p>
          <span className="font-semibold">Local simulation mode.</span> The exact contract rules run
          in your browser, but no zero-knowledge proof is generated and nothing is submitted to the
          Midnight network. {runtime.reason}
        </p>
      </div>
    </div>
  );
}
