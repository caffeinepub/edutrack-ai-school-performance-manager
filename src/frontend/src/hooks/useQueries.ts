import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminStats,
  Feedback,
  Mark,
  Student,
  StudentAnalysis,
  UserProfile,
} from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { useActor } from "./useActor";

// ---- Students ----

export function useAllStudents() {
  const { actor, isFetching: actorFetching } = useActor();
  const { session } = useAuth();
  const token = session?.token ?? "";
  return useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllStudents(token);
    },
    enabled: !!actor && !actorFetching && !!token,
  });
}

export function useCreateStudent() {
  const { actor } = useActor();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      rollNumber: string;
      className: string;
      section: string;
      parentPhone: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const token = session?.token ?? "";
      return actor.createStudent(
        token,
        params.name,
        params.rollNumber,
        params.className,
        params.section,
        params.parentPhone,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
  });
}

export function useUpdateStudent() {
  const { actor } = useActor();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      name: string;
      rollNumber: string;
      className: string;
      section: string;
      parentPhone: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const token = session?.token ?? "";
      return actor.updateStudent(
        token,
        params.id,
        params.name,
        params.rollNumber,
        params.className,
        params.section,
        params.parentPhone,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useDeleteStudent() {
  const { actor } = useActor();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      const token = session?.token ?? "";
      return actor.deleteStudent(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
  });
}

// ---- Marks ----

export function useAllMarks() {
  const { actor, isFetching: actorFetching } = useActor();
  const { session } = useAuth();
  const token = session?.token ?? "";
  return useQuery<Mark[]>({
    queryKey: ["marks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMarks(token);
    },
    enabled: !!actor && !actorFetching && !!token,
  });
}

export function useMarksByStudent(studentId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { session } = useAuth();
  const token = session?.token ?? "";
  return useQuery<Mark[]>({
    queryKey: ["marks", studentId?.toString()],
    queryFn: async () => {
      if (!actor || !studentId) return [];
      return actor.getMarksByStudent(token, studentId);
    },
    enabled: !!actor && !actorFetching && !!studentId && !!token,
  });
}

export function useAddMark() {
  const { actor } = useActor();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      studentId: bigint;
      subject: string;
      examType: string;
      marks: number;
      maxMarks: number;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const token = session?.token ?? "";
      return actor.addMark(
        token,
        params.studentId,
        params.subject,
        params.examType,
        params.marks,
        params.maxMarks,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marks"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
  });
}

// ---- Feedback ----

export function useAllFeedback() {
  const { actor, isFetching: actorFetching } = useActor();
  const { session } = useAuth();
  const token = session?.token ?? "";
  return useQuery<Feedback[]>({
    queryKey: ["feedback"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllFeedback(token);
    },
    enabled: !!actor && !actorFetching && !!token,
  });
}

export function useFeedbackByStudent(studentId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { session } = useAuth();
  const token = session?.token ?? "";
  return useQuery<Feedback[]>({
    queryKey: ["feedback", studentId?.toString()],
    queryFn: async () => {
      if (!actor || !studentId) return [];
      return actor.getFeedbackByStudent(token, studentId);
    },
    enabled: !!actor && !actorFetching && !!studentId && !!token,
  });
}

export function useAddFeedback() {
  const { actor } = useActor();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      studentId: bigint;
      subject: string;
      conceptClarity: bigint;
      homeworkCompletion: boolean;
      participation: bigint;
      behaviour: bigint;
      remarks: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const token = session?.token ?? "";
      return actor.addFeedback(
        token,
        params.studentId,
        params.subject,
        params.conceptClarity,
        params.homeworkCompletion,
        params.participation,
        params.behaviour,
        params.remarks,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });
}

// ---- Admin Stats ----

export function useAdminStats() {
  const { actor, isFetching: actorFetching } = useActor();
  const { session } = useAuth();
  const token = session?.token ?? "";
  return useQuery<AdminStats>({
    queryKey: ["adminStats"],
    queryFn: async () => {
      if (!actor)
        return { weakCount: 0n, totalStudents: 0n, highRiskCount: 0n };
      return actor.getAdminStats(token);
    },
    enabled: !!actor && !actorFetching && !!token,
  });
}

// ---- AI Analysis ----

export function useStudentAnalysis(studentId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { session } = useAuth();
  const token = session?.token ?? "";
  return useQuery<StudentAnalysis>({
    queryKey: ["analysis", studentId?.toString()],
    queryFn: async () => {
      if (!actor || !studentId) throw new Error("No student");
      return actor.getStudentAnalysis(token, studentId);
    },
    enabled: !!actor && !actorFetching && !!studentId && !!token,
  });
}

export function useGeneratePlan() {
  const { actor } = useActor();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (studentId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      const token = session?.token ?? "";
      return actor.generateImprovementPlan(token, studentId);
    },
  });
}

export function useStudent(studentId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { session } = useAuth();
  const token = session?.token ?? "";
  return useQuery<Student | null>({
    queryKey: ["student", studentId?.toString()],
    queryFn: async () => {
      if (!actor || !studentId) return null;
      return actor.getStudent(token, studentId);
    },
    enabled: !!actor && !actorFetching && !!studentId && !!token,
  });
}

// ---- Legacy profile hooks (kept for compatibility) ----

export function useCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useIsAdmin() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
  });
}
