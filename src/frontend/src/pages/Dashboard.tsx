import { useEffect, useRef, useState, useMemo } from "react";
import { useAdminStats, useAllStudents, useAllMarks } from "../hooks/useQueries";
import { useAppContext } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Users, TrendingDown, AlertTriangle, BookOpen, Filter, ChevronRight } from "lucide-react";
import type { Mark, Student } from "../backend.d";

declare const Chart: any;

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="stat-card shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-3xl font-extrabold text-foreground">{value}</p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + "20" }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function computeSubjectAverages(marks: Mark[]): { labels: string[]; data: number[] } {
  const subjects = ["Mathematics", "Science", "English", "Social Science", "Hindi", "Computer"];
  const totals: Record<string, { sum: number; max: number; count: number }> = {};
  for (const subject of subjects) {
    totals[subject] = { sum: 0, max: 0, count: 0 };
  }
  for (const mark of marks) {
    if (totals[mark.subject]) {
      totals[mark.subject].sum += mark.marks;
      totals[mark.subject].max += mark.maxMarks;
      totals[mark.subject].count += 1;
    }
  }
  const labels: string[] = [];
  const data: number[] = [];
  for (const subject of subjects) {
    const t = totals[subject];
    if (t.count > 0) {
      labels.push(subject.replace(" Science", " Sci.").replace("Social", "Soc.").replace("Mathematics", "Math"));
      data.push(Math.round((t.sum / t.max) * 100));
    }
  }
  return { labels, data };
}

function computeHighRiskStudents(students: Student[], marks: Mark[]) {
  const studentMarks: Record<string, { sum: number; max: number }> = {};
  for (const mark of marks) {
    const id = mark.studentId.toString();
    if (!studentMarks[id]) studentMarks[id] = { sum: 0, max: 0 };
    studentMarks[id].sum += mark.marks;
    studentMarks[id].max += mark.maxMarks;
  }
  return students
    .map((s) => {
      const sm = studentMarks[s.id.toString()];
      const avg = sm ? Math.round((sm.sum / sm.max) * 100) : null;
      return { ...s, avg };
    })
    .filter((s) => s.avg !== null && s.avg < 40)
    .sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0));
}

function computeWeakStudents(students: Student[], marks: Mark[]) {
  const studentMarks: Record<string, { sum: number; max: number }> = {};
  for (const mark of marks) {
    const id = mark.studentId.toString();
    if (!studentMarks[id]) studentMarks[id] = { sum: 0, max: 0 };
    studentMarks[id].sum += mark.marks;
    studentMarks[id].max += mark.maxMarks;
  }
  return students.filter((s) => {
    const sm = studentMarks[s.id.toString()];
    if (!sm) return false;
    const avg = Math.round((sm.sum / sm.max) * 100);
    return avg < 60;
  });
}

function getRiskColor(riskPct: number): { bg: string; text: string; border: string } {
  if (riskPct < 20) {
    return {
      bg: "oklch(0.93 0.07 145 / 0.25)",
      text: "oklch(0.35 0.16 145)",
      border: "oklch(0.7 0.1 145 / 0.35)",
    };
  } else if (riskPct <= 50) {
    return {
      bg: "oklch(0.95 0.08 65 / 0.3)",
      text: "oklch(0.48 0.17 65)",
      border: "oklch(0.75 0.12 65 / 0.4)",
    };
  } else {
    return {
      bg: "oklch(0.97 0.05 25 / 0.35)",
      text: "oklch(0.5 0.22 25)",
      border: "oklch(0.78 0.1 25 / 0.4)",
    };
  }
}

interface ClassBreakdownRow {
  className: string;
  classNum: number;
  sections: string[];
  total: number;
  weak: number;
  highRisk: number;
  riskPct: number;
}

