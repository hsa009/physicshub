import { useMemo, useState } from "react";
import { questionBank } from "../data/bank";
import { useAnsweredCounts, countFor } from "../hooks/useAnsweredCounts";
import SearchBar from "../components/SearchBar";
import LessonCard from "../components/LessonCard";
import Nav from "../components/Nav";
import type { Lesson } from "../types";

export default function Home() {
  const [query, setQuery] = useState("");
  const { data: counts, isLoading } = useAnsweredCounts();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return questionBank.lessons;
    return questionBank.lessons.filter((lesson) => {
      if (
        lesson.name.toLowerCase().includes(q) ||
        lesson.module.toLowerCase().includes(q)
      ) {
        return true;
      }
      // Search the actual question prompts too.
      const ids = new Set(lesson.questionIds);
      return questionBank.questions.some(
        (qq) =>
          ids.has(qq.id) &&
          (qq.prompt.toLowerCase().includes(q) ||
            qq.type.toLowerCase().includes(q))
      );
    });
  }, [query]);

  return (
    <>
      <Nav />
      <main className="relative min-h-screen px-6 pb-24 pt-[120px] md:px-12 md:pt-[140px]">
        {/* Radial gold glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(201,169,110,0.06), transparent 65%)",
          }}
        />

        {/* Hero header */}
        <header className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-center gap-4 md:justify-start">
            <div className="gold-line" />
            <span className="eyebrow">Grade 11 · Semester 2</span>
          </div>
          <h1 className="section-title max-w-3xl text-center md:text-left">
            Nine <em>Lessons</em> of Motion, Force & Energy
          </h1>
          <p className="body-text mt-6 max-w-xl text-center md:text-left">
            Search by lesson, module, or topic. Your progress saves
            automatically and follows you across devices.
          </p>
        </header>

        <div className="divider">
          <div className="rule" />
          <div className="mark">✦</div>
          <div className="rule" />
        </div>

        {/* Search */}
        <section className="mx-auto max-w-6xl">
          <SearchBar value={query} onChange={setQuery} />
          <div className="mt-3 flex items-center justify-between text-[0.7rem] text-text-label">
            <span>
              {query ? (
                <>
                  Showing{" "}
                  <span className="text-gold">{filtered.length}</span> of{" "}
                  {questionBank.lessons.length} lessons
                </>
              ) : (
                <>
                  {questionBank.lessons.length} lessons · 60 questions across
                  5 modules
                </>
              )}
            </span>
            {isLoading && <span className="text-text-label">Syncing…</span>}
          </div>
        </section>

        {/* Lesson grid */}
        <section className="mx-auto mt-10 max-w-6xl">
          {filtered.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 fade-up-stagger">
              {filtered.map((lesson) => (
                <LessonCard
                  key={`${lesson.module}::${lesson.name}`}
                  lesson={lesson as Lesson}
                  answeredCount={countFor(counts, lesson.module, lesson.name)}
                />
              ))}
            </div>
          )}
        </section>

        <Footer />
      </main>
    </>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="border border-border bg-bg-card px-8 py-16 text-center">
      <span className="eyebrow">No matches</span>
      <p className="body-text mt-3">
        Nothing in the nine lessons matches{" "}
        <span className="text-gold">"{query}"</span>. Try a module name like
        "Module 8" or a topic like "momentum".
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mx-auto mt-24 max-w-6xl border-t border-border pt-8">
      <div className="flex flex-col items-start justify-between gap-4 text-[0.6rem] uppercase tracking-eyebrow text-text-label md:flex-row md:items-center">
        <span>
          Physics <em className="italic text-gold">Hub</em> · Est. MCMXXV
        </span>
        <span>Noir Luxe · 100% Free · 0 Servers Owned</span>
      </div>
    </footer>
  );
}
