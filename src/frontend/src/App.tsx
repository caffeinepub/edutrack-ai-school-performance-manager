import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AiPlans from "./pages/AiPlans";
import Dashboard from "./pages/Dashboard";
import Feedback from "./pages/Feedback";
import LoginPage from "./pages/LoginPage";
import ManageTeachers from "./pages/ManageTeachers";
import MarksEntry from "./pages/MarksEntry";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Students from "./pages/Students";

// --- Role Context ---
import { createContext, useContext } from "react";

interface AppContextValue {
  isAdmin: boolean;
  isLoadingRole: boolean;
  userName: string;
}

export const AppContext = createContext<AppContextValue>({
  isAdmin: false,
  isLoadingRole: false,
  userName: "",
});

export function useAppContext() {
  return useContext(AppContext);
}

// --- Root Layout with auth guard ---
function RootLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">
            Loading EduTrack AI...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  const isAdmin = session.role === "admin";
  const userName = session.name;

  return (
    <AppContext.Provider value={{ isAdmin, isLoadingRole: false, userName }}>
      <Layout>
        <Outlet />
      </Layout>
    </AppContext.Provider>
  );
}

// --- Router ---
const rootRoute = createRootRoute({ component: RootLayout });

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const studentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/students",
  component: Students,
});

const marksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marks",
  component: MarksEntry,
});

const feedbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/feedback",
  component: Feedback,
});

const aiPlansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ai-plans",
  component: AiPlans,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: Reports,
});

const manageTeachersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/manage-teachers",
  component: ManageTeachers,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: Settings,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  studentsRoute,
  marksRoute,
  feedbackRoute,
  aiPlansRoute,
  reportsRoute,
  manageTeachersRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AppInner() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
