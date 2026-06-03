import type { ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { StudentProvider, useStudent } from "./hooks/useStudent";
import Welcome from "./pages/Welcome";
import Home from "./pages/Home";
import LessonView from "./pages/LessonView";

export default function App() {
  return (
    <ThemeProvider>
      <StudentProvider>
        <Routes>
          <Route path="/" element={<RequireStudent><Home /></RequireStudent>} />
          <Route
            path="/lesson/:module/:name"
            element={<RequireStudent><LessonView /></RequireStudent>}
          />
          <Route
            path="/progress"
            element={<RequireStudent><ProgressStub /></RequireStudent>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StudentProvider>
    </ThemeProvider>
  );
}

/**
 * Gates the inner app: shows Welcome until the student has a verified ESIS.
 * Once the student is "ready", renders the requested page.
 */
function RequireStudent({ children }: { children: ReactNode }) {
  const { status } = useStudent();
  if (status === "ready") return <>{children}</>;
  if (status === "loading") return <BootScreen />;
  return <Welcome />;
}

function BootScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <span className="eyebrow">Loading…</span>
    </main>
  );
}

function ProgressStub() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className="gold-line" />
          <span className="eyebrow">Coming soon</span>
          <div className="gold-line" />
        </div>
        <h1 className="section-title">
          Your <em>Progress</em>
        </h1>
        <p className="body-text mt-6">
          The progress page lands in Milestone 4.
        </p>
      </div>
    </main>
  );
}
