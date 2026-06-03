/**
 * ChatThread — "Explain More" inline chat for a single answered question.
 *
 * Renders only when `open` is true. Owns its own message history; messages
 * reset when the panel is closed and reopened (intentional for v1; future
 * versions may persist to localStorage keyed by answer id).
 *
 * Each follow-up is sent to the Worker with the full prior history so the
 * AI tutor has context.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, isWorkerConfigured, type ChatMessage } from "../lib/api";
import type { Answer } from "../types";
import Spinner from "./Spinner";

interface ChatThreadProps {
  lesson: string;
  question: string;
  answer: Answer;
  open: boolean;
  onClose: () => void;
}

export default function ChatThread({
  lesson,
  question,
  answer,
  open,
  onClose,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages.length, busy]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const onSend = async (e: FormEvent) => {
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
      const res = await api.chat({
        lesson,
        question,
        studentAnswer: answer.student_answer,
        previousFeedback: answer.ai_feedback,
        history,
        followup: text,
      });
      setMessages((prev) => [...prev, { role: "tutor", content: res.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onClear = () => {
    setMessages([]);
    setError(null);
  };

  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="AI tutor follow-up chat"
      className="mt-5 border border-border bg-bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="eyebrow">AI Tutor</span>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={onClear} className="btn-soft">
              Clear
            </button>
          )}
          <button onClick={onClose} className="btn-soft">
            Close
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="max-h-96 min-h-32 overflow-y-auto px-5 py-4 space-y-3"
      >
        {messages.length === 0 && !busy && (
          <p className="text-[0.78rem] italic text-text-label text-center py-6">
            Ask a follow-up. The tutor sees the question, your answer, and the
            previous feedback.
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "student"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            <div
              className={
                m.role === "student"
                  ? "max-w-[85%] border border-gold bg-gold-dim px-4 py-2.5 text-[0.82rem] leading-[1.6] text-text-primary"
                  : "max-w-[85%] border border-border bg-bg-subtle px-4 py-2.5 text-[0.82rem] leading-[1.6] text-text-body font-serif"
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 border border-border bg-bg-subtle px-4 py-2.5 text-[0.78rem] text-text-label">
              <Spinner size={10} /> Tutor is thinking…
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="border border-border-mid bg-bg-subtle px-4 py-3 text-[0.78rem] text-text-body"
          >
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={onSend}
        className="flex items-center gap-3 border-t border-border px-5 py-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            isWorkerConfigured
              ? "Ask a follow-up…"
              : "AI tutor is offline (no Worker URL configured)"
          }
          disabled={!isWorkerConfigured || busy}
          className="flex-1 bg-transparent border-0 text-[0.82rem] text-text-primary placeholder:text-text-label focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={
            !isWorkerConfigured || busy || draft.trim().length === 0
          }
          className="btn-soft"
        >
          Send
          <span aria-hidden>→</span>
        </button>
      </form>
    </div>
  );
}
