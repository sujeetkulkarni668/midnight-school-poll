import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePollApp } from "@/hooks/use-poll-app";

export function CreatePollForm() {
  const { createPoll, phase, wallet } = usePollApp();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const setOption = (index: number, value: string) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await createPoll(question, options);
    if (created !== null) {
      setQuestion("");
      setOptions(["", ""]);
    }
  };

  return (
    <Card className="card-shadow border-border/70 bg-card/80 p-5">
      <h2 className="font-display text-lg font-semibold">Create a poll</h2>
      <p className="-mt-1 text-sm text-muted-foreground">
        Two to four options. The question and options are public; every vote on them is not.
      </p>

      <form onSubmit={submit} className="mt-2 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="question">Question</Label>
          <Input
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Which workshop should our college conduct next?"
          />
        </div>

        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={option}
                onChange={(event) => setOption(index, event.target.value)}
                placeholder={`Option ${index + 1}`}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove option ${index + 1}`}
                  onClick={() => setOptions((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {options.length < 4 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => setOptions((prev) => [...prev, ""])}
            >
              <Plus className="size-3.5" /> Add option
            </Button>
          )}
        </div>

        <Button type="submit" disabled={phase !== "idle"} className="w-full">
          {wallet ? "Create poll" : "Connect wallet to create"}
        </Button>
      </form>
    </Card>
  );
}
