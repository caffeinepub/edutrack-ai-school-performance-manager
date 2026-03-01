import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  History,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AiPlan } from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import { useAllStudents, useStudentAnalysis } from "../hooks/useQueries";

// ──────────────────────────────────────────────
// Plan text parser
// ──────────────────────────────────────────────

interface WeekSection {
  week: number;
  title: string;
  lines: string[];
}

interface ParsedPlan {
  header: string[];
  weeks: WeekSection[];
  footer: string[];
}

function parsePlanText(text: string): ParsedPlan {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const weeks: WeekSection[] = [];
  const header: string[] = [];
  const footer: string[] = [];
  let currentWeek: WeekSection | null = null;
  let pastWeeks = false;

  for (const line of lines) {
    const weekMatch = line.match(/^WEEK\s*(\d+)[:\s–-]*(.*)/i);
    if (weekMatch) {
      if (currentWeek) weeks.push(currentWeek);
      const weekNum = Number.parseInt(weekMatch[1], 10);
      const weekTitle = weekMatch[2]?.trim() || `Week ${weekNum}`;
      currentWeek = { week: weekNum, title: weekTitle, lines: [] };
      pastWeeks = true;
    } else if (currentWeek) {
      currentWeek.lines.push(line);
    } else if (!pastWeeks) {
      header.push(line);
    } else {
      footer.push(line);
    }
  }
  if (currentWeek) weeks.push(currentWeek);

  return { header, weeks, footer };
}

function LineItem({ line }: { line: string }) {
  const isBullet = /^[•\-□▸▹➤]/.test(line);
  const isCheck = /^[✓✔]/.test(line);
  const isNumbered = /^\d+[.)]\s/.test(line);
  const isParent = /parent/i.test(line) && (isBullet || isCheck);

  if (isCheck) {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
        <span className="text-sm text-foreground/80">
          {line.replace(/^[✓✔]\s*/, "")}
        </span>
      </div>
    );
  }

  if (isParent) {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <span className="mt-1 text-xs shrink-0">👨‍👩‍👧</span>
        <span className="text-sm text-foreground/80">
          {line.replace(/^[•\-□▸▹➤]\s*/, "")}
        </span>
      </div>
    );
  }

  if (isBullet || isNumbered) {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0" />
        <span className="text-sm text-foreground/80">
          {line.replace(/^[•\-□▸▹➤\d.)]\s*/, "")}
        </span>
      </div>
    );
  }

  return (
    <p className="text-sm text-foreground/80 py-0.5 leading-relaxed">{line}</p>
  );
}

const WEEK_COLORS: Record<
  number,
  { bg: string; border: string; text: string; badge: string }
> = {
  1: {
    bg: "oklch(0.97 0.015 240)",
    border: "oklch(0.55 0.18 240)",
    text: "oklch(0.35 0.12 240)",
    badge: "oklch(0.55 0.18 240)",
  },
  2: {
    bg: "oklch(0.97 0.015 290)",
    border: "oklch(0.55 0.18 290)",
    text: "oklch(0.35 0.12 290)",
    badge: "oklch(0.55 0.18 290)",
  },
  3: {
    bg: "oklch(0.97 0.03 55)",
    border: "oklch(0.6 0.18 55)",
    text: "oklch(0.38 0.14 55)",
    badge: "oklch(0.6 0.18 55)",
  },
  4: {
    bg: "oklch(0.96 0.03 145)",
    border: "oklch(0.5 0.18 145)",
    text: "oklch(0.32 0.14 145)",
    badge: "oklch(0.5 0.18 145)",
  },
};

function getWeekColor(week: number) {
  return WEEK_COLORS[week] ?? WEEK_COLORS[1];
}

// ──────────────────────────────────────────────
// Version status badge
// ──────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "Active") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{
          background: "oklch(0.93 0.05 240)",
          color: "oklch(0.38 0.18 240)",
        }}
      >
        Active
      </span>
    );
  }
  if (status === "Completed") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{
          background: "oklch(0.93 0.07 145)",
          color: "oklch(0.38 0.18 145)",
        }}
      >
        Completed
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: "oklch(0.93 0.01 240)",
        color: "oklch(0.52 0.04 255)",
      }}
    >
      Updated
    </span>
  );
}

