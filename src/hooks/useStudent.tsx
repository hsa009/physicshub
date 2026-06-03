/**
 * useStudent — the student's identity (ESIS) and persistence helpers.
 *
 * State machine:
 *   "loading"     — checking localStorage + Supabase
 *   "needs-entry" — no ESIS found, show Welcome page
 *   "ready"       — ESIS is set and the student row is loaded
 *   "error"       — something failed (e.g. Supabase not configured)
 *
 * On signIn(esis):
 *   1. Validate the input.
 *   2. Query the `students` table for that ESIS.
 *   3. If not found, insert a new row.
 *   4. Save ESIS to localStorage.
 *   5. Transition to "ready".
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export interface Student {
  esis: string;
  first_seen: string;
  last_active: string;
}

export type StudentStatus =
  | "loading"
  | "needs-entry"
  | "ready"
  | "error";

interface StudentContextValue {
  status: StudentStatus;
  student: Student | null;
  error: string | null;
  signIn: (esis: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
  isSupabaseReady: boolean;
}

const StudentContext = createContext<StudentContextValue | null>(null);

const STORAGE_KEY = "physicshub-esis";

const ESIS_RE = /^[A-Za-z0-9-]{3,20}$/;

function isValidEsis(value: string): boolean {
  return ESIS_RE.test(value.trim());
}

export function StudentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StudentStatus>("loading");
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStudent = useCallback(async (esis: string) => {
    if (!supabase) {
      setError(
        "Supabase is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env to enable sign-in."
      );
      setStatus("error");
      return;
    }

    // 1. Look up existing row.
    const { data: existing, error: selectErr } = await supabase
      .from("students")
      .select("*")
      .eq("esis", esis)
      .maybeSingle();

    if (selectErr) {
      setError(`Could not look up student: ${selectErr.message}`);
      setStatus("error");
      return;
    }

    if (existing) {
      // 2a. Bump last_active.
      const { data: updated, error: updateErr } = await supabase
        .from("students")
        .update({ last_active: new Date().toISOString() })
        .eq("esis", esis)
        .select()
        .single();
      if (updateErr) {
        // Non-fatal — keep the existing record.
        setStudent(existing as Student);
      } else {
        setStudent(updated as Student);
      }
      setStatus("ready");
      return;
    }

    // 2b. Create a new row.
    const { data: created, error: insertErr } = await supabase
      .from("students")
      .insert({ esis })
      .select()
      .single();

    if (insertErr) {
      setError(`Could not create student: ${insertErr.message}`);
      setStatus("error");
      return;
    }

    setStudent(created as Student);
    setStatus("ready");
  }, []);

  // On mount, hydrate from localStorage.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError(
        "Supabase is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env to enable sign-in."
      );
      setStatus("error");
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setStatus("needs-entry");
      return;
    }
    loadStudent(stored).catch((e) => {
      setError(String(e));
      setStatus("error");
    });
  }, [loadStudent]);

  const signIn = useCallback(
    async (raw: string) => {
      const esis = raw.trim();
      if (!isValidEsis(esis)) {
        throw new Error(
          "Please enter a valid ESIS number (3–20 letters, digits, or dashes)."
        );
      }
      setError(null);
      setStatus("loading");
      await loadStudent(esis);
      // If we got here without throwing, persist locally.
      window.localStorage.setItem(STORAGE_KEY, esis);
    },
    [loadStudent]
  );

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setStudent(null);
    setError(null);
    setStatus("needs-entry");
  }, []);

  const refresh = useCallback(async () => {
    if (student) await loadStudent(student.esis);
  }, [student, loadStudent]);

  const value = useMemo<StudentContextValue>(
    () => ({
      status,
      student,
      error,
      signIn,
      signOut,
      refresh,
      isSupabaseReady: isSupabaseConfigured,
    }),
    [status, student, error, signIn, signOut, refresh]
  );

  return (
    <StudentContext.Provider value={value}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudent must be used inside StudentProvider");
  return ctx;
}