export default function Dashboard() {
  const { isAdmin } = useAppContext();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: students = [], isLoading: studentsLoading } = useAllStudents();
  const { data: marks = [], isLoading: marksLoading } = useAllMarks();

  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const dataLoading = statsLoading || studentsLoading || marksLoading;

  // Derive unique sorted class list from students
  const availableClasses = useMemo(() => {
    const classSet = new Set(students.map((s) => s.className));
    return Array.from(classSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [students]);

  // Derive sections available for the selected class
  const availableSections = useMemo(() => {
    const base = selectedClass === "all" ? students : students.filter((s) => s.className === selectedClass);
    const sectionSet = new Set(base.map((s) => s.section));
    return Array.from(sectionSet).sort();
  }, [students, selectedClass]);

  // Reset section when class changes
  const handleClassChange = (val: string) => {
    setSelectedClass(val);
    setSelectedSection("all");
  };

  // Filtered students based on dropdowns
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const classMatch = selectedClass === "all" || s.className === selectedClass;
      const sectionMatch = selectedSection === "all" || s.section === selectedSection;
      return classMatch && sectionMatch;
    });
  }, [students, selectedClass, selectedSection]);

  // Build a Set of filtered student IDs for fast lookup
  const filteredStudentIds = useMemo(
    () => new Set(filteredStudents.map((s) => s.id.toString())),
    [filteredStudents]
  );

  // Filter marks to only those belonging to filtered students
  const filteredMarks = useMemo(
    () => marks.filter((m) => filteredStudentIds.has(m.studentId.toString())),
    [marks, filteredStudentIds]
  );

  // Computed stats from filtered data
  const filteredHighRiskStudents = useMemo(
    () => computeHighRiskStudents(filteredStudents, filteredMarks),
    [filteredStudents, filteredMarks]
  );

  const filteredWeakCount = useMemo(
    () => computeWeakStudents(filteredStudents, filteredMarks).length,
    [filteredStudents, filteredMarks]
  );

  const isFiltered = selectedClass !== "all" || selectedSection !== "all";

  // Class breakdown table data (always global, unfiltered)
  const classBreakdown = useMemo((): ClassBreakdownRow[] => {
    const rowMap: Record<string, ClassBreakdownRow> = {};
    for (const s of students) {
      if (!rowMap[s.className]) {
        const classNum = parseInt(s.className.replace(/\D/g, ""), 10);
        rowMap[s.className] = {
          className: s.className,
          classNum: isNaN(classNum) ? 999 : classNum,
          sections: [],
          total: 0,
          weak: 0,
          highRisk: 0,
          riskPct: 0,
        };
      }
      rowMap[s.className].total += 1;
      if (!rowMap[s.className].sections.includes(s.section)) {
        rowMap[s.className].sections.push(s.section);
      }
    }

    // Compute weak & high risk per class
    const studentMarks: Record<string, { sum: number; max: number }> = {};
    for (const mark of marks) {
      const id = mark.studentId.toString();
      if (!studentMarks[id]) studentMarks[id] = { sum: 0, max: 0 };
      studentMarks[id].sum += mark.marks;
      studentMarks[id].max += mark.maxMarks;
    }

    for (const s of students) {
      const sm = studentMarks[s.id.toString()];
      if (!sm) continue;
      const avg = Math.round((sm.sum / sm.max) * 100);
      if (avg < 40) rowMap[s.className].highRisk += 1;
      if (avg < 60) rowMap[s.className].weak += 1;
    }

    return Object.values(rowMap)
      .map((row) => ({
        ...row,
        sections: row.sections.sort(),
        riskPct: row.total > 0 ? Math.round((row.highRisk / row.total) * 100) : 0,
      }))
      .sort((a, b) => a.classNum - b.classNum);
  }, [students, marks]);

  // Chart: uses filtered marks
  useEffect(() => {
    if (!chartRef.current) return;
    if (typeof Chart === "undefined") return;

    const { labels, data: chartData } = computeSubjectAverages(filteredMarks);
    if (labels.length === 0) {
      chartInstance.current?.destroy();
      chartInstance.current = null;
      return;
    }

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const colors = chartData.map((v) =>
      v >= 60
        ? "oklch(0.55 0.18 145)"
        : v >= 40
          ? "oklch(0.65 0.2 65)"
          : "oklch(0.577 0.245 27)"
    );

    chartInstance.current = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Average (%)",
            data: chartData,
            backgroundColor: colors,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.parsed.y}%`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: "rgba(0,0,0,0.06)" },
            ticks: {
              callback: (v: number) => `${v}%`,
              font: { size: 11 },
            },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      chartInstance.current?.destroy();
    };
  }, [filteredMarks]);

  // Determine which stats values to show
  const displayTotal = isFiltered ? filteredStudents.length : (stats ? Number(stats.totalStudents) : 0);
  const displayWeak = isFiltered ? filteredWeakCount : (stats ? Number(stats.weakCount) : 0);
  const displayHighRisk = isFiltered ? filteredHighRiskStudents.length : (stats ? Number(stats.highRiskCount) : 0);
  const statsIsLoading = isFiltered ? (studentsLoading || marksLoading) : statsLoading;
  const hasFilteredMarksData = filteredMarks.length > 0;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isAdmin ? "Admin Dashboard" : "Teacher Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of student performance and key metrics
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
          <Filter className="w-3.5 h-3.5" />
          Filter by
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={selectedClass} onValueChange={handleClassChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {availableClasses.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedSection}
            onValueChange={setSelectedSection}
            disabled={availableSections.length === 0}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {availableSections.map((sec) => (
                <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isFiltered && (
            <button
              type="button"
              onClick={() => { setSelectedClass("all"); setSelectedSection("all"); }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>

        {isFiltered && (
          <div className="flex items-center gap-1.5 text-xs font-medium ml-auto"
            style={{ color: "oklch(0.475 0.175 255)" }}>
            <span>
              {selectedClass !== "all" && selectedSection !== "all"
                ? `${selectedClass} — Section ${selectedSection}`
                : selectedClass !== "all"
                  ? selectedClass
                  : `Section ${selectedSection}`
              }
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{filteredStudents.length} students</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Students"
          value={displayTotal}
          icon={Users}
          color="oklch(0.475 0.175 255)"
          loading={statsIsLoading}
        />
        <StatsCard
          title="Weak Students"
          value={displayWeak}
          icon={TrendingDown}
          color="oklch(0.65 0.2 65)"
          loading={statsIsLoading}
        />
        <StatsCard
          title="High Risk Students"
          value={displayHighRisk}
          icon={AlertTriangle}
          color="oklch(0.577 0.245 27)"
          loading={statsIsLoading}
        />
      </div>

      {/* Charts + High Risk Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar Chart */}
        <Card className="lg:col-span-3 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Subject-wise Averages
              {isFiltered && (
                <Badge variant="secondary" className="ml-auto text-xs font-medium">
                  Filtered
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="h-[260px] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : !hasFilteredMarksData ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <BookOpen className="w-8 h-8 opacity-30" />
                <p className="text-sm">No marks data for this selection</p>
              </div>
            ) : (
              <div className="h-[260px]">
                <canvas ref={chartRef} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* High Risk Summary */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "oklch(0.577 0.245 27)" }} />
              High Risk Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredHighRiskStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "oklch(0.93 0.07 145 / 0.4)" }}>
                  <Users className="w-5 h-5" style={{ color: "oklch(0.4 0.18 145)" }} />
                </div>
                <p className="text-sm font-medium">No high risk students!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {filteredHighRiskStudents.slice(0, 10).map((s) => (
                  <div
                    key={s.id.toString()}
                    className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{ background: "oklch(0.97 0.02 25)" }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-none">{s.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.className} — Section {s.section}</p>
                    </div>
                    <span className="badge-high-risk">{s.avg}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Students by Class Breakdown */}
      {classBreakdown.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Students by Class
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Click a row to filter dashboard
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {studentsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Sections</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Weak</TableHead>
                      <TableHead className="text-right">High Risk</TableHead>
                      <TableHead className="text-right">Risk %</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classBreakdown.map((row) => {
                      const isRowSelected = selectedClass === row.className;
                      const riskColors = getRiskColor(row.riskPct);
                      return (
                        <TableRow
                          key={row.className}
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          style={isRowSelected ? { background: "oklch(0.475 0.175 255 / 0.06)" } : {}}
                          onClick={() => {
                            if (isRowSelected) {
                              setSelectedClass("all");
                              setSelectedSection("all");
                            } else {
                              handleClassChange(row.className);
                            }
                          }}
                        >
                          <TableCell>
                            <span className="font-semibold text-foreground">{row.className}</span>
                            {isRowSelected && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-xs py-0"
                                style={{
                                  background: "oklch(0.475 0.175 255 / 0.1)",
                                  color: "oklch(0.35 0.15 255)",
                                  borderColor: "oklch(0.475 0.175 255 / 0.3)",
                                }}
                              >
                                selected
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {row.sections.map((sec) => (
                                <Badge
                                  key={sec}
                                  variant="outline"
                                  className="text-xs py-0 px-1.5 font-medium"
                                >
                                  {sec}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{row.total}</TableCell>
                          <TableCell className="text-right">
                            <span style={{ color: row.weak > 0 ? "oklch(0.48 0.17 65)" : "oklch(0.5 0.05 240)" }}>
                              {row.weak}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span style={{ color: row.highRisk > 0 ? "oklch(0.5 0.22 25)" : "oklch(0.5 0.05 240)" }}>
                              {row.highRisk}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{
                                background: riskColors.bg,
                                color: riskColors.text,
                                border: `1px solid ${riskColors.border}`,
                              }}
                            >
                              {row.riskPct}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <ChevronRight
                              className="w-3.5 h-3.5 text-muted-foreground"
                              style={{ opacity: isRowSelected ? 1 : 0.4 }}
                            />
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
      )}

      {/* Full High Risk Table */}
      {filteredHighRiskStudents.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              High Risk Students — Full List
              {isFiltered && (
                <Badge variant="secondary" className="text-xs font-medium">
                  Filtered
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right">Average %</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHighRiskStudents.map((s) => (
                  <TableRow key={s.id.toString()}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.rollNumber}</TableCell>
                    <TableCell>{s.className}</TableCell>
                    <TableCell>{s.section}</TableCell>
                    <TableCell className="text-right font-semibold" style={{ color: "oklch(0.5 0.22 25)" }}>
                      {s.avg}%
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="badge-high-risk">High Risk</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
