

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
import {
  adminApi,
  clearAdminToken,
  getAdminToken,
} from "../lib/api";

export interface Student {
  esis: string;
  first_seen: string;
  last_active: string;
}

export type StudentStatus =
  | "loading"
  | "needs-entry"
  | "ready"
  | "admin"
  | "error";

interface StudentContextValue {
  status: StudentStatus;
  student: Student | null;
  error: string | null;
  signIn: (esis: string) => Promise<void>;
  adminSignIn: (password: string) => Promise<void>;
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
      const { data: updated, error: updateErr } = await supabase
        .from("students")
        .update({ last_active: new Date().toISOString() })
        .eq("esis", esis)
        .select()
        .single();
      if (updateErr) {
        setStudent(existing as Student);
      } else {
        setStudent(updated as Student);
      }
      setStatus("ready");
      return;
    }

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

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      adminApi
        .verify()
        .then(() => {
          setStatus("admin");
        })
        .catch(() => {
          clearAdminToken();
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
        });
      return;
    }

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
      clearAdminToken();
      await loadStudent(esis);
      window.localStorage.setItem(STORAGE_KEY, esis);
    },
    [loadStudent]
  );

  const adminSignIn = useCallback(async (password: string) => {
    setError(null);
    setStatus("loading");
    try {
      await adminApi.login(password);
      setStatus("admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("needs-entry");
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearAdminToken();
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
      adminSignIn,
      signOut,
      refresh,
      isSupabaseReady: isSupabaseConfigured,
    }),
    [status, student, error, signIn, adminSignIn, signOut, refresh]
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
