import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MessageSquare,
  Brain,
  FileText,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  UserCog,
} from "lucide-react";
import { useAppContext } from "../App";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const adminNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/students", label: "Students", icon: Users },
  { path: "/marks", label: "Marks Entry", icon: ClipboardList },
  { path: "/feedback", label: "Feedback", icon: MessageSquare },
  { path: "/ai-plans", label: "AI Plans", icon: Brain },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/manage-teachers", label: "Manage Teachers", icon: UserCog },
];

const teacherNavItems = [
  { path: "/", label: "My Dashboard", icon: LayoutDashboard },
  { path: "/feedback", label: "Feedback", icon: MessageSquare },
  { path: "/reports", label: "Student Reports", icon: FileText },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { isAdmin, isLoadingRole } = useAppContext();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const navItems = isAdmin ? adminNavItems : teacherNavItems;

  return (
    <aside
      className="relative flex flex-col h-full transition-all duration-300"
      style={{ background: "oklch(var(--sidebar))" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "oklch(var(--sidebar-border))" }}>
        <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(0.55 0.18 240)" }}>
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight" style={{ color: "oklch(var(--sidebar-foreground))" }}>
              EduTrack AI
            </p>
            <p className="text-xs font-medium" style={{ color: "oklch(var(--sidebar-foreground) / 0.5)" }}>
              Performance Manager
            </p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && !isLoadingRole && (
        <div className="mx-3 mt-3 mb-1 px-3 py-1.5 rounded-lg" style={{ background: "oklch(var(--sidebar-accent))" }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.65 0.1 245)" }}>
            {isAdmin ? "Administrator" : "Teacher"}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {!isLoadingRole && navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === "/" ? currentPath === "/" : currentPath.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: "18px", height: "18px" }} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t" style={{ borderColor: "oklch(var(--sidebar-border))" }}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "oklch(var(--sidebar-foreground) / 0.4)" }}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
