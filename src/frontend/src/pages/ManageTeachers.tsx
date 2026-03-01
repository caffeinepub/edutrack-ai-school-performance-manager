import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

interface TeacherAccount {
  username: string;
  name: string;
  role: string;
}

interface AddTeacherForm {
  name: string;
  username: string;
  password: string;
  confirmPassword: string;
}

const emptyForm: AddTeacherForm = {
  name: "",
  username: "",
  password: "",
  confirmPassword: "",
};

function useTeacherAccounts(token: string) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<TeacherAccount[]>({
    queryKey: ["teacherAccounts"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listTeacherAccounts(token);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    enabled: !!actor && !actorFetching && !!token,
  });
}

function useCreateTeacher(token: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      username: string;
      password: string;
      name: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.createTeacherAccount(
        token,
        params.username,
        params.password,
        params.name,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherAccounts"] });
    },
  });
}

function useDeleteTeacher(token: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.deleteTeacherAccount(token, username);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherAccounts"] });
    },
  });
}

export default function ManageTeachers() {
  const { session } = useAuth();
  const token = session?.token ?? "";

  const { data: teachers = [], isLoading } = useTeacherAccounts(token);
  const createMutation = useCreateTeacher(token);
  const deleteMutation = useDeleteTeacher(token);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<AddTeacherForm>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openAddDialog = () => {
    setForm(emptyForm);
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAddDialogOpen(true);
  };

  const handleAddTeacher = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setFormError("All fields are required");
      return;
    }
    if (form.password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
      });
      toast.success(`Teacher account created for ${form.name}`);
      setAddDialogOpen(false);
      setForm(emptyForm);
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Failed to create teacher account",
      );
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success("Teacher account deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
    }
  };

  const teacherToDelete = teachers.find((t) => t.username === deleteTarget);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary" />
            Manage Teachers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage teacher accounts with access to the system
          </p>
        </div>
        <Button onClick={openAddDialog} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Teacher
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stat-card shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Total Teachers
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-12 mt-1" />
              ) : (
                <p className="text-3xl font-extrabold text-foreground">
                  {teachers.filter((t) => t.role !== "admin").length}
                </p>
              )}
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.475 0.175 255 / 0.12)" }}
            >
              <Users
                className="w-5 h-5"
                style={{ color: "oklch(0.475 0.175 255)" }}
              />
            </div>
          </div>
        </div>
        <div className="stat-card shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Admin Accounts
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-12 mt-1" />
              ) : (
                <p className="text-3xl font-extrabold text-foreground">
                  {teachers.filter((t) => t.role === "admin").length}
                </p>
              )}
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.55 0.18 145 / 0.12)" }}
            >
              <ShieldCheck
                className="w-5 h-5"
                style={{ color: "oklch(0.45 0.18 145)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UserCog className="w-4 h-4 text-primary" />
            Teacher Accounts
          </CardTitle>
          {!isLoading && (
            <Badge variant="secondary">{teachers.length} accounts</Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "oklch(0.94 0.02 240)" }}
              >
                <Users className="w-6 h-6 opacity-40" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">No teacher accounts yet</p>
                <p className="text-xs mt-0.5">
                  Click "Add Teacher" to create the first teacher account
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.username}>
                      <TableCell className="font-medium">
                        {teacher.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {teacher.username}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-medium capitalize"
                          style={
                            teacher.role === "admin"
                              ? {
                                  background: "oklch(0.93 0.07 145 / 0.3)",
                                  color: "oklch(0.35 0.15 145)",
                                  borderColor: "oklch(0.7 0.1 145 / 0.4)",
                                }
                              : {
                                  background: "oklch(0.94 0.03 240)",
                                  color: "oklch(0.4 0.1 255)",
                                  borderColor: "oklch(0.8 0.06 240)",
                                }
                          }
                        >
                          {teacher.role === "admin"
                            ? "Administrator"
                            : "Teacher"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {teacher.role !== "admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(teacher.username)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {teacher.role === "admin" && (
                          <span className="text-xs text-muted-foreground pr-2">
                            Protected
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Teacher Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              Add Teacher Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="teacher-name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="teacher-name"
                placeholder="e.g. Priya Sharma"
                value={form.name}
                onChange={(e) => {
                  setForm((p) => ({ ...p, name: e.target.value }));
                  setFormError(null);
                }}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacher-username">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="teacher-username"
                placeholder="e.g. teacher2"
                value={form.username}
                onChange={(e) => {
                  setForm((p) => ({ ...p, username: e.target.value }));
                  setFormError(null);
                }}
                disabled={createMutation.isPending}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacher-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="teacher-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, password: e.target.value }));
                    setFormError(null);
                  }}
                  className="pr-10"
                  disabled={createMutation.isPending}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacher-confirm">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="teacher-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, confirmPassword: e.target.value }));
                    setFormError(null);
                  }}
                  className="pr-10"
                  disabled={createMutation.isPending}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {formError && (
              <div
                className="p-3 rounded-lg text-sm font-medium"
                style={{
                  background: "oklch(0.97 0.02 25)",
                  color: "oklch(0.45 0.2 25)",
                  border: "1px solid oklch(0.85 0.08 25)",
                }}
              >
                {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTeacher}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for{" "}
              <strong>{teacherToDelete?.name}</strong> (username:{" "}
              <code className="font-mono text-xs">{deleteTarget}</code>). This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeacher}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
