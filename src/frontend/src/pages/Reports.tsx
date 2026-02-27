import { useState } from "react";
import { useAllStudents, useMarksByStudent, useFeedbackByStudent, useStudentAnalysis, useGeneratePlan } from "../hooks/useQueries";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Printer,
  MessageCircle,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import type { Mark } from "../backend.d";

const EXAM_TYPES = ["Unit Test", "Half Yearly", "Final"];

function getPercentageColor(pct: number) {
  if (pct >= 60) return "oklch(0.4 0.18 145)";
  if (pct >= 40) return "oklch(0.5 0.18 65)";
  return "oklch(0.5 0.22 25)";
}

function groupMarksByExamType(marks: Mark[]) {
  const grouped: Record<string, Mark[]> = {};
  for (const mark of marks) {
    if (!grouped[mark.examType]) grouped[mark.examType] = [];
    grouped[mark.examType].push(mark);
  }
  return grouped;
}

export default function Reports() {
  const { data: students = [], isLoading: studentsLoading } = useAllStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [improvementPlan, setImprovementPlan] = useState<string>("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  const studentIdBigInt = selectedStudentId ? BigInt(selectedStudentId) : null;
  const { data: marks = [], isLoading: marksLoading } = useMarksByStudent(studentIdBigInt);
  const { data: feedbacks = [], isLoading: feedbackLoading } = useFeedbackByStudent(studentIdBigInt);
  const { data: analysis, isLoading: analysisLoading } = useStudentAnalysis(studentIdBigInt);
  const generatePlanMutation = useGeneratePlan();

  const selectedStudent = students.find((s) => s.id.toString() === selectedStudentId);
  const groupedMarks = groupMarksByExamType(marks);

  const handleGeneratePlan = async () => {
    if (!studentIdBigInt) return;
    setGeneratingPlan(true);
    try {
      const plan = await generatePlanMutation.mutateAsync(studentIdBigInt);
      setImprovementPlan(plan);
      toast.success("Improvement plan generated");
    } catch {
      toast.error("Failed to generate plan");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const whatsappMessage = selectedStudent && analysis
    ? `📊 *Student Performance Report*\n\nStudent: ${selectedStudent.name}\nClass: ${selectedStudent.className} - ${selectedStudent.section}\nRoll No: ${selectedStudent.rollNumber}\n\nOverall Average: ${analysis.overallAverage.toFixed(1)}%\nStatus: ${analysis.isHighRisk ? "⚠️ High Risk" : analysis.isWeak ? "⚡ Needs Improvement" : "✅ Good Standing"}\n${analysis.weakSubjects.length > 0 ? `\nWeak Subjects: ${analysis.weakSubjects.join(", ")}` : ""}\n\nPlease contact the school for more details.`
    : "";

  const isLoading = marksLoading || feedbackLoading || analysisLoading;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header - no-print on action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate comprehensive performance reports with AI insights
          </p>
        </div>
        {selectedStudent && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setWhatsappModalOpen(true)}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Notify Parent
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print / PDF
            </Button>
          </div>
        )}
      </div>

      {/* Student Selector */}
      <Card className="shadow-card no-print">
        <CardContent className="pt-5 pb-4">
          <div className="space-y-1.5">
            <Label>Select Student to Generate Report</Label>
            <Select value={selectedStudentId} onValueChange={(v) => {
              setSelectedStudentId(v);
              setImprovementPlan("");
            }}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder={studentsLoading ? "Loading..." : "Choose a student"} />
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

      {/* Report Content (printable) */}
      {selectedStudentId && (
        <div className="print-area space-y-5" id="report-content">
          {/* Print header (only visible in print) */}
          <div className="print-only text-center mb-6">
            <h1 className="text-2xl font-bold">EduTrack AI — Student Performance Report</h1>
            <p className="text-sm text-gray-500 mt-1">Generated on {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
          </div>

          {/* Student Info */}
          {selectedStudent && (
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-semibold text-sm mt-0.5">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Roll Number</p>
                    <p className="font-semibold text-sm mt-0.5 font-mono">{selectedStudent.rollNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Class</p>
                    <p className="font-semibold text-sm mt-0.5">{selectedStudent.className}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Section</p>
                    <p className="font-semibold text-sm mt-0.5">{selectedStudent.section}</p>
                  </div>
                  {selectedStudent.parentPhone && (
                    <div>
                      <p className="text-xs text-muted-foreground">Parent Phone</p>
                      <p className="font-semibold text-sm mt-0.5">{selectedStudent.parentPhone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            <>
              {/* Marks Section */}
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Academic Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {marks.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">No marks recorded</div>
                  ) : (
                    EXAM_TYPES.filter((et) => groupedMarks[et]).map((examType) => (
                      <div key={examType} className="border-b border-border last:border-0">
                        <div className="px-4 py-2" style={{ background: "oklch(0.975 0.005 240)" }}>
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{examType}</p>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subject</TableHead>
                              <TableHead className="text-right">Marks</TableHead>
                              <TableHead className="text-right">Max</TableHead>
                              <TableHead className="text-right">Percentage</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(groupedMarks[examType] ?? []).map((mark) => {
                              const pct = Math.round((mark.marks / mark.maxMarks) * 100);
                              return (
                                <TableRow key={mark.id.toString()}>
                                  <TableCell className="font-medium">{mark.subject}</TableCell>
                                  <TableCell className="text-right">{mark.marks}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{mark.maxMarks}</TableCell>
                                  <TableCell className="text-right">
                                    <span className="font-bold text-sm" style={{ color: getPercentageColor(pct) }}>
                                      {pct}%
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow>
                              <TableCell className="font-bold text-sm">Exam Average</TableCell>
                              <TableCell colSpan={2} />
                              <TableCell className="text-right">
                                <span className="font-bold" style={{
                                  color: (() => {
                                    const examMarks = groupedMarks[examType] ?? [];
                                    const total = examMarks.reduce((s, m) => s + m.marks, 0);
                                    const max = examMarks.reduce((s, m) => s + m.maxMarks, 0);
                                    const pct = max > 0 ? Math.round((total / max) * 100) : 0;
                                    return getPercentageColor(pct);
                                  })()
                                }}>
                                  {(() => {
                                    const examMarks = groupedMarks[examType] ?? [];
                                    const total = examMarks.reduce((s, m) => s + m.marks, 0);
                                    const max = examMarks.reduce((s, m) => s + m.maxMarks, 0);
                                    return max > 0 ? `${Math.round((total / max) * 100)}%` : "—";
                                  })()}
                                </span>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* AI Analysis */}
              {analysis && (
                <Card className="shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Overall Average</p>
                        <p className="text-2xl font-extrabold" style={{ color: getPercentageColor(analysis.overallAverage) }}>
                          {analysis.overallAverage.toFixed(1)}%
                        </p>
                        <Progress value={analysis.overallAverage} className="h-1.5 mt-2" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Risk Assessment</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${analysis.isHighRisk ? "bg-red-500" : "bg-green-500"}`} />
                            <span className="text-sm">High Risk: {analysis.isHighRisk ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${analysis.isWeak ? "bg-orange-400" : "bg-green-500"}`} />
                            <span className="text-sm">Weak Student: {analysis.isWeak ? "Yes" : "No"}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Weak Subjects</p>
                        {analysis.weakSubjects.length === 0 ? (
                          <p className="text-sm text-emerald-600 font-medium">None identified ✓</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.weakSubjects.map((s) => (
                              <Badge key={s} className="text-xs" style={{ background: "oklch(0.97 0.02 25)", color: "oklch(0.5 0.22 25)", borderColor: "transparent" }}>
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Improvement Plan */}
              <Card className="shadow-card">
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: "oklch(0.475 0.175 255)" }} />
                    AI Improvement Plan
                  </CardTitle>
                  {!improvementPlan && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGeneratePlan}
                      disabled={generatingPlan}
                      className="no-print"
                    >
                      {generatingPlan && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      {generatingPlan ? "Generating..." : "Generate Plan"}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {improvementPlan ? (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-sans bg-transparent p-0">
                        {improvementPlan}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Click "Generate Plan" to create an AI improvement plan</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Teacher Feedback */}
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Teacher Feedback</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {feedbacks.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">No feedback recorded</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-center">Clarity</TableHead>
                          <TableHead className="text-center">Participation</TableHead>
                          <TableHead className="text-center">Behaviour</TableHead>
                          <TableHead className="text-center">HW Done</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedbacks.map((fb) => (
                          <TableRow key={fb.id.toString()}>
                            <TableCell className="font-medium">{fb.subject}</TableCell>
                            <TableCell className="text-center">{Number(fb.conceptClarity)}/5</TableCell>
                            <TableCell className="text-center">{Number(fb.participation)}/5</TableCell>
                            <TableCell className="text-center">{Number(fb.behaviour)}/5</TableCell>
                            <TableCell className="text-center">
                              {fb.homeworkCompletion
                                ? <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "oklch(0.5 0.18 145)" }} />
                                : <XCircle className="w-4 h-4 mx-auto" style={{ color: "oklch(0.5 0.22 25)" }} />}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{fb.remarks || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {!selectedStudentId && (
        <Card className="shadow-card no-print">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "oklch(0.475 0.175 255 / 0.1)" }}>
              <FileText className="w-8 h-8" style={{ color: "oklch(0.475 0.175 255)" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Select a Student</p>
              <p className="text-sm mt-1">Choose a student to view their comprehensive performance report.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Notification Modal */}
      <Dialog open={whatsappModalOpen} onOpenChange={setWhatsappModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Parent Notification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl" style={{ background: "oklch(0.94 0.07 145 / 0.2)" }}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Message Preview</p>
              <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {whatsappMessage}
              </pre>
            </div>
            <div className="p-3 rounded-lg border border-dashed" style={{ borderColor: "oklch(0.475 0.175 255 / 0.3)" }}>
              <p className="text-xs text-muted-foreground">
                <strong>Integration Note:</strong> To enable WhatsApp Business API integration, connect your WhatsApp Business Account credentials in the settings. The above message will be sent directly to {selectedStudent?.parentPhone || "the parent's phone number"}.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappModalOpen(false)}>Close</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                toast.info("WhatsApp Business API integration coming soon!");
                setWhatsappModalOpen(false);
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
