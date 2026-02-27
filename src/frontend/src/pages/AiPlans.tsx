import { useState } from "react";
import { useAllStudents, useStudentAnalysis, useGeneratePlan } from "../hooks/useQueries";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Target,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Sparkles,
  Loader2,
  ChevronRight,
} from "lucide-react";

function parseImprovementPlan(plan: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  // Split by week or section headers
  const lines = plan.split("\n");
  let current: { title: string; content: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect headers: lines starting with Week, Day, Step, Phase, or **text**
    const isHeader =
      /^(week|day|step|phase|month|section|\*\*.*\*\*)/i.test(trimmed) ||
      /^\d+\.\s+[A-Z]/.test(trimmed) ||
      trimmed.endsWith(":");

    if (isHeader) {
      if (current) sections.push(current);
      current = {
        title: trimmed.replace(/\*\*/g, "").replace(/:$/, ""),
        content: "",
      };
    } else if (current) {
      current.content += (current.content ? "\n" : "") + trimmed;
    } else {
      current = { title: "Overview", content: trimmed };
    }
  }
  if (current) sections.push(current);

  return sections.length > 0 ? sections : [{ title: "Improvement Plan", content: plan }];
}

export default function AiPlans() {
  const { data: students = [], isLoading: studentsLoading } = useAllStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [improvementPlan, setImprovementPlan] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const studentIdBigInt = selectedStudentId ? BigInt(selectedStudentId) : null;
  const { data: analysis, isLoading: analysisLoading } = useStudentAnalysis(studentIdBigInt);
  const generatePlan = useGeneratePlan();

  const selectedStudent = students.find((s) => s.id.toString() === selectedStudentId);

  const handleGeneratePlan = async () => {
    if (!studentIdBigInt) return;
    setGenerating(true);
    try {
      const plan = await generatePlan.mutateAsync(studentIdBigInt);
      setImprovementPlan(plan);
      toast.success("AI improvement plan generated!");
    } catch {
      toast.error("Failed to generate plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const planSections = improvementPlan ? parseImprovementPlan(improvementPlan) : [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Improvement Plans</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          AI-powered analysis and personalized improvement plans for each student
        </p>
      </div>

      {/* Student Selection */}
      <Card className="shadow-card max-w-lg">
        <CardContent className="pt-5 pb-4">
          <div className="space-y-1.5">
            <Label>Select Student</Label>
            <Select value={selectedStudentId} onValueChange={(v) => {
              setSelectedStudentId(v);
              setImprovementPlan("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder={studentsLoading ? "Loading students..." : "Choose a student"} />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id.toString()} value={s.id.toString()}>
                    {s.name} — {s.rollNumber} ({s.className}-{s.section})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Cards */}
      {selectedStudentId && (
        <div className="space-y-4">
          {analysisLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : analysis ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.475 0.175 255 / 0.12)" }}>
                  <Brain className="w-5 h-5" style={{ color: "oklch(0.475 0.175 255)" }} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{selectedStudent?.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedStudent?.className} - Section {selectedStudent?.section} | Roll: {selectedStudent?.rollNumber}
                  </p>
                </div>
                {analysis.isHighRisk && <span className="badge-high-risk ml-auto">High Risk</span>}
                {!analysis.isHighRisk && analysis.isWeak && <span className="badge-weak ml-auto">Weak</span>}
                {!analysis.isHighRisk && !analysis.isWeak && <span className="badge-good ml-auto">Good Standing</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Overall Average */}
                <Card className="shadow-card">
                  <CardContent className="pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Overall Average</p>
                    <p className="text-3xl font-extrabold mb-2" style={{
                      color: analysis.overallAverage >= 60
                        ? "oklch(0.4 0.18 145)"
                        : analysis.overallAverage >= 40
                          ? "oklch(0.5 0.18 65)"
                          : "oklch(0.5 0.22 25)"
                    }}>
                      {analysis.overallAverage.toFixed(1)}%
                    </p>
                    <Progress
                      value={analysis.overallAverage}
                      className="h-2"
                    />
                  </CardContent>
                </Card>

                {/* Status */}
                <Card className="shadow-card">
                  <CardContent className="pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Risk Status</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${analysis.isHighRisk ? "bg-red-500" : "bg-green-500"}`} />
                        <span className="text-sm font-medium">High Risk: {analysis.isHighRisk ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${analysis.isWeak ? "bg-orange-400" : "bg-green-500"}`} />
                        <span className="text-sm font-medium">Weak: {analysis.isWeak ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weak Subjects */}
                <Card className="shadow-card sm:col-span-2">
                  <CardContent className="pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Weak Subjects</p>
                    {analysis.weakSubjects.length === 0 ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">No weak subjects identified</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {analysis.weakSubjects.map((subj) => (
                          <Badge
                            key={subj}
                            className="text-xs"
                            style={{ background: "oklch(0.97 0.02 25)", color: "oklch(0.5 0.22 25)", borderColor: "transparent" }}
                          >
                            {subj}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Generate Plan Button */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleGeneratePlan}
                  disabled={generating}
                  size="lg"
                  className="font-semibold"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating AI Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate AI Improvement Plan
                    </>
                  )}
                </Button>
                {improvementPlan && (
                  <p className="text-sm text-muted-foreground">Plan generated ✓</p>
                )}
              </div>
            </>
          ) : (
            <Card className="shadow-card">
              <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                <BookOpen className="w-8 h-8 opacity-30" />
                <p className="text-sm">No analysis data available for this student yet.</p>
                <p className="text-xs">Add marks to generate analysis.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Improvement Plan Display */}
      {improvementPlan && planSections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: "oklch(0.475 0.175 255)" }} />
            <h2 className="font-bold text-lg text-foreground">AI-Generated Improvement Plan</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planSections.map((section, idx) => (
              <Card
                key={`section-${section.title}-${idx}`}
                className="shadow-card border-l-4"
                style={{ borderLeftColor: `oklch(${0.4 + idx * 0.07} ${0.15 + (idx % 3) * 0.04} ${240 + (idx * 20) % 60})` }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: `oklch(${0.45 + idx * 0.07} 0.18 ${240 + (idx * 20) % 60})` }}
                    >
                      {idx + 1}
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedStudentId && (
        <Card className="shadow-card">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "oklch(0.475 0.175 255 / 0.1)" }}>
              <Brain className="w-8 h-8" style={{ color: "oklch(0.475 0.175 255)" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Select a Student to Begin</p>
              <p className="text-sm mt-1">Choose a student from the dropdown to view their AI analysis and generate an improvement plan.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
