import { useState, useRef } from "react";
import { useAllStudents, useAllMarks, useAddMark } from "../hooks/useQueries";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ClipboardList, Upload, Plus, Loader2, FileText } from "lucide-react";
import type { Mark } from "../backend.d";
import { useActor } from "../hooks/useActor";

const SUBJECTS = ["Mathematics", "Science", "English", "Social Science", "Hindi", "Computer"];
const EXAM_TYPES = ["Unit Test", "Half Yearly", "Final"];

interface ManualForm {
  studentId: string;
  subject: string;
  examType: string;
  marks: string;
  maxMarks: string;
}

const emptyForm: ManualForm = {
  studentId: "",
  subject: "",
  examType: "",
  marks: "",
  maxMarks: "100",
};

function getPercentageColor(pct: number) {
  if (pct >= 60) return "oklch(0.4 0.18 145)";
  if (pct >= 40) return "oklch(0.5 0.18 65)";
  return "oklch(0.5 0.22 25)";
}

export default function MarksEntry() {
  const { data: students = [], isLoading: studentsLoading } = useAllStudents();
  const { data: marks = [], isLoading: marksLoading } = useAllMarks();
  const addMark = useAddMark();
  const { actor } = useActor();
  const { session } = useAuth();

  const [form, setForm] = useState<ManualForm>(emptyForm);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleManualSubmit = async () => {
    if (!form.studentId || !form.subject || !form.examType || !form.marks || !form.maxMarks) {
      toast.error("Please fill all required fields");
      return;
    }
    const marksNum = parseFloat(form.marks);
    const maxMarksNum = parseFloat(form.maxMarks);
    if (isNaN(marksNum) || isNaN(maxMarksNum) || marksNum < 0 || maxMarksNum <= 0) {
      toast.error("Enter valid marks values");
      return;
    }
    if (marksNum > maxMarksNum) {
      toast.error("Marks cannot exceed maximum marks");
      return;
    }
    try {
      await addMark.mutateAsync({
        studentId: BigInt(form.studentId),
        subject: form.subject,
        examType: form.examType,
        marks: marksNum,
        maxMarks: maxMarksNum,
      });
      toast.success("Marks added successfully");
      setForm(emptyForm);
    } catch {
      toast.error("Failed to add marks");
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }
    setCsvUploading(true);
    try {
      const text = await csvFile.text();
      const lines = text.trim().split("\n");
      // Skip header if present
      const dataLines = lines[0].toLowerCase().includes("studentid") ? lines.slice(1) : lines;
      let successCount = 0;
      let errorCount = 0;

      for (const line of dataLines) {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length < 5) { errorCount++; continue; }
        const [studentId, subject, examType, marksStr, maxMarksStr] = parts;
        const marksVal = parseFloat(marksStr);
        const maxMarksVal = parseFloat(maxMarksStr);
        if (!studentId || !subject || !examType || isNaN(marksVal) || isNaN(maxMarksVal)) {
          errorCount++;
          continue;
        }
        try {
          if (!actor) throw new Error("Not authenticated");
          const token = session?.token ?? "";
          await actor.addMark(token, BigInt(studentId), subject, examType, marksVal, maxMarksVal);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} mark${successCount > 1 ? "s" : ""} uploaded successfully`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} row${errorCount > 1 ? "s" : ""} failed to import`);
      }
      setCsvFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      toast.error("Failed to parse CSV file");
    } finally {
      setCsvUploading(false);
    }
  };

  // Group marks by student for display
  const marksByStudent = marks.reduce<Record<string, Mark[]>>((acc, mark) => {
    const key = mark.studentId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(mark);
    return acc;
  }, {});

  const studentMap = new Map(students.map((s) => [s.id.toString(), s]));

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marks Entry</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Add or upload student marks for tracking performance
        </p>
      </div>

      <Tabs defaultValue="manual">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="csv">CSV Upload</TabsTrigger>
        </TabsList>

        {/* Manual Entry */}
        <TabsContent value="manual" className="mt-4">
          <Card className="shadow-card max-w-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Add Marks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Student <span className="text-destructive">*</span></Label>
                <Select value={form.studentId} onValueChange={(v) => setForm((p) => ({ ...p, studentId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : students.map((s) => (
                      <SelectItem key={s.id.toString()} value={s.id.toString()}>
                        {s.name} — {s.rollNumber} ({s.className}-{s.section})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Subject <span className="text-destructive">*</span></Label>
                  <Select value={form.subject} onValueChange={(v) => setForm((p) => ({ ...p, subject: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Exam Type <span className="text-destructive">*</span></Label>
                  <Select value={form.examType} onValueChange={(v) => setForm((p) => ({ ...p, examType: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="marks">Marks Obtained <span className="text-destructive">*</span></Label>
                  <Input
                    id="marks"
                    type="number"
                    placeholder="e.g. 78"
                    min="0"
                    value={form.marks}
                    onChange={(e) => setForm((p) => ({ ...p, marks: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxMarks">Maximum Marks <span className="text-destructive">*</span></Label>
                  <Input
                    id="maxMarks"
                    type="number"
                    placeholder="e.g. 100"
                    min="1"
                    value={form.maxMarks}
                    onChange={(e) => setForm((p) => ({ ...p, maxMarks: e.target.value }))}
                  />
                </div>
              </div>

              {form.marks && form.maxMarks && !isNaN(parseFloat(form.marks)) && !isNaN(parseFloat(form.maxMarks)) && parseFloat(form.maxMarks) > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "oklch(0.94 0.02 240)" }}>
                  <span className="text-sm text-muted-foreground">Percentage:</span>
                  <span className="font-bold text-sm" style={{ color: getPercentageColor(Math.round((parseFloat(form.marks) / parseFloat(form.maxMarks)) * 100)) }}>
                    {Math.round((parseFloat(form.marks) / parseFloat(form.maxMarks)) * 100)}%
                  </span>
                </div>
              )}

              <Button onClick={handleManualSubmit} disabled={addMark.isPending} className="w-full">
                {addMark.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Add Marks
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSV Upload */}
        <TabsContent value="csv" className="mt-4">
          <Card className="shadow-card max-w-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Bulk CSV Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl p-4 border border-dashed" style={{ borderColor: "oklch(0.475 0.175 255 / 0.3)", background: "oklch(0.475 0.175 255 / 0.04)" }}>
                <p className="text-sm font-semibold text-foreground mb-2">CSV Format</p>
                <p className="text-xs text-muted-foreground mb-2">
                  The CSV file should have the following columns (header row is optional):
                </p>
                <div className="font-mono text-xs bg-card border border-border rounded-lg p-3">
                  <p className="text-muted-foreground mb-1">studentId,subject,examType,marks,maxMarks</p>
                  <p>1001,Mathematics,Unit Test,78,100</p>
                  <p>1001,Science,Half Yearly,65,100</p>
                  <p>1002,English,Final,88,100</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Subjects:</strong> {SUBJECTS.join(", ")}<br />
                  <strong>Exam Types:</strong> {EXAM_TYPES.join(", ")}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="csvFile">Select CSV File</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  ref={fileRef}
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer"
                />
              </div>

              {csvFile && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "oklch(0.94 0.02 240)" }}>
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{csvFile.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(csvFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}

              <Button onClick={handleCsvUpload} disabled={csvUploading || !csvFile} className="w-full">
                {csvUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Upload className="mr-2 h-4 w-4" />
                {csvUploading ? "Uploading..." : "Upload CSV"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Existing Marks Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">All Marks Records</CardTitle>
          <Badge variant="secondary">{marks.length} records</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {marksLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : marks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <ClipboardList className="w-8 h-8 opacity-30" />
              <p className="text-sm">No marks recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Exam Type</TableHead>
                    <TableHead className="text-right">Marks</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marks.slice().sort((a, b) => Number(a.studentId) - Number(b.studentId)).map((mark) => {
                    const student = studentMap.get(mark.studentId.toString());
                    const pct = Math.round((mark.marks / mark.maxMarks) * 100);
                    return (
                      <TableRow key={mark.id.toString()}>
                        <TableCell className="font-medium">
                          {student ? `${student.name}` : `ID: ${mark.studentId}`}
                          {student && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({student.rollNumber})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{mark.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{mark.examType}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{mark.marks}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{mark.maxMarks}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-sm" style={{ color: getPercentageColor(pct) }}>
                            {pct}%
                          </span>
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
  );
}
