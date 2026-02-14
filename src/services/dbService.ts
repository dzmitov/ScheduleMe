import { LessonStatus } from '../../types';
import type { Lesson, Teacher, School, AppUser } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

// --- Teachers ---
function rowToTeacher(row: Record<string, unknown>): Teacher {
  return {
    id: String(row.id ?? ''),
    firstName: String(row.firstName ?? row.first_name ?? ''),
    lastName: String(row.lastName ?? row.last_name ?? ''),
    color: String(row.color ?? '#6366f1'),
  };
}

export async function fetchTeachers(): Promise<Teacher[]> {
  const res = await fetch(`${API_BASE}/api/teachers`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fetchTeachers failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const rows = Array.isArray(data) ? data : (data.teachers ?? data.rows ?? []);
  return rows.map((row: Record<string, unknown>) => rowToTeacher(row));
}

export async function addTeacher(teacher: Teacher): Promise<Teacher> {
  const res = await fetch(`${API_BASE}/api/teachers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teacher),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`addTeacher failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return rowToTeacher(data.teacher ?? data);
}

export async function updateTeacher(teacher: Teacher): Promise<Teacher> {
  const res = await fetch(`${API_BASE}/api/teachers/${encodeURIComponent(teacher.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teacher),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateTeacher failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return rowToTeacher(data.teacher ?? data);
}

export async function deleteTeacher(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteTeacher failed: ${res.status} ${text}`);
  }
}

// --- Schools ---
function rowToSchool(row: Record<string, unknown>): School {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
  };
}

export async function fetchSchools(): Promise<School[]> {
  const res = await fetch(`${API_BASE}/api/schools`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fetchSchools failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const rows = Array.isArray(data) ? data : (data.schools ?? data.rows ?? []);
  return rows.map((row: Record<string, unknown>) => rowToSchool(row));
}

export async function addSchool(school: School): Promise<School> {
  const res = await fetch(`${API_BASE}/api/schools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(school),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`addSchool failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return rowToSchool(data.school ?? data);
}

export async function updateSchool(school: School): Promise<School> {
  const res = await fetch(`${API_BASE}/api/schools/${encodeURIComponent(school.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(school),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateSchool failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return rowToSchool(data.school ?? data);
}

export async function deleteSchool(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/schools/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteSchool failed: ${res.status} ${text}`);
  }
}

// --- Lessons ---

function rowToLesson(row: Record<string, unknown>): Lesson {
  return {
    id: String(row.id ?? ''),
    subject: String(row.subject ?? ''),
    grade: String(row.grade ?? ''),
    teacherId: String(row.teacherId ?? row.teacher_id ?? ''),
    schoolId: String(row.schoolId ?? row.school_id ?? ''),
    date: String(row.date ?? ''),
    startTime: String(row.startTime ?? row.start_time ?? ''),
    endTime: String(row.endTime ?? row.end_time ?? ''),
    room: String(row.room ?? ''),
  status: (row.status as LessonStatus) ?? LessonStatus.UPCOMING,
    topic: row.topic != null ? String(row.topic) : undefined,
    notes: row.notes != null ? String(row.notes) : undefined,
  };
}

/**
 * Загружает все уроки из таблицы lessons в Vercel Postgres.
 */
export async function fetchLessons(): Promise<Lesson[]> {
  const res = await fetch(`${API_BASE}/api/lessons`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fetchLessons failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const rows = Array.isArray(data) ? data : (data.lessons ?? data.rows ?? []);
  return rows.map((row: Record<string, unknown>) => rowToLesson(row));
}

/**
 * Добавляет новый урок в таблицу lessons.
 */
export async function addLesson(lesson: Lesson): Promise<Lesson> {
  const res = await fetch(`${API_BASE}/api/lessons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lesson),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`addLesson failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return rowToLesson(data.lesson ?? data);
}

/**
 * Обновляет урок в таблице lessons.
 */
export async function updateLesson(lesson: Lesson): Promise<Lesson> {
  const res = await fetch(`${API_BASE}/api/lessons/${encodeURIComponent(lesson.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lesson),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateLesson failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return rowToLesson(data.lesson ?? data);
}

/**
 * Удаляет урок по id.
 */
export async function deleteLesson(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/lessons/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteLesson failed: ${res.status} ${text}`);
  }
}

// --- Users ---

function rowToAppUser(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id ?? ''),
    email: String(row.email ?? ''),
    role: String(row.role ?? 'viewer') as AppUser['role'],
    teacherId: row.teacher_id ? String(row.teacher_id) : undefined,
    teacherName: row.teacher_first_name && row.teacher_last_name 
      ? `${row.teacher_first_name} ${row.teacher_last_name}` 
      : undefined
  };
}

/**
 * Загружает всех пользователей из таблицы app_users.
 */
export async function fetchUsers(): Promise<AppUser[]> {
  const res = await fetch(`${API_BASE}/api/users`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fetchUsers failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const rows = Array.isArray(data) ? data : (data.users ?? data.rows ?? []);
  return rows.map((row: Record<string, unknown>) => rowToAppUser(row));
}

/**
 * Проверяет роль пользователя по email.
 * Возвращает объект с информацией о правах пользователя.
 */
export async function checkUserRole(email: string): Promise<{
  isAdmin: boolean;
  role: string;
  teacherId?: string;
  userId?: string;
}> {
  try {
    // Fallback for default admin
    if (email === 'dzmitov@gmail.com') {
      return { isAdmin: true, role: 'admin' };
    }

    const users = await fetchUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { isAdmin: false, role: 'viewer' };
    }
    
    return {
      isAdmin: user.role === 'admin',
      role: user.role,
      teacherId: user.teacherId,
      userId: user.id
    };
  } catch (error) {
    console.error('Error checking user role:', error);
    // Fallback for default admin if database check fails
    if (email === 'dzmitov@gmail.com') {
      return { isAdmin: true, role: 'admin' };
    }
    return { isAdmin: false, role: 'viewer' };
  }
}

/**
 * Добавляет нового пользователя в таблицу app_users.
 */
export async function addUser(user: AppUser): Promise<AppUser> {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`addUser failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return rowToAppUser(data.user ?? data);
}

/**
 * Обновляет пользователя в таблице app_users.
 */
export async function updateUser(user: AppUser): Promise<AppUser> {
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(user.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateUser failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return rowToAppUser(data.user ?? data);
}

/**
 * Удаляет пользователя по id.
 */
export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteUser failed: ${res.status} ${text}`);
  }
}