import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { GraduationCap, BookOpen, BarChart2, Brain, Shield, Loader2, Eye, EyeOff, Lock, User, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const features = [
  { icon: BarChart2, label: "Performance Analytics", desc: "Track every student's academic journey" },
  { icon: Brain, label: "AI-Powered Insights", desc: "Detect weak students and generate improvement plans" },
  { icon: BookOpen, label: "Marks & Feedback", desc: "Comprehensive records for all subjects" },
  { icon: Shield, label: "Secure Access Control", desc: "Role-based login for admins and teachers" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password");
      return;
    }
    setError(null);
    setIsLoggingIn(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid username or password");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(0.975 0.005 240)" }}>
      {/* Left panel - branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] p-12 text-white"
        style={{ background: "oklch(0.19 0.055 265)" }}
      >
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.55 0.18 240)" }}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg leading-none" style={{ color: "oklch(0.95 0.015 255)" }}>EduTrack AI</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "oklch(0.65 0.05 255)" }}>School Performance Manager</p>
            </div>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight mb-4" style={{ color: "oklch(0.97 0.01 255)" }}>
            Empower Every<br />Student's Success
          </h1>
          <p className="text-base leading-relaxed mb-12" style={{ color: "oklch(0.7 0.04 255)" }}>
            AI-driven analytics to identify struggling students early and create personalized learning pathways.
          </p>

          <div className="space-y-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-start gap-4">
                  <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: "oklch(0.55 0.18 240 / 0.2)" }}>
                    <Icon style={{ color: "oklch(0.72 0.14 240)", width: "18px", height: "18px" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "oklch(0.93 0.01 255)" }}>{f.label}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "oklch(0.62 0.04 255)" }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs" style={{ color: "oklch(0.45 0.03 255)" }}>
          © 2026 EduTrack AI — Built with caffeine.ai
        </p>
      </div>

      {/* Right panel - login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.19 0.055 265)" }}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg leading-none text-foreground">EduTrack AI</p>
              <p className="text-xs font-medium mt-0.5 text-muted-foreground">School Performance Manager</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-card p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in with your credentials to access the school management dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-semibold">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    className="pl-9"
                    autoComplete="username"
                    autoFocus
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    className="pl-9 pr-10"
                    autoComplete="current-password"
                    disabled={isLoggingIn}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium"
                  style={{ background: "oklch(0.97 0.02 25)", color: "oklch(0.45 0.2 25)", border: "1px solid oklch(0.85 0.08 25)" }}>
                  <Shield className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full h-11 font-semibold text-sm"
                style={{ background: "oklch(0.475 0.175 255)", color: "white" }}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Default credentials info box */}
            <div className="mt-6 p-4 rounded-xl flex items-start gap-3"
              style={{ background: "oklch(0.94 0.03 240)", border: "1px solid oklch(0.85 0.05 240)" }}>
              <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.475 0.175 255)" }} />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Default credentials</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Admin:</strong> admin / admin123<br />
                  <strong>Teacher:</strong> teacher1 / teacher123
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Contact your system administrator to reset your password.
          </p>
        </div>
      </div>
    </div>
  );
}
