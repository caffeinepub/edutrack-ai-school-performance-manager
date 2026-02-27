import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../App";
import { Bell, LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "../hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { logout } = useAuth();
  const { userName } = useAppContext();

  const handleLogout = () => {
    logout();
  };

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          className="shrink-0 transition-all duration-300"
          style={{ width: sidebarCollapsed ? "64px" : "220px" }}
        >
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-[220px]">
            <Sidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
          </div>
          <button
            type="button"
            className="flex-1 bg-black/50 border-0"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="shrink-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 shadow-xs">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                ICP Network Connected
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative"
            >
              <Bell className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-2 pl-2 rounded-lg hover:bg-accent transition-colors p-1">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs font-semibold" style={{ background: "oklch(0.475 0.175 255 / 0.15)", color: "oklch(0.35 0.15 255)" }}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground hidden sm:block max-w-[120px] truncate">
                    {userName || "User"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-muted-foreground text-xs" disabled>
                  <User className="w-3.5 h-3.5 mr-2" />
                  {userName}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="shrink-0 h-8 flex items-center justify-center border-t border-border px-4 no-print">
          <p className="text-xs text-muted-foreground">
            © 2026. Built with ❤️ using{" "}
            <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary transition-colors">
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
