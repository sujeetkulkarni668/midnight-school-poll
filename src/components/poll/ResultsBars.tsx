import type { PollResults } from "@/lib/poll/types";

export function ResultsBars({ results }: { results: PollResults }) {
  return (
    <div className="space-y-3">
      {results.options.map((option) => (
        <div key={option.index}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">{option.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {option.votes} · {option.percent}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${option.percent}%` }}
            />
          </div>
        </div>
      ))}
      <p className="pt-1 font-mono text-xs text-muted-foreground">
        Total votes: {results.total} · individual choices are not stored
      </p>
    </div>
  );
}
