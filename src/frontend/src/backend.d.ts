import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface StudentAnalysis {
    isHighRisk: boolean;
    overallAverage: number;
    isWeak: boolean;
    weakSubjects: Array<string>;
}
export type Time = bigint;
export interface AiPlan {
    id: bigint;
    status: string;
    basedOnExamType: string;
    studentId: bigint;
    aiPlanText: string;
    improvementTargetPercentage: number;
    planVersion: bigint;
    basedOnAverage: number;
    generatedDate: Time;
    performanceSnapshot: string;
}
export interface AdminStats {
    weakCount: bigint;
    totalStudents: bigint;
    highRiskCount: bigint;
}
export interface Feedback {
    id: bigint;
    studentId: bigint;
    subject: string;
    behaviour: bigint;
    participation: bigint;
    homeworkCompletion: boolean;
    conceptClarity: bigint;
    remarks: string;
}
export interface Mark {
    id: bigint;
    marks: number;
    studentId: bigint;
    subject: string;
    maxMarks: number;
    examType: string;
}
export interface UserProfile {
    name: string;
}
export interface Student {
    id: bigint;
    name: string;
    parentPhone: string;
    section: string;
    rollNumber: string;
    className: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addFeedback(sessionToken: string, studentId: bigint, subject: string, conceptClarity: bigint, homeworkCompletion: boolean, participation: bigint, behaviour: bigint, remarks: string): Promise<bigint>;
    addMark(sessionToken: string, studentId: bigint, subject: string, examType: string, marksValue: number, maxMarks: number): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    changePassword(sessionToken: string, oldPassword: string, newPassword: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createStudent(sessionToken: string, name: string, rollNumber: string, className: string, section: string, parentPhone: string): Promise<bigint>;
    createTeacherAccount(sessionToken: string, username: string, password: string, name: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteStudent(sessionToken: string, id: bigint): Promise<boolean>;
    deleteTeacherAccount(sessionToken: string, username: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    generateAndSaveAiPlan(sessionToken: string, studentId: bigint, forceRegenerate: boolean): Promise<{
        __kind__: "ok";
        ok: AiPlan;
    } | {
        __kind__: "err";
        err: string;
    }>;
    generateImprovementPlan(sessionToken: string, studentId: bigint): Promise<string>;
    getAdminStats(sessionToken: string): Promise<AdminStats>;
    getAiPlansByStudent(sessionToken: string, studentId: bigint): Promise<Array<AiPlan>>;
    getAllFeedback(sessionToken: string): Promise<Array<Feedback>>;
    getAllMarks(sessionToken: string): Promise<Array<Mark>>;
    getAllStudents(sessionToken: string): Promise<Array<Student>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrentUserInfo(sessionToken: string): Promise<{
        __kind__: "ok";
        ok: {
            username: string;
            name: string;
            role: string;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    getFeedbackByStudent(sessionToken: string, studentId: bigint): Promise<Array<Feedback>>;
    getLatestAiPlan(sessionToken: string, studentId: bigint): Promise<AiPlan | null>;
    getMarksByStudent(sessionToken: string, studentId: bigint): Promise<Array<Mark>>;
    getStudent(sessionToken: string, id: bigint): Promise<Student | null>;
    getStudentAnalysis(sessionToken: string, studentId: bigint): Promise<StudentAnalysis>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeApp(): Promise<string>;
    isCallerAdmin(): Promise<boolean>;
    listTeacherAccounts(sessionToken: string): Promise<{
        __kind__: "ok";
        ok: Array<{
            username: string;
            name: string;
            role: string;
        }>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    login(username: string, password: string): Promise<{
        __kind__: "ok";
        ok: {
            token: string;
            name: string;
            role: string;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    logout(token: string): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateAiPlanStatus(sessionToken: string, planId: bigint, status: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateStudent(sessionToken: string, id: bigint, name: string, rollNumber: string, className: string, section: string, parentPhone: string): Promise<boolean>;
    validateSession(token: string): Promise<{
        username: string;
        name: string;
        createdAt: Time;
        role: string;
    } | null>;
}
