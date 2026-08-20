import { Link } from "@tanstack/react-router";
import { CheckCircle2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePollApp } from "@/hooks/use-poll-app";
import type { Poll } from "@/lib/poll/types";

export function PollCard({ poll }: { poll: Poll }) {
  const { results, hasVoted } = usePollApp();
  const total = results(poll.id)?.total ?? 0;
  const voted = hasVoted(poll.id);

  return (
    <Link to="/polls/$pollId" params={{ pollId: String(poll.id) }} className="block">
      <Card className="card-shadow gap-3 border-border/70 bg-card/80 p-5 transition-colors hover:border-primary/50">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-snug">{poll.question}</h3>
          <Badge variant={poll.status === "open" ? "default" : "secondary"} className="shrink-0">
            {poll.status === "open" ? "Open" : "Closed"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {poll.options.map((option) => (
            <span
              key={option}
              className="rounded-md border border-border bg-secondary/60 px-2 py-1 text-xs text-muted-foreground"
            >
              {option}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Lock className="size-3" /> {total} private votes
          </span>
          {voted && (
            <span className="flex items-center gap-1 text-primary">
              <CheckCircle2 className="size-3" /> you voted
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
