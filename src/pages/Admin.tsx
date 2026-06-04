import { useState, useEffect } from "react";
import Nav from "../components/Nav";
import { adminApi, type AdminStudentRow, type AdminStatsResponse, type AdminAnswerRow } from "../lib/api";

type Status = "idle" | "loading" | "ready" | "error";

export default function Admin() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, st] = await Promise.all([
          adminApi.stats(),
          adminApi.listStudents(),
        ]);
        if (cancelled) return;
        setStats(s);
        setStudents(st.students);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (status !== "ready") return;
    const handle = setTimeout(async () => {
      try {
        const st = await adminApi.listStudents(query);
        setStudents(st.students);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, status]);

  // Per-student detail
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail({ status: "loading" });
    (async () => {
      try {
        const d = await adminApi.getStudent(selected);
        if (cancelled) return;
        setDetail({ status: "ready", data: d });
      } catch (err) {
        if (cancelled) return;
        setDetail({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  if (status === "loading") {
    return (
      <>
        <Nav />
        <main className="flex min-h-screen items-center justify-center pt-[72px]">
          <p className="eyebrow">Loading admin data…</p>
        </main>
      </>
    );
  }

  if (status === "error" && error) {
    return (
      <>
        <Nav />
        <main className="flex min-h-screen items-center justify-center px-6 pt-[72px]">
          <div className="max-w-md text-center">
            <p className="eyebrow text-gold">Admin error</p>
            <h1 className="section-title mt-6">
              Could not load <em>admin</em>
            </h1>
            <p className="body-text mt-6">{error}</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-[88px] md:px-12 md:pt-[112px]">
        <header className="mb-12">
          <div className="mb-4 flex items-center gap-4">
            <div className="gold-line" />
            <span className="eyebrow">Admin Dashboard</span>
            <div className="gold-line" />
          </div>
          <h1 className="section-title">
            <em>Teacher</em> View
          </h1>
          <p className="body-text mt-4 max-w-2xl">
            Live snapshot of every student using PhysicsHub. Counts include
            all saved answers; verdicts follow the AI tutor (correct,
            partial, incorrect).
          </p>
        </header>

        {stats && <OverviewStats stats={stats} />}

        <section className="mt-16">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Students</p>
              <h2 className="mt-2 font-serif text-2xl text-text-primary md:text-3xl">
                {students.length} of {stats?.studentCount ?? 0}
              </h2>
            </div>
            <label className="block w-full md:max-w-sm">
              <span className="sr-only">Search by ESIS</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by ESIS number…"
                className="w-full border border-border-mid bg-bg-card px-5 py-3 text-[0.9rem] text-text-primary placeholder:text-text-label focus:border-gold focus:outline-none transition-colors duration-300"
              />
            </label>
          </div>

          {students.length === 0 ? (
            <p className="body-text">No students match.</p>
          ) : (
            <div className="overflow-x-auto border border-border bg-bg-card">
              <table className="w-full text-left text-[0.85rem]">
                <thead className="border-b border-border-mid text-[0.6rem] uppercase tracking-eyebrow text-text-label">
                  <tr>
                    <th className="px-5 py-4 font-normal">ESIS</th>
                    <th className="px-5 py-4 font-normal">Answers</th>
                    <th className="px-5 py-4 font-normal">Accuracy</th>
                    <th className="px-5 py-4 font-normal">Verdicts</th>
                    <th className="px-5 py-4 font-normal">Last active</th>
                    <th className="px-5 py-4 font-normal" />
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.esis}
                      onClick={() => setSelected(s.esis)}
                      className={`cursor-pointer border-b border-border-mid/50 transition-colors hover:bg-bg-subtle ${
                        selected === s.esis ? "bg-bg-subtle" : ""
                      }`}
                    >
                      <td className="px-5 py-4 font-mono text-gold">
                        {s.esis}
                      </td>
                      <td className="px-5 py-4 text-text-primary">
                        {s.answerCount}
                      </td>
                      <td className="px-5 py-4 text-text-primary">
                        {formatAccuracy(s.accuracy)}
                      </td>
                      <td className="px-5 py-4 text-[0.78rem] text-text-body">
                        <span className="text-gold">
                          ✓ {s.verdictCounts.correct}
                        </span>
                        {" · "}
                        <span>{s.verdictCounts.partial} ⚠</span>
                        {" · "}
                        <span className="text-text-label">
                          ✗ {s.verdictCounts.incorrect}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.75rem] text-text-body">
                        {formatDate(s.lastActive)}
                      </td>
                      <td className="px-5 py-4 text-right text-[0.7rem] uppercase tracking-eyebrow text-gold">
                        View
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selected && (
          <StudentDetail
            esis={selected}
            detail={detail}
            onClose={() => setSelected(null)}
          />
        )}
      </main>
    </>
  );
}

interface DetailState {
  status: "loading" | "ready" | "error";
  data?: Awaited<ReturnType<typeof adminApi.getStudent>>;
  message?: string;
}

function OverviewStats({ stats }: { stats: AdminStatsResponse }) {
  const tiles = [
    {
      label: "Students",
      value: stats.studentCount.toString(),
      sub: "ever signed in",
    },
    {
      label: "Answers",
      value: stats.answerCount.toString(),
      sub: "saved (verdicts)",
    },
    {
      label: "Accuracy",
      value: formatAccuracy(stats.accuracy),
      sub: "weighted 0.5 for partial",
    },
    {
      label: "Most-answered",
      value: stats.perLesson[0]?.lesson ?? "—",
      sub: stats.perLesson[0]
        ? `${stats.perLesson[0].count} answers`
        : "no data",
    },
  ];
  return (
    <section className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="bg-bg-card px-6 py-7"
        >
          <p className="eyebrow">{t.label}</p>
          <p className="mt-3 font-serif text-3xl text-text-primary md:text-4xl">
            {t.value}
          </p>
          <p className="mt-2 text-[0.7rem] text-text-label">{t.sub}</p>
        </div>
      ))}
    </section>
  );
}

function StudentDetail({
  esis,
  detail,
  onClose,
}: {
  esis: string;
  detail: DetailState | null;
  onClose: () => void;
}) {
  return (
    <section className="mt-16 border border-border bg-bg-card p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Student detail</p>
          <h2 className="mt-2 font-serif text-2xl text-gold md:text-3xl">
            {esis}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-soft"
          aria-label="Close student detail"
        >
          Close
        </button>
      </div>

      {!detail || detail.status === "loading" ? (
        <p className="mt-6 body-text">Loading…</p>
      ) : detail.status === "error" ? (
        <p className="mt-6 body-text text-gold">{detail.message}</p>
      ) : (
        <StudentDetailBody detail={detail.data!} />
      )}
    </section>
  );
}

function StudentDetailBody({
  detail,
}: {
  detail: NonNullable<DetailState["data"]>;
}) {
  const { student, answerCount, accuracy, verdictCounts, perLesson, answers } =
    detail;
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        <Stat label="First seen" value={formatDate(student.first_seen)} />
        <Stat label="Last active" value={formatDate(student.last_active)} />
        <Stat label="Answers" value={answerCount.toString()} />
        <Stat label="Accuracy" value={formatAccuracy(accuracy)} />
      </div>

      {perLesson.length > 0 && (
        <div className="mt-8">
          <p className="eyebrow">By lesson</p>
          <ul className="mt-3 space-y-2">
            {perLesson.map((pl) => (
              <li
                key={pl.lesson}
                className="flex items-center justify-between border border-border-mid/60 bg-bg-subtle px-4 py-2"
              >
                <span className="font-serif text-text-primary">{pl.lesson}</span>
                <span className="text-[0.8rem] text-text-body">
                  {pl.count} answer{pl.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <span className="text-[0.7rem] text-text-label">Verdicts:</span>
        <span className="text-[0.8rem] text-gold">
          ✓ {verdictCounts.correct}
        </span>
        <span className="text-[0.8rem] text-text-body">
          ⚠ {verdictCounts.partial}
        </span>
        <span className="text-[0.8rem] text-text-label">
          ✗ {verdictCounts.incorrect}
        </span>
      </div>

      <div className="mt-8">
        <p className="eyebrow">Answers ({answers.length})</p>
        {answers.length === 0 ? (
          <p className="body-text mt-3">No answers saved yet.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {answers.map((a, i) => (
              <AnswerRow key={`${a.submittedAt}-${i}`} answer={a} />
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card px-5 py-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-serif text-lg text-text-primary md:text-xl">
        {value}
      </p>
    </div>
  );
}

function AnswerRow({ answer }: { answer: AdminAnswerRow }) {
  return (
    <li className="border border-border-mid/60 bg-bg-subtle p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[0.7rem] uppercase tracking-eyebrow text-gold">
            {answer.questionId}
          </span>
          <span className="text-[0.7rem] text-text-label">
            {answer.module} · {answer.lesson}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <VerdictPill verdict={answer.verdict} />
          <span className="text-[0.7rem] text-text-label">
            {formatDate(answer.submittedAt)}
          </span>
        </div>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-[0.7rem] uppercase tracking-eyebrow text-text-label hover:text-gold">
          Show answer + feedback
        </summary>
        <div className="mt-3 space-y-3 border-t border-border-mid/50 pt-3">
          <div>
            <p className="text-[0.6rem] uppercase tracking-eyebrow text-text-label">
              Student
            </p>
            <pre className="mt-1 whitespace-pre-wrap text-[0.82rem] text-text-body">
              {answer.studentAnswer || "(no answer)"}
            </pre>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase tracking-eyebrow text-text-label">
              AI feedback
            </p>
            <p className="mt-1 text-[0.82rem] text-text-body">
              {answer.feedback}
            </p>
          </div>
        </div>
      </details>
    </li>
  );
}

function VerdictPill({ verdict }: { verdict: AdminAnswerRow["verdict"] }) {
  const map = {
    correct: { glyph: "✓", label: "Correct" },
    partial: { glyph: "⚠", label: "Partial" },
    incorrect: { glyph: "✗", label: "Incorrect" },
  } as const;
  const v = map[verdict];
  return (
    <span className="inline-flex items-center gap-2 border border-gold px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] text-gold">
      <span aria-hidden>{v.glyph}</span>
      {v.label}
    </span>
  );
}

function formatAccuracy(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
