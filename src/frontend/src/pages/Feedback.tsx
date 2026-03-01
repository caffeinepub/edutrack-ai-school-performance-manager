import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Loader2,
  MessageSquare,
  Send,
  Star,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAddFeedback,
  useAllFeedback,
  useAllStudents,
} from "../hooks/useQueries";

const SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "Social Science",
  "Hindi",
  "Computer",
];

interface FeedbackForm {
  studentId: string;
  subject: string;
  conceptClarity: number;
  homeworkCompletion: boolean;
  participation: number;
  behaviour: number;
  remarks: string;
}

const emptyForm: FeedbackForm = {
  studentId: "",
  subject: "",
  conceptClarity: 3,
  homeworkCompletion: true,
  participation: 3,
  behaviour: 3,
  remarks: "",
};

function StarRating({
  value,
  onChange,
  max = 5,
}: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={`star-${i + 1}`}
          type="button"
          onClick={() => onChange(i + 1)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            className="w-6 h-6"
            style={{
              fill: i < value ? "oklch(0.65 0.2 65)" : "transparent",
              color: i < value ? "oklch(0.65 0.2 65)" : "oklch(0.7 0.01 240)",
            }}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-semibold text-muted-foreground">
        {value}/{max}
      </span>
    </div>
  );
}

function RatingLabel(value: number) {
  if (value <= 1) return "Poor";
  if (value <= 2) return "Below Average";
  if (value <= 3) return "Average";
  if (value <= 4) return "Good";
  return "Excellent";
}

export default function FeedbackPage() {
  const { data: students = [], isLoading: studentsLoading } = useAllStudents();
  const { data: feedbacks = [], isLoading: feedbackLoading } = useAllFeedback();
  const addFeedback = useAddFeedback();

  const [form, setForm] = useState<FeedbackForm>(emptyForm);

  const handleSubmit = async () => {
    if (!form.studentId || !form.subject) {
      toast.error("Please select a student and subject");
      return;
    }
    try {
      await addFeedback.mutateAsync({
        studentId: BigInt(form.studentId),
        subject: form.subject,
        conceptClarity: BigInt(form.conceptClarity),
        homeworkCompletion: form.homeworkCompletion,
        participation: BigInt(form.participation),
        behaviour: BigInt(form.behaviour),
        remarks: form.remarks,
      });
      toast.success("Feedback submitted successfully");
      setForm(emptyForm);
    } catch {
      toast.error("Failed to submit feedback");
    }
  };

  const studentMap = new Map(students.map((s) => [s.id.toString(), s]));

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Teacher Feedback</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Submit detailed feedback for students to aid AI analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Feedback Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Submit Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>
                  Student <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.studentId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, studentId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      students.map((s) => (
                        <SelectItem
                          key={s.id.toString()}
                          value={s.id.toString()}
                        >
                          {s.name} ({s.className}-{s.section})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.subject}
                  onValueChange={(v) => setForm((p) => ({ ...p, subject: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className="space-y-2 p-4 rounded-xl"
                style={{ background: "oklch(0.975 0.005 240)" }}
              >
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Concept Clarity
                  </Label>
                  <StarRating
                    value={form.conceptClarity}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, conceptClarity: v }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {RatingLabel(form.conceptClarity)}
                  </p>
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Class Participation
                  </Label>
                  <StarRating
                    value={form.participation}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, participation: v }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {RatingLabel(form.participation)}
                  </p>
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Behaviour
                  </Label>
                  <StarRating
                    value={form.behaviour}
                    onChange={(v) => setForm((p) => ({ ...p, behaviour: v }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {RatingLabel(form.behaviour)}
                  </p>
                </div>

                <div className="pt-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Homework Completion
                  </Label>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, homeworkCompletion: true }))
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        form.homeworkCompletion
                          ? "border-emerald-500 text-emerald-700"
                          : "border-border text-muted-foreground hover:border-border/80"
                      }`}
                      style={
                        form.homeworkCompletion
                          ? { background: "oklch(0.93 0.07 145 / 0.3)" }
                          : {}
                      }
                    >
                      <CheckCircle className="w-4 h-4" />
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, homeworkCompletion: false }))
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        !form.homeworkCompletion
                          ? "border-red-400 text-red-700"
                          : "border-border text-muted-foreground hover:border-border/80"
                      }`}
                      style={
                        !form.homeworkCompletion
                          ? { background: "oklch(0.97 0.02 25 / 0.5)" }
                          : {}
                      }
                    >
                      <XCircle className="w-4 h-4" />
                      No
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="remarks">Teacher Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Write additional observations or comments..."
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, remarks: e.target.value }))
                  }
                  className="min-h-[80px] resize-none"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={addFeedback.isPending}
                className="w-full"
              >
                {addFeedback.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Feedback
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feedback History */}
        <div className="lg:col-span-3">
          <Card className="shadow-card">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Feedback History
              </CardTitle>
              <Badge variant="secondary">{feedbacks.length} entries</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {feedbackLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : feedbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <MessageSquare className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No feedback submitted yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Clarity</TableHead>
                        <TableHead className="text-center">
                          Participation
                        </TableHead>
                        <TableHead className="text-center">Behaviour</TableHead>
                        <TableHead className="text-center">Homework</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbacks.map((fb) => {
                        const student = studentMap.get(fb.studentId.toString());
                        return (
                          <TableRow key={fb.id.toString()}>
                            <TableCell className="font-medium">
                              {student?.name ?? `ID: ${fb.studentId}`}
                            </TableCell>
                            <TableCell className="text-sm">
                              {fb.subject}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold">
                                {Number(fb.conceptClarity)}/5
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold">
                                {Number(fb.participation)}/5
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold">
                                {Number(fb.behaviour)}/5
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {fb.homeworkCompletion ? (
                                <CheckCircle
                                  className="w-4 h-4 mx-auto"
                                  style={{ color: "oklch(0.5 0.18 145)" }}
                                />
                              ) : (
                                <XCircle
                                  className="w-4 h-4 mx-auto"
                                  style={{ color: "oklch(0.5 0.22 25)" }}
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {fb.remarks || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
