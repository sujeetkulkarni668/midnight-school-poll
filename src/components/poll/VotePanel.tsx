import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { usePollApp } from "@/hooks/use-poll-app";
import type { Poll } from "@/lib/poll/types";

export function VotePanel({ poll }: { poll: Poll }) {
  const { vote, hasVoted, phase, wallet } = usePollApp();
  const [choice, setChoice] = useState<string>("");
  const voted = hasVoted(poll.id);

  if (voted)
    return (
      <Card className="border-primary/40 bg-primary/5 p-5">
        <p className="flex items-center gap-2 font-display text-sm font-semibold text-primary">
          <CheckCircle2 className="size-4" /> You have already voted in this poll.
        </p>
        <p className="text-sm text-muted-foreground">
          Your nullifier is spent, so the contract will reject a second vote — and it still does not
          know which option you picked.
        </p>
      </Card>
    );

  if (poll.status === "closed")
    return (
      <Card className="border-border/70 bg-card/80 p-5 text-sm text-muted-foreground">
        This poll is closed. Results below are final.
      </Card>
    );

  return (
    <Card className="card-shadow border-border/70 bg-card/80 p-5">
      <h2 className="font-display text-lg font-semibold">Cast your vote</h2>
      <RadioGroup value={choice} onValueChange={setChoice} className="gap-2">
        {poll.options.map((option, index) => (
          <Label
            key={option}
            htmlFor={`option-${index}`}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm font-normal transition-colors has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/10"
          >
            <RadioGroupItem id={`option-${index}`} value={String(index)} />
            {option}
          </Label>
        ))}
      </RadioGroup>

      <Button
        className="w-full gap-2"
        disabled={choice === "" || phase !== "idle"}
        onClick={() => void vote(poll.id, Number(choice))}
      >
        <Lock className="size-4" />
        {wallet ? "Vote Privately" : "Connect wallet to vote"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Your selection is a private input to the proof. Only an anonymous tally increment is
        published.
      </p>
    </Card>
  );
}
