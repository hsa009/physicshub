/**
 * PracticeQuestionCard — one ephemeral AI-generated question (M5.5).
 *
 * Mirrors QuestionCard's visual style but: no DB save, no ChatThread,
 * no prior-answer concept. Each card has a "Skip" affordance and
 * shows the AI verdict + feedback inline.
 */

import { useState, type FormEvent } from "react";
import type { Verdict } from "../types";
import { api, isWorkerConfigured, type PracticeQuestion } from "../lib/api";
import Spinner from "./Spinner";

interface PracticeQuestionCardProps {
  question: PracticeQuestion;
  index: number;
  total: number;
  lesson: string;
  moduleName: string;
  onSkip: () => void;
}

const VERDICT_LABEL: Record<Verdict, string> = {
  correct: "Correct",
  partial: "Partially Correct",
  incorrect: "Incorrect",
};

const VERDICT_GLYPH: Record<Verdict, string> = {
  correct: "✓",
  partial: "⚠",
  incorrect: "✗",
};

export default function PracticeQuestionCard({
  question,
  index,
  total,
  lesson,
  moduleName,
  onSkip,
}: PracticeQuestionCardProps) {
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);

  const reset = () => {
    setVerdict(null);
    setFeedback(null);
    setError(null);
    setSubmittedAnswer(null);
    setDraft("");
  };

  const onCheck = async (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim().length === 0) return;
    setError(null);
    setChecking(true);
    try {
      const res = await api.check({
        lesson,
        module: moduleName,
        question: question.prompt,
        answer: draft,
      });
      setVerdict(res.verdict);
      setFeedback(res.feedback);
      setSubmittedAnswer(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <article className="feature-item group relative border border-border bg-bg-card p-8 transition-colors duration-300 md:p-10">
      <div className="flex items-start justify-between gap-6">
        <span className="eyebrow">
          {question.type === "numerical" ? "Numerical" : "Conceptual"} · Practice{" "}
          {index + 1} of {total}
        </span>
        {verdict && <VerdictBadge verdict={verdict} />}
      </div>

      <p className="mt-5 font-serif text-[1.1rem] leading-[1.55] text-text-primary md:text-[1.2rem]">
        {question.prompt}
      </p>

      {!verdict && (
        <form onSubmit={onCheck} className="mt-7 flex flex-col gap-4">
          <label className="block">
            <span className="sr-only">Your answer</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your answer here. Show your work for numerical questions."
              rows={question.type === "numerical" ? 5 : 3}
              disabled={checking}
              className="w-full resize-y border border-border-mid bg-bg-subtle px-5 py-3.5 text-[0.9rem] leading-[1.6] text-text-primary placeholder:text-text-label focus:border-gold focus:outline-none transition-colors duration-300 disabled:opacity-50"
            />
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="btn-primary"
              disabled={checking || draft.trim().length === 0}
            >
              <span className="flex items-center gap-3">
                {checking && <Spinner size={12} />}
                {checking ? "Checking…" : "Check My Answer"}
              </span>
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="btn-soft"
              disabled={checking}
            >
              <span aria-hidden>→</span>
              Skip
            </button>
            <span className="text-[0.6rem] uppercase tracking-eyebrow text-text-label">
              {isWorkerConfigured
                ? "AI-assisted · takes ~3–8s"
                : "AI not configured · configure VITE_WORKER_URL"}
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="border border-border-mid bg-bg-subtle px-4 py-3 text-[0.78rem] text-text-body"
            >
              {error}
            </div>
          )}
        </form>
      )}

      {verdict && feedback && (
        <div className="mt-7 border border-border bg-bg-subtle p-6">
          <div className="flex items-center justify-between gap-4">
            <span className="eyebrow">AI Feedback</span>
            <button onClick={reset} className="btn-soft" title="Clear and re-answer">
              <span aria-hidden>↺</span>
              Try again
            </button>
          </div>
          {submittedAnswer && (
            <details className="mt-4">
              <summary className="cursor-pointer text-[0.7rem] uppercase tracking-eyebrow text-text-label hover:text-gold transition-colors">
                Your answer
              </summary>
              <p className="mt-2 text-[0.85rem] leading-[1.7] text-text-body whitespace-pre-wrap">
                {submittedAnswer}
              </p>
            </details>
          )}
          <p className="mt-4 text-[0.9rem] leading-[1.8] text-text-body">
            {feedback}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={onSkip}
              className="btn-ghost"
            >
              <span>Next Practice</span>
              <span aria-hidden>→</span>
            </button>
            <span className="text-[0.6rem] uppercase tracking-eyebrow text-text-label">
              Ephemeral — not saved to your progress
            </span>
          </div>
        </div>
      )}

      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-10 right-10 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--gold), transparent)",
        }}
      />
    </article>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className="inline-flex items-center gap-2 border border-gold px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] text-gold">
      <span aria-hidden>{VERDICT_GLYPH[verdict]}</span>
      {VERDICT_LABEL[verdict]}
    </span>
  );
}
