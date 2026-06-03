/**
 * AskDrawer — slide-aware "Ask AI" chat panel (M5.4).
 *
 * Rendered as a fixed right-side drawer on desktop and a bottom sheet on
 * mobile. Owns the chat history for the current lesson. The Worker is
 * given the current slide's title + body + formula so it can answer in
 * the context of what the student is reading right now.
 *
 * The parent (LessonView) passes the current slide via `currentSlide`
 * and we capture a fresh reference on every send — that way, if the
 * student advances slides between questions, the next message goes with
 * the slide they were on when they hit Send, not the slide they were
 * on when they opened the drawer.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  api,
  isWorkerConfigured,
  type ChatMessage,
} from "../lib/api";
import type { LessonWithSlides, Slide as SlideType } from "../types";
import Spinner from "./Spinner";

interface AskDrawerProps {
  lesson: LessonWithSlides;
  currentSlide: SlideType;
  open: boolean;
  onClose: () => void;
}

export default function AskDrawer({
  lesson,
  currentSlide,
  open,
  onClose,
}: AskDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages.length, busy]);

  useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onSend = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const text = draft.trim();
      if (!text || busy) return;
      setError(null);

      const next: ChatMessage = { role: "student", content: text };
      const history = messages;
      setMessages((prev) => [...prev, next]);
      setDraft("");
      setBusy(true);
      try {
        const res = await api.askSlide({
          lessonName: lesson.name,
          moduleName: lesson.module,
          slide: {
            title: currentSlide.title,
            body: currentSlide.body,
            formula: currentSlide.formula,
          },
          history,
          question: text,
        });
        setMessages((prev) => [
          ...prev,
          { role: "tutor", content: res.reply },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [busy, currentSlide, draft, lesson.module, lesson.name, messages],
  );

  const onClear = () => {
    setMessages([]);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(e as unknown as FormEvent);
    }
  };

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`ask-backdrop ${open ? "ask-backdrop--open" : ""}`}
      />

      <aside
        role="dialog"
        aria-modal="false"
        aria-label="Ask AI tutor about the current slide"
        aria-hidden={!open}
        className={`ask-drawer ${open ? "ask-drawer--open" : ""}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-gold text-[0.9rem]">
                ✦
              </span>
              <span className="eyebrow">Ask AI Tutor</span>
            </div>
            <h3 className="mt-2 font-serif text-[1.1rem] leading-[1.2] text-text-primary">
              <em className="italic text-gold">{lesson.accentWord}</em> · {lesson.module}
            </h3>
            <p className="mt-2 truncate text-[0.7rem] text-text-label">
              On slide: <span className="text-text-body">{currentSlide.title}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-soft shrink-0"
            aria-label="Close Ask AI"
          >
            ✕
          </button>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-5"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          {messages.length === 0 && !busy && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span aria-hidden className="text-gold text-[1.6rem] mb-3">
                ✦
              </span>
              <p className="font-serif text-[1.05rem] italic text-gold leading-[1.4]">
                Ask anything about this slide
              </p>
              <p className="mt-3 max-w-[260px] text-[0.78rem] leading-[1.7] text-text-label">
                The tutor sees <span className="text-text-body">"{currentSlide.title}"</span> and
                the rest of the lesson. It will guide you, not give you the answer.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "student" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={
                    m.role === "student"
                      ? "max-w-[85%] border border-gold bg-gold-dim px-4 py-2.5 text-[0.85rem] leading-[1.65] text-text-primary"
                      : "max-w-[85%] border border-border bg-bg-subtle px-4 py-2.5 text-[0.85rem] leading-[1.65] text-text-body font-serif"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 border border-border bg-bg-subtle px-4 py-2.5 text-[0.78rem] text-text-label">
                  <Spinner size={10} /> Tutor is reading the slide…
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="border border-border-mid bg-bg-subtle px-4 py-3 text-[0.78rem] leading-[1.6] text-text-body"
              >
                {error}
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={onSend}
          className="border-t border-border px-6 py-4"
        >
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isWorkerConfigured
                  ? `Ask about "${currentSlide.title}"…`
                  : "AI tutor is offline (no Worker URL configured)"
              }
              disabled={!isWorkerConfigured || busy}
              rows={2}
              aria-label="Ask a question"
              className="flex-1 resize-none bg-transparent text-[0.85rem] leading-[1.55] text-text-primary placeholder:text-text-label focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isWorkerConfigured || busy || draft.trim().length === 0}
              className="btn-soft shrink-0 self-end"
              aria-label="Send question"
            >
              Send
              <span aria-hidden>→</span>
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[0.6rem] uppercase tracking-eyebrow text-text-label">
            <span>Enter to send · Shift+Enter for newline</span>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="transition-colors hover:text-gold"
              >
                Clear chat
              </button>
            )}
          </div>
        </form>
      </aside>
    </>
  );
}
