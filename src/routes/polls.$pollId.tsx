import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResultsBars } from "@/components/poll/ResultsBars";
import { VotePanel } from "@/components/poll/VotePanel";
import { usePollApp } from "@/hooks/use-poll-app";

export const Route = createFileRoute("/polls/$pollId")({
  head: () => ({
    meta: [
      { title: "Poll · Private Campus Poll" },
      {
        name: "description",
        content:
          "Cast a zero-knowledge campus vote on Midnight and watch the aggregated result update without exposing any individual choice.",
      },
      { property: "og:title", content: "Vote privately on a campus poll" },
      {
        property: "og:description",
        content: "Prove your vote is valid and unique without revealing what you chose.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PollDetail,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold">Poll not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That poll does not exist on this contract.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to polls</Link>
      </Button>
    </main>
  ),
});

function PollDetail() {
  const { pollId } = Route.useParams();
  const { polls, results, ready, close, wallet } = usePollApp();
  const id = Number(pollId);
  const poll = polls.find((entry) => entry.id === id);

  if (!ready)
    return <main className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Loading…</main>;
  if (!poll) throw notFound();

  const pollResults = results(id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All polls
      </Link>

      <div>
        <h1 className="font-display text-3xl font-semibold leading-tight">{poll.question}</h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          poll #{poll.id} · {poll.options.length} options · {poll.status}
        </p>
      </div>

      <VotePanel poll={poll} />

      {pollResults && (
        <Card className="card-shadow border-border/70 bg-card/80 p-5">
          <h2 className="font-display text-lg font-semibold">Aggregated results</h2>
          <ResultsBars results={pollResults} />
        </Card>
      )}

      {wallet && poll.status === "open" && (
        <Button variant="ghost" size="sm" onClick={() => void close(poll.id)}>
          Close poll (creator only)
        </Button>
      )}
    </main>
  );
}
