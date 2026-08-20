import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/poll/Hero";
import { PollCard } from "@/components/poll/PollCard";
import { CreatePollForm } from "@/components/poll/CreatePollForm";
import { usePollApp } from "@/hooks/use-poll-app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Private Campus Poll — Vote privately, verify publicly" },
      {
        name: "description",
        content:
          "A Midnight zero-knowledge campus polling DApp: prove your vote is valid and unique without revealing what you chose.",
      },
      { property: "og:title", content: "Private Campus Poll" },
      {
        property: "og:description",
        content: "Zero-knowledge campus voting on the Midnight network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { polls, ready } = usePollApp();

  return (
    <main>
      <Hero />
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Active polls</h2>
          {!ready && <p className="text-sm text-muted-foreground">Loading polls…</p>}
          {ready && polls.length === 0 && (
            <p className="text-sm text-muted-foreground">No polls yet — create the first one.</p>
          )}
          <div className="space-y-3">
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        </div>
        <CreatePollForm />
      </section>
    </main>
  );
}
