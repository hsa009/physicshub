import { useState, type FormEvent } from "react";
import { useStudent } from "../hooks/useStudent";

const ESIS_RE = /^[A-Za-z0-9-]{3,20}$/;

function looksLikeEsis(value: string): boolean {
  return ESIS_RE.test(value.trim());
}

export default function Welcome() {
  const { status, error, signIn, adminSignIn } = useStudent();
  const [esis, setEsis] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      if (looksLikeEsis(esis)) {
        await signIn(esis);
        return;
      }
      try {
        await adminSignIn(esis);
        return;
      } catch {
        await signIn(esis);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="eyebrow">Loading…</p>
      </main>
    );
  }

  if (status === "error" && error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mb-6 flex items-center justify-center gap-4">
            <div className="gold-line" />
            <span className="eyebrow">Setup required</span>
            <div className="gold-line" />
          </div>
          <h1 className="section-title">
            Almost <em>there</em>
          </h1>
          <p className="body-text mt-8">{error}</p>
          <p className="mt-6 text-[0.7rem] text-text-label">
            See <code className="text-gold">docs/SETUP.md</code> for the
            step-by-step account creation guide.
          </p>
        </div>
      </main>
    );
  }

  const isBusy = submitting;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20">
      {}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(201,169,110,0.06), transparent 65%)",
        }}
      />

      {}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-20 bottom-20 hidden w-px -translate-x-1/2 md:block"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--gold), transparent)",
          opacity: 0.3,
        }}
      />

      {}
      <div
        aria-hidden
        className="slow-rotate mb-12 flex h-20 w-20 items-center justify-center rounded-full border border-border-mid"
      >
        <span
          className="font-serif text-3xl italic text-gold"
          style={{ animation: "slowRotate 20s linear infinite reverse" }}
        >
          ✦
        </span>
      </div>

      <div className="mb-6 flex items-center justify-center gap-4">
        <div className="gold-line" />
        <span className="eyebrow">Grade 11 · Physics</span>
        <div className="gold-line" />
      </div>

      <h1 className="section-title max-w-3xl text-center">
        Begin your <em>Revision</em>
      </h1>

      <p className="body-text mt-8 max-w-md text-center">
        A curated path through nine lessons of motion, force, and energy.
        Your progress follows you across any device.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-12 flex w-full max-w-sm flex-col gap-5"
      >
        <label className="block">
          <span className="sr-only">ESIS number</span>
          <input
            type="text"
            value={esis}
            onChange={(e) => setEsis(e.target.value)}
            placeholder="Enter your ESIS number"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            disabled={isBusy}
            className="w-full border border-border-mid bg-bg-card px-5 py-3.5 text-center text-[0.9rem] text-text-primary placeholder:text-text-label focus:border-gold focus:outline-none transition-colors duration-300 disabled:opacity-50"
          />
        </label>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isBusy || esis.trim().length === 0}
        >
          <span>{isBusy ? "Entering…" : "Enter"}</span>
        </button>

        {(localError || (status === "error" && error)) && (
          <p
            role="alert"
            className="border border-border-mid bg-bg-subtle px-4 py-3 text-[0.78rem] text-text-body"
          >
            {localError ?? error}
          </p>
        )}
      </form>

      <p className="mt-10 text-[0.6rem] uppercase tracking-eyebrow text-text-label">
        No password · No email · Just your ID
      </p>
    </main>
  );
}
