import type { ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { StudentProvider, useStudent } from "./hooks/useStudent";
import Welcome from "./pages/Welcome";
import Home from "./pages/Home";
import LessonView from "./pages/LessonView";
import PracticePage from "./pages/PracticePage";
import Progress from "./pages/Progress";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <ThemeProvider>
      <StudentProvider>
        <Routes>
          <Route path="/" element={<RequireStudent><Home /></RequireStudent>} />
          <Route
            path="/lesson/:lessonId"
            element={<RequireStudent><LessonView /></RequireStudent>}
          />
          <Route
            path="/lesson/:lessonId/practice"
            element={<RequireStudent><PracticePage /></RequireStudent>}
          />
          <Route
            path="/progress"
            element={<RequireStudent><Progress /></RequireStudent>}
          />
          <Route
            path="/admin"
            element={<RequireAdmin><Admin /></RequireAdmin>}
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

/**
 * Gates the admin dashboard: shows Welcome (which will redirect to admin
 * sign-in on success) until the student context is in "admin" status.
 */
function RequireAdmin({ children }: { children: ReactNode }) {
  const { status } = useStudent();
  if (status === "admin") return <>{children}</>;
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
