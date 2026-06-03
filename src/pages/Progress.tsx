/**
 * Progress — per-student stats page.
 *
 * Sections:
 *   1. Top stat tiles (answered / accuracy / last active)
 *   2. Per-lesson breakdown (progress bar + verdict counts)
 *   3. Recent activity (last 5 answers)
 *
 * Empty state directs the student to the lessons grid.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { questionBank } from "../data/bank";
import { getLessonIdByModuleName } from "../data/lessons";
import { useAllAnswers } from "../hooks/useAllAnswers";
import { useStudent } from "../hooks/useStudent";
import Nav from "../components/Nav";
import type { Answer, Verdict } from "../types";

interface LessonStat {
  module: string;
  lesson: string;
  total: number;
  answered: number;
  correct: number;
  partial: number;
  incorrect: number;
  latestAt: string | null;
}

interface Totals {
  total: number;
  correct: number;
  partial: number;
  incorrect: number;
  accuracy: number;
  lastActive: string | null;
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

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(t).toLocaleDateString();
}

function italicizeLastWord(phrase: string): { head: string; tail: string } {
  const parts = phrase.split(" ");
  if (parts.length === 1) return { head: phrase, tail: "" };
  return { head: parts.slice(0, -1).join(" "), tail: parts[parts.length - 1] };
}

export default function Progress() {
  const { student } = useStudent();
  const { data: answers, isLoading } = useAllAnswers();

  const stats = useMemo<LessonStat[]>(() => {
    const out: LessonStat[] = questionBank.lessons.map((l) => ({
      module: l.module,
      lesson: l.name,
      total: l.questionCount,
      answered: 0,
      correct: 0,
      partial: 0,
      incorrect: 0,
      latestAt: null,
    }));
    const byKey = new Map(out.map((s) => [`${s.module}::${s.lesson}`, s]));
    const seen = new Set<string>();
    for (const a of answers ?? []) {
      const s = byKey.get(`${a.module}::${a.lesson}`);
      if (!s) continue;
      const key = `${a.module}::${a.lesson}::${a.question_id}`;
      if (!seen.has(key)) {
        s.answered += 1;
        seen.add(key);
      }
      if (a.ai_verdict === "correct") s.correct += 1;
      else if (a.ai_verdict === "partial") s.partial += 1;
      else s.incorrect += 1;
      if (!s.latestAt || a.submitted_at > s.latestAt) {
        s.latestAt = a.submitted_at;
      }
    }
    return out;
  }, [answers]);

  const totals = useMemo<Totals>(() => {
    const total = stats.reduce((sum, s) => sum + s.answered, 0);
    const correct = stats.reduce((sum, s) => sum + s.correct, 0);
    const partial = stats.reduce((sum, s) => sum + s.partial, 0);
    const incorrect = stats.reduce((sum, s) => sum + s.incorrect, 0);
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const lastActive = answers?.[0]?.submitted_at ?? student?.last_active ?? null;
    return { total, correct, partial, incorrect, accuracy, lastActive };
  }, [stats, answers, student]);

  const recent = (answers ?? []).slice(0, 5);

  return (
    <>
      <Nav />
      <main className="relative min-h-screen px-6 pb-24 pt-[120px] md:px-12 md:pt-[140px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(201,169,110,0.06), transparent 65%)",
          }}
        />

        <header className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-center gap-4 md:justify-start">
            <div className="gold-line" />
            <span className="eyebrow">
              Tracking · <span className="text-text-primary">{student?.esis}</span>
            </span>
          </div>
          <h1 className="section-title max-w-3xl text-center md:text-left">
            Your <em>Progress</em>
          </h1>
          <p className="body-text mt-6 max-w-xl text-center md:text-left">
            Everything you've answered, every verdict the AI gave you, all in
            one place.
          </p>
        </header>

        <div className="divider">
          <div className="rule" />
          <div className="mark">✦</div>
          <div className="rule" />
        </div>

        {isLoading ? (
          <p className="mx-auto max-w-6xl text-center eyebrow">Loading…</p>
        ) : totals.total === 0 ? (
          <EmptyProgress />
        ) : (
          <>
            <StatGrid totals={totals} />
            <LessonBreakdown stats={stats} />
            <RecentActivity answers={recent} />
          </>
        )}
      </main>
    </>
  );
}

function StatGrid({ totals }: { totals: Totals }) {
  return (
    <section className="mx-auto max-w-6xl">
      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3 fade-up-stagger">
        <StatTile
          label="Questions answered"
          value={`${totals.total} / 60`}
          sub={
            totals.total === 60
              ? "Full coverage"
              : `${60 - totals.total} remaining`
          }
        />
        <StatTile
          label="Accuracy"
          value={`${totals.accuracy}%`}
          sub={`${totals.correct} correct · ${totals.partial} partial · ${totals.incorrect} incorrect`}
        />
        <StatTile
          label="Last active"
          value={totals.lastActive ? relativeTime(totals.lastActive) : "—"}
          sub="Most recent answer"
        />
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="feature-item bg-bg-card p-8 md:p-10">
      <span className="eyebrow">{label}</span>
      <div className="mt-3 font-serif text-[2.4rem] font-light leading-none text-text-primary md:text-[3rem]">
        {value}
      </div>
      <p className="mt-3 text-[0.78rem] text-text-label">{sub}</p>
    </div>
  );
}

function LessonBreakdown({ stats }: { stats: LessonStat[] }) {
  return (
    <section className="mx-auto mt-20 max-w-6xl">
      <div className="mb-8 flex items-center gap-4">
        <div className="gold-line" />
        <span className="eyebrow">By Lesson</span>
      </div>
      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 fade-up-stagger">
        {stats.map((s) => (
          <LessonStatCard key={`${s.module}::${s.lesson}`} stat={s} />
        ))}
      </div>
    </section>
  );
}

function LessonStatCard({ stat }: { stat: LessonStat }) {
  const pct = stat.total > 0 ? Math.round((stat.answered / stat.total) * 100) : 0;
  const last = stat.latestAt ? relativeTime(stat.latestAt) : "Not started";
  const { head, tail } = italicizeLastWord(stat.lesson);
  const cta =
    stat.answered === 0
      ? "Start"
      : stat.answered === stat.total
        ? "Review"
        : "Continue";

  return (
    <div className="feature-item bg-bg-card p-7 md:p-8">
      <span className="text-[0.6rem] uppercase tracking-eyebrow text-gold">
        {stat.module}
      </span>
      <h3 className="mt-3 font-serif text-[1.2rem] font-light leading-[1.2] text-text-primary">
        {head} {tail && <em className="italic text-gold">{tail}</em>}
      </h3>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="font-serif text-[1.8rem] text-text-primary">
          {stat.answered}
        </span>
        <span className="text-[0.7rem] uppercase tracking-eyebrow text-text-label">
          / {stat.total} answered
        </span>
      </div>

      <div className="mt-2 h-px w-full bg-border">
        <div
          className="h-px bg-gold transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.7rem] text-text-label">
        <span>
          <span className="text-gold">{VERDICT_GLYPH.correct}</span> {stat.correct} correct
        </span>
        <span>
          <span className="text-gold">{VERDICT_GLYPH.partial}</span> {stat.partial} partial
        </span>
        <span>
          <span className="text-gold">{VERDICT_GLYPH.incorrect}</span> {stat.incorrect} incorrect
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-[0.65rem] uppercase tracking-eyebrow text-text-label">
          {last}
        </span>
        <Link
          to={`/lesson/${encodeURIComponent(
            getLessonIdByModuleName(stat.module, stat.lesson) ??
              `${stat.module}::${stat.lesson}`,
          )}`}
          className="btn-ghost text-[0.6rem]"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

function RecentActivity({ answers }: { answers: Answer[] }) {
  return (
    <section className="mx-auto mt-20 max-w-6xl">
      <div className="mb-8 flex items-center gap-4">
        <div className="gold-line" />
        <span className="eyebrow">Recent Activity</span>
      </div>
      <ul className="border border-border bg-bg-card divide-y divide-border">
        {answers.map((a) => (
          <li
            key={a.id}
            className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[0.6rem] uppercase tracking-eyebrow text-gold">
                {a.module} · {a.lesson}
              </span>
              <p className="mt-1 text-[0.85rem] text-text-body line-clamp-1">
                {a.student_answer}
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-[0.65rem] uppercase tracking-eyebrow text-text-label">
                {relativeTime(a.submitted_at)}
              </span>
              <span className="inline-flex items-center gap-1.5 border border-gold px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.25em] text-gold">
                <span aria-hidden>{VERDICT_GLYPH[a.ai_verdict]}</span>
                {VERDICT_LABEL[a.ai_verdict]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyProgress() {
  return (
    <section className="mx-auto mt-12 max-w-3xl border border-border bg-bg-card px-8 py-16 text-center">
      <span className="eyebrow">No answers yet</span>
      <h2 className="mt-4 section-title">
        Start with your first <em>Lesson</em>
      </h2>
      <p className="body-text mt-4 max-w-md mx-auto">
        Pick a lesson from the grid, type your answer, and your progress will
        appear here automatically.
      </p>
      <Link to="/" className="btn-primary mt-8 inline-flex">
        <span>Browse lessons</span>
      </Link>
    </section>
  );
}
