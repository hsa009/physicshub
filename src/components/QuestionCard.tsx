import { useState, type FormEvent } from "react";
import type { Answer, Question, Verdict } from "../types";
import { api, isWorkerConfigured } from "../lib/api";
import { useSaveAnswer, latestFor } from "../hooks/useAnswers";
import Spinner from "./Spinner";
import ChatThread from "./ChatThread";

interface QuestionCardProps {
  question: Question;
  module: string;
  lesson: string;
  priorAnswers: Answer[] | undefined;
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

export default function QuestionCard({
  question,
  module,
  lesson,
  priorAnswers,
}: QuestionCardProps) {
  const prior = latestFor(priorAnswers, question.id);
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const [current, setCurrent] = useState<Answer | undefined>(prior);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const saveAnswer = useSaveAnswer();

  const onCheck = async (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim().length === 0) return;
    setError(null);
    setChecking(true);
    try {
      const res = await api.check({
        lesson,
        module,
        question: question.prompt,
        answer: draft,
      });
      const saved = await saveAnswer.mutateAsync({
        questionId: question.id,
        module,
        lesson,
        studentAnswer: draft,
        verdict: res.verdict,
        feedback: res.feedback,
      });
      setCurrent(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <article
      id={`q-${question.id}`}
      className="feature-item group relative border border-border bg-bg-card p-8 transition-colors duration-300 md:p-10"
    >
      <div className="flex items-start justify-between gap-6">
        <span className="eyebrow">
          {question.type === "numerical" ? "Numerical" : "Conceptual"} · Q
          {question.number}
        </span>
        {current && (
          <VerdictBadge verdict={current.ai_verdict} />
        )}
      </div>

      <p className="mt-5 font-serif text-[1.1rem] leading-[1.55] text-text-primary md:text-[1.2rem]">
        {question.prompt}
      </p>

      {!current && (
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

      {current && (
        <FeedbackBlock
          answer={current}
          onTryAgain={() => {
            setCurrent(undefined);
            setChatOpen(false);
          }}
          onExplain={() => setChatOpen((o) => !o)}
        />
      )}

      {current && (
        <ChatThread
          lesson={lesson}
          question={question.prompt}
          answer={current}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Gold underline (mirrors .feature-item::after) */}
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

function FeedbackBlock({
  answer,
  onTryAgain,
  onExplain,
}: {
  answer: Answer;
  onTryAgain: () => void;
  onExplain: () => void;
}) {
  return (
    <div className="mt-7 border border-border bg-bg-subtle p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="eyebrow">AI Feedback</span>
        <button onClick={onTryAgain} className="btn-soft" title="Clear and re-answer">
          <span aria-hidden>↺</span>
          Try again
        </button>
      </div>
      <p className="mt-4 text-[0.9rem] leading-[1.8] text-text-body">
        {answer.ai_feedback}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4">
        <button className="btn-ghost" onClick={onExplain}>
          <span aria-hidden className="text-gold">✦</span>
          Explain More
        </button>
        <span className="text-[0.6rem] uppercase tracking-eyebrow text-text-label">
          Ask the AI tutor to clarify
        </span>
      </div>
    </div>
  );
}
