
export enum LessonStatus {
  UPCOMING = 'upcoming',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export type Role = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar?: string;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  color: string;
}

export interface School {
  id: string;
  name: string;
}

export interface Lesson {
  id: string;
  subject: string;
  grade: string;
  teacherId: string;
  schoolId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  room: string;
  status: LessonStatus;
  topic?: string;
  notes?: string;
}

export interface LessonPlan {
  title: string;
  objectives: string[];
  materials: string[];
  activities: { time: string; description: string }[];
}

// Added missing GitHubConfig interface to fix compilation error in services/githubService.ts
export interface GitHubConfig {
  token: string;
  repo: string;
  path: string;
}

export type ViewType = 'dashboard' | 'schedule' | 'history' | 'ai-planner' | 'reports' | 'admin-manage' | 'settings';