// ──────────────────────────────────────────────
// Format date from nanoseconds
// ──────────────────────────────────────────────

function formatDate(nanoseconds: bigint): string {
  try {
    const ms = Number(nanoseconds / 1_000_000n);
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export default function AiPlans() {
  const { session } = useAuth();
  const { actor } = useActor();
  const token = session?.token ?? "";

  const { data: students = [], isLoading: studentsLoading } = useAllStudents();

  // Selection state
  const [selectedStudentId, setSelectedStudentId] = useState<bigint | null>(
    null,
  );
  const [search, setSearch] = useState("");

  // Plan state
  const [plans, setPlans] = useState<AiPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [viewingPlanId, setViewingPlanId] = useState<bigint | null>(null);

  // Action state
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [actionError, setActionError] = useState<string>("");

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) ?? null;
  const studentIdForAnalysis = selectedStudentId;
  const { data: analysis } = useStudentAnalysis(studentIdForAnalysis);

  // Viewed plan
  const viewingPlan = plans.find((p) => p.id === viewingPlanId) ?? null;
  const activePlan = plans.find((p) => p.status === "Active") ?? null;

  // Load plans when student changes
  const loadPlans = useCallback(
    async (studentId: bigint) => {
      if (!actor || !token) return;
      setPlansLoading(true);
      setActionError("");
      try {
        const result = await actor.getAiPlansByStudent(token, studentId);
        const sorted = [...result].sort((a, b) =>
          Number(a.planVersion - b.planVersion),
        );
        setPlans(sorted);
        // Auto-select active plan
        const active = sorted.find((p) => p.status === "Active");
        if (active) {
          setViewingPlanId(active.id);
        } else if (sorted.length > 0) {
          setViewingPlanId(sorted[sorted.length - 1].id);
        } else {
          setViewingPlanId(null);
        }
      } catch {
        setActionError("Failed to load plan history.");
      } finally {
        setPlansLoading(false);
      }
    },
    [actor, token],
  );

  useEffect(() => {
    if (selectedStudentId && actor && token) {
      loadPlans(selectedStudentId);
    } else {
      setPlans([]);
      setViewingPlanId(null);
    }
  }, [selectedStudentId, actor, token, loadPlans]);

  // Generate plan
  const handleGenerate = async (forceRegenerate: boolean) => {
    if (!selectedStudentId || !actor || !token) return;
    const previousActivePlanVersion = activePlan?.planVersion ?? null;

    if (forceRegenerate) setRegenerating(true);
    else setGenerating(true);
    setActionError("");

    try {
      const result = await actor.generateAndSaveAiPlan(
        token,
        selectedStudentId,
        forceRegenerate,
      );

      if (result.__kind__ === "err") {
        setActionError(result.err);
        toast.error(result.err);
        return;
      }

      const newPlan = result.ok;
      await loadPlans(selectedStudentId);

      // Detect if no change (same version as before)
      if (
        previousActivePlanVersion !== null &&
        newPlan.planVersion === previousActivePlanVersion &&
        !forceRegenerate
      ) {
        toast.info(
          "No major academic change detected. Showing existing improvement plan.",
        );
      } else {
        toast.success(
          forceRegenerate
            ? "Plan regenerated successfully!"
            : "Improvement plan generated!",
        );
      }

      setViewingPlanId(newPlan.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate plan.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
      setRegenerating(false);
    }
  };

  // Mark as complete / revert
  const handleMarkComplete = async () => {
    if (!viewingPlan || !actor || !token) return;
    setMarkingComplete(true);
    setActionError("");
    try {
      const newStatus =
        viewingPlan.status === "Active" ? "Completed" : "Active";
      const result = await actor.updateAiPlanStatus(
        token,
        viewingPlan.id,
        newStatus,
      );
      if (result.__kind__ === "err") {
        toast.error(result.err);
        return;
      }
      await loadPlans(selectedStudentId!);
      toast.success(
        newStatus === "Completed"
          ? "Plan marked as completed!"
          : "Plan reactivated.",
      );
    } catch {
      toast.error("Failed to update plan status.");
    } finally {
      setMarkingComplete(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.className.toLowerCase().includes(search.toLowerCase()),
  );

  // Parsed plan text
  const parsedPlan = viewingPlan ? parsePlanText(viewingPlan.aiPlanText) : null;

  // Target achieved check
  const currentAvg =
    viewingPlan?.basedOnAverage ?? analysis?.overallAverage ?? 0;
  const targetPct = viewingPlan?.improvementTargetPercentage ?? 0;
  const targetAchieved = currentAvg >= targetPct && targetPct > 0;

  return (
    <div className="flex flex-col lg:flex-row gap-5 max-w-7xl h-full">
      {/* ─── Left Panel: Student Selector + Version History ─── */}
      <aside className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col gap-3">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            AI Improvement Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Personalized, trackable plans for every student
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Student List */}
        <Card className="shadow-card flex-1 overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Students ({filteredStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-64 lg:max-h-80">
            {studentsLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No students found
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudentId === student.id;
                  return (
                    <button
                      type="button"
                      key={student.id.toString()}
                      onClick={() => {
                        setSelectedStudentId(student.id);
                        setActionError("");
                      }}
                      className={[
                        "w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-all duration-100",
                        isSelected
                          ? "bg-primary/10 border-l-2 border-l-primary"
                          : "hover:bg-accent/60",
                      ].join(" ")}
                    >
                      <div
                        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{
                          background: isSelected
                            ? "oklch(0.475 0.175 255 / 0.2)"
                            : "oklch(0.93 0.02 240)",
                          color: isSelected
                            ? "oklch(0.375 0.175 255)"
                            : "oklch(0.42 0.06 255)",
                        }}
                      >
                        {student.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}
                        >
                          {student.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.className} · Sec {student.section}
                        </p>
                      </div>
                      {isSelected && (
                        <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Version History */}
        {selectedStudentId && (
          <Card className="shadow-card overflow-hidden">
            <CardHeader className="pb-2 pt-3 px-3 flex-row items-center gap-2">
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plan History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-52">
              {plansLoading ? (
                <div className="p-3 space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : plans.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground px-3">
                  No plans generated yet
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {plans.map((plan) => {
                    const isViewing = viewingPlanId === plan.id;
                    return (
                      <button
                        type="button"
                        key={plan.id.toString()}
                        onClick={() => setViewingPlanId(plan.id)}
                        className={[
                          "w-full text-left px-3 py-2.5 transition-all duration-100",
                          isViewing ? "bg-primary/10" : "hover:bg-accent/40",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs font-semibold ${isViewing ? "text-primary" : "text-foreground"}`}
                          >
                            Version {Number(plan.planVersion)}
                          </p>
                          <StatusBadge status={plan.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Based on {plan.basedOnExamType}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {formatDate(plan.generatedDate)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </aside>

      {/* ─── Right Panel: Plan Detail ─── */}
      <main className="flex-1 min-w-0 flex flex-col gap-4">
        {!selectedStudentId ? (
          /* Empty state */
          <Card className="shadow-card flex-1">
            <CardContent className="py-20 flex flex-col items-center gap-5 text-muted-foreground">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: "oklch(0.475 0.175 255 / 0.1)" }}
              >
                <Brain
                  className="w-10 h-10"
                  style={{ color: "oklch(0.475 0.175 255)" }}
                />
              </div>
              <div className="text-center max-w-xs">
                <p className="font-semibold text-foreground text-lg">
                  Select a Student
                </p>
                <p className="text-sm mt-1.5">
                  Choose a student from the left panel to view or generate their
                  personalized AI improvement plan.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Student header + stats */}
            <Card className="shadow-card">
              <CardContent className="py-4 px-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Name & class */}
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0"
                      style={{
                        background: "oklch(0.475 0.175 255 / 0.15)",
                        color: "oklch(0.38 0.18 255)",
                      }}
                    >
                      {selectedStudent?.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground text-lg leading-tight">
                        {selectedStudent?.name}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedStudent?.className} · Section{" "}
                        {selectedStudent?.section} · Roll{" "}
                        {selectedStudent?.rollNumber}
                      </p>
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                      style={{ background: "oklch(0.94 0.01 240)" }}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground text-xs">
                        Current Avg:
                      </span>
                      <span
                        className="font-bold text-sm"
                        style={{
                          color:
                            currentAvg >= 60
                              ? "oklch(0.4 0.18 145)"
                              : currentAvg >= 40
                                ? "oklch(0.5 0.18 65)"
                                : "oklch(0.5 0.22 25)",
                        }}
                      >
                        {currentAvg.toFixed(1)}%
                      </span>
                    </div>

                    {targetPct > 0 && (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                        style={{ background: "oklch(0.96 0.03 145 / 0.5)" }}
                      >
                        <Target
                          className="w-3.5 h-3.5"
                          style={{ color: "oklch(0.45 0.18 145)" }}
                        />
                        <span className="text-muted-foreground text-xs">
                          4-Week Target:
                        </span>
                        <span
                          className="font-bold text-sm"
                          style={{ color: "oklch(0.4 0.18 145)" }}
                        >
                          {targetPct.toFixed(1)}%
                        </span>
                      </div>
                    )}

                    {targetAchieved && (
                      <span
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: "oklch(0.93 0.07 145)",
                          color: "oklch(0.38 0.18 145)",
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Target Achieved ✓
                      </span>
                    )}

                    {analysis?.isHighRisk && (
                      <span className="badge-high-risk">High Risk</span>
                    )}
                    {!analysis?.isHighRisk && analysis?.isWeak && (
                      <span className="badge-weak">Weak</span>
                    )}
                    {analysis && !analysis.isHighRisk && !analysis.isWeak && (
                      <span className="badge-good">Normal</span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {targetPct > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-muted-foreground">
                        Progress toward target
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: targetAchieved
                            ? "oklch(0.4 0.18 145)"
                            : "oklch(0.52 0.04 255)",
                        }}
                      >
                        {Math.min(
                          100,
                          Math.round((currentAvg / targetPct) * 100),
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (currentAvg / targetPct) * 100)}
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error banner */}
            {actionError && (
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
                style={{
                  background: "oklch(0.97 0.02 25)",
                  color: "oklch(0.5 0.22 25)",
                  border: "1px solid oklch(0.93 0.05 25)",
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {actionError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => handleGenerate(false)}
                disabled={generating || regenerating}
                size="sm"
                className="font-semibold"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    {plans.length === 0 ? "Generate Plan" : "Check for Updates"}
                  </>
                )}
              </Button>

              {plans.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => handleGenerate(true)}
                  disabled={generating || regenerating}
                  size="sm"
                  className="font-semibold"
                >
                  {regenerating ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      Regenerate Plan
                    </>
                  )}
                </Button>
              )}

              {viewingPlan && (
                <Button
                  variant={
                    viewingPlan.status === "Active" ? "default" : "outline"
                  }
                  onClick={handleMarkComplete}
                  disabled={markingComplete}
                  size="sm"
                  className={
                    viewingPlan.status === "Active"
                      ? "font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                      : "font-semibold text-muted-foreground"
                  }
                >
                  {markingComplete ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  )}
                  {viewingPlan.status === "Active"
                    ? "Mark as Completed"
                    : "Reactivate Plan"}
                </Button>
              )}

              {viewingPlan && (
                <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Viewing: Version {Number(viewingPlan.planVersion)} ·{" "}
                    {formatDate(viewingPlan.generatedDate)}
                  </span>
                  <StatusBadge status={viewingPlan.status} />
                </div>
              )}
            </div>

            {/* Plan content */}
            {plansLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-xl" />
                ))}
              </div>
            ) : !viewingPlan ? (
              /* No plan yet */
              <Card className="shadow-card">
                <CardContent className="py-14 flex flex-col items-center gap-4 text-muted-foreground">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "oklch(0.475 0.175 255 / 0.1)" }}
                  >
                    <Brain
                      className="w-7 h-7"
                      style={{ color: "oklch(0.475 0.175 255)" }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">
                      No Plan Generated Yet
                    </p>
                    <p className="text-sm mt-1 max-w-sm">
                      Click <strong>Generate Plan</strong> to create a
                      personalized AI improvement plan based on this student's
                      marks and teacher feedback.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : parsedPlan ? (
              <div className="space-y-3">
                {/* Plan header info */}
                {parsedPlan.header.length > 0 && (
                  <Card className="shadow-card overflow-hidden">
                    <CardContent className="pt-4 pb-3 px-5 space-y-1">
                      {parsedPlan.header.map((line) => (
                        <p
                          key={line}
                          className="text-sm text-foreground/80 leading-relaxed"
                        >
                          {line}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Academic status summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div
                    className="rounded-xl p-3.5 flex flex-col gap-1"
                    style={{
                      background: "oklch(0.97 0.015 240)",
                      border: "1px solid oklch(0.9 0.03 240)",
                    }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.52 0.04 255)" }}
                    >
                      Base Average
                    </span>
                    <span
                      className="text-xl font-extrabold"
                      style={{ color: "oklch(0.38 0.18 240)" }}
                    >
                      {viewingPlan.basedOnAverage.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="rounded-xl p-3.5 flex flex-col gap-1"
                    style={{
                      background: "oklch(0.96 0.03 145 / 0.5)",
                      border: "1px solid oklch(0.88 0.06 145)",
                    }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.52 0.04 255)" }}
                    >
                      4-Week Target
                    </span>
                    <span
                      className="text-xl font-extrabold"
                      style={{ color: "oklch(0.38 0.18 145)" }}
                    >
                      {viewingPlan.improvementTargetPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="rounded-xl p-3.5 flex flex-col gap-1"
                    style={{
                      background: "oklch(0.97 0.015 65 / 0.5)",
                      border: "1px solid oklch(0.9 0.04 65)",
                    }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.52 0.04 255)" }}
                    >
                      Exam Basis
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: "oklch(0.45 0.16 65)" }}
                    >
                      {viewingPlan.basedOnExamType}
                    </span>
                  </div>
                  <div
                    className="rounded-xl p-3.5 flex flex-col gap-1"
                    style={{
                      background: "oklch(0.97 0.01 240)",
                      border: "1px solid oklch(0.9 0.02 240)",
                    }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.52 0.04 255)" }}
                    >
                      Target Achieved
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: targetAchieved
                          ? "oklch(0.38 0.18 145)"
                          : "oklch(0.52 0.22 25)",
                      }}
                    >
                      {targetAchieved ? "Yes ✓" : "In Progress"}
                    </span>
                  </div>
                </div>

                {/* Weekly plan cards */}
                {parsedPlan.weeks.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parsedPlan.weeks.map((week) => {
                      const colors = getWeekColor(week.week);
                      const weekLabels = [
                        "",
                        "Foundation & Focus",
                        "Concept Strengthening",
                        "Test Simulation",
                        "Mock & Review",
                      ];
                      const label = weekLabels[week.week] ?? week.title;

                      return (
                        <Card
                          key={week.week}
                          className="shadow-card overflow-hidden"
                          style={{ borderLeft: `4px solid ${colors.border}` }}
                        >
                          <CardHeader className="pb-2 pt-4 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                                style={{ background: colors.badge }}
                              >
                                W{week.week}
                              </div>
                              <div>
                                <p
                                  className="text-xs font-bold uppercase tracking-wider"
                                  style={{ color: colors.text }}
                                >
                                  Week {week.week}
                                </p>
                                <p className="text-sm font-semibold text-foreground leading-tight">
                                  {week.title || label}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 pt-1">
                            <div className="space-y-0.5">
                              {week.lines.map((line) => (
                                <LineItem
                                  key={`w${week.week}-${line.slice(0, 30)}`}
                                  line={line}
                                />
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* If no week structure found, show raw */}
                {parsedPlan.weeks.length === 0 && (
                  <Card className="shadow-card">
                    <CardContent className="pt-4 pb-4 px-5">
                      <pre className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed font-sans">
                        {viewingPlan.aiPlanText}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Footer / notes */}
                {parsedPlan.footer.length > 0 && (
                  <Card
                    className="shadow-card"
                    style={{ background: "oklch(0.97 0.015 240)" }}
                  >
                    <CardContent className="pt-3 pb-3 px-5 flex items-start gap-2">
                      <Info
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: "oklch(0.52 0.1 240)" }}
                      />
                      <div className="space-y-1">
                        {parsedPlan.footer.map((line) => (
                          <p
                            key={line}
                            className="text-sm text-muted-foreground"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
