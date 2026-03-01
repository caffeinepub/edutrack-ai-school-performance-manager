import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  KeyRound,
  Loader2,
  Moon,
  Palette,
  ShieldAlert,
  Sun,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppContext } from "../App";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useActor } from "../hooks/useActor";

export default function Settings() {
  const { isAdmin } = useAppContext();
  const { session } = useAuth();
  const { actor } = useActor();
  const { theme, setTheme } = useTheme();

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Access Denied
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Only administrators can access the settings page.
          </p>
        </div>
      </div>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    if (!actor || !session?.token) {
      setPasswordError("Not connected. Please refresh and try again.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await actor.changePassword(
        session.token,
        currentPassword,
        newPassword,
      );
      if (result.__kind__ === "ok") {
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordError(null);
      } else {
        setPasswordError(
          result.err ??
            "Failed to change password. Please check your current password.",
        );
      }
    } catch {
      setPasswordError("An unexpected error occurred. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account preferences and application settings
        </p>
      </div>

      {/* Card 1 — Profile */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.475 0.175 255 / 0.12)" }}
            >
              <User
                className="w-4.5 h-4.5"
                style={{
                  width: "18px",
                  height: "18px",
                  color: "oklch(0.475 0.175 255)",
                }}
              />
            </div>
            <CardTitle className="text-base font-semibold">Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Username
              </Label>
              <div className="px-3 py-2.5 rounded-lg border border-border bg-muted/50 text-sm font-medium text-foreground">
                {session?.username ?? "—"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Display Name
              </Label>
              <div className="px-3 py-2.5 rounded-lg border border-border bg-muted/50 text-sm font-medium text-foreground">
                {session?.name ?? "—"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">
              Role:{" "}
              <span className="font-semibold text-foreground capitalize">
                {session?.role ?? "—"}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — Change Password */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.577 0.245 27.325 / 0.1)" }}
            >
              <KeyRound
                className="w-4.5 h-4.5"
                style={{
                  width: "18px",
                  height: "18px",
                  color: "oklch(0.55 0.22 27)",
                }}
              />
            </div>
            <CardTitle className="text-base font-semibold">
              Change Password
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="text-sm font-medium">
                Current Password
              </Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                autoComplete="current-password"
                disabled={isChangingPassword}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                autoComplete="new-password"
                disabled={isChangingPassword}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                autoComplete="new-password"
                disabled={isChangingPassword}
              />
            </div>

            {passwordError && (
              <div
                className="px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{
                  background: "oklch(0.577 0.245 27.325 / 0.08)",
                  color: "oklch(0.5 0.22 27)",
                }}
              >
                {passwordError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card 3 — Appearance */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.65 0.14 195 / 0.12)" }}
            >
              <Palette
                className="w-4.5 h-4.5"
                style={{
                  width: "18px",
                  height: "18px",
                  color: "oklch(0.5 0.14 195)",
                }}
              />
            </div>
            <CardTitle className="text-base font-semibold">
              Appearance
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a theme that works best for you. The setting is saved to your
            browser.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Light Theme Tile */}
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                theme === "light"
                  ? "border-primary shadow-sm"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {/* Light preview swatch */}
              <div
                className="rounded-lg overflow-hidden mb-3 border border-border/50"
                style={{ height: "64px" }}
              >
                <div
                  className="h-1/3 w-full flex gap-1 p-1"
                  style={{ background: "#e8eeff" }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#4a7dde" }}
                  />
                  <div
                    className="flex-1 rounded-sm"
                    style={{ background: "#4a7dde", opacity: 0.3 }}
                  />
                </div>
                <div
                  className="h-2/3 flex gap-1 p-1.5"
                  style={{ background: "#f5f7ff" }}
                >
                  <div
                    className="w-10 rounded-sm"
                    style={{ background: "#dce3ff" }}
                  />
                  <div className="flex-1 flex flex-col gap-1">
                    <div
                      className="h-2 rounded-sm"
                      style={{ background: "#e0e5ff" }}
                    />
                    <div
                      className="h-2 rounded-sm w-3/4"
                      style={{ background: "#e0e5ff" }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Sun
                      className="w-3.5 h-3.5"
                      style={{ color: "oklch(0.75 0.18 65)" }}
                    />
                    Default
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Blue & White
                  </p>
                </div>
                {theme === "light" && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.475 0.175 255)" }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </button>

            {/* Dark Theme Tile */}
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                theme === "dark"
                  ? "border-primary shadow-sm"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {/* Dark preview swatch */}
              <div
                className="rounded-lg overflow-hidden mb-3 border border-white/10"
                style={{ height: "64px" }}
              >
                <div
                  className="h-1/3 w-full flex gap-1 p-1"
                  style={{ background: "#161b2e" }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#6b8cff" }}
                  />
                  <div
                    className="flex-1 rounded-sm"
                    style={{ background: "#6b8cff", opacity: 0.3 }}
                  />
                </div>
                <div
                  className="h-2/3 flex gap-1 p-1.5"
                  style={{ background: "#1a2035" }}
                >
                  <div
                    className="w-10 rounded-sm"
                    style={{ background: "#212a45" }}
                  />
                  <div className="flex-1 flex flex-col gap-1">
                    <div
                      className="h-2 rounded-sm"
                      style={{ background: "#2a3450" }}
                    />
                    <div
                      className="h-2 rounded-sm w-3/4"
                      style={{ background: "#2a3450" }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Moon
                      className="w-3.5 h-3.5"
                      style={{ color: "oklch(0.7 0.12 255)" }}
                    />
                    Dark
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Deep Navy
                  </p>
                </div>
                {theme === "dark" && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.55 0.18 255)" }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Current theme:{" "}
            <span className="font-semibold text-foreground capitalize">
              {theme === "light" ? "Default (Blue)" : "Dark (Deep Navy)"}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
