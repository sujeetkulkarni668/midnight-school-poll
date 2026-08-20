import { EyeOff, Fingerprint, Sigma } from "lucide-react";

const points = [
  {
    icon: EyeOff,
    title: "Choice stays private",
    body: "Your selected option is a private witness inside the zero-knowledge proof. It is never written next to your address.",
  },
  {
    icon: Fingerprint,
    title: "One vote per student",
    body: "The contract publishes a one-way nullifier H(secret, pollId). Reusing it is impossible, revealing you from it is too.",
  },
  {
    icon: Sigma,
    title: "Public aggregate",
    body: "Anyone can verify the totals on-chain. Nobody can reconstruct who contributed which vote.",
  },
];

export function Hero() {
  return (
    <section className="surface-aurora border-b border-border/60">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
          Midnight · zero-knowledge voting
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Vote privately. <span className="text-primary">Verify publicly.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          Campus polls where the network proves your vote is valid and unique — without ever learning
          what you picked.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {points.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card-shadow rounded-xl border border-border/70 bg-card/70 p-4">
              <Icon className="size-4 text-primary" />
              <h2 className="mt-3 font-display text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
