/**
 * dbService.ts — клиентский сервис для работы с API.
 *
 * ABAP-аналогия: набор FUNCTION MODULE с RFC-интерфейсом,
 * которые вызываются из отчётов и транзакций.
 *
 * ИЗМЕНЕНИЕ БЕЗОПАСНОСТИ: теперь все запросы отправляют
 * Clerk JWT-токен в заголовке Authorization.
 * Бэкенд проверяет этот токен перед любой операцией.
 */

import { LessonStatus } from '../../types';
import type { Lesson, Teacher, School, AppUser } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

// ── ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ───────────────────────────────────────────────────

/**
 * Получает Clerk JWT-токен из глобального объекта window.
 * Токен устанавливается хуком useTokenSync (см. ниже).
 *
 * ABAP-аналогия: чтение SY-UNAME + токена из контекста сессии.
 */
let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = _getToken ? await _getToken() : null;
  if (!token) {
    throw new Error('Not authenticated: no token available');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function authGetHeaders(): Promise<HeadersInit> {
  const token = _getToken ? await _getToken() : null;
  if (!token) {
    throw new Error('Not authenticated: no token available');
  }
  return {
    'Authorization': `Bearer ${token}`,
  };
}

// ── TEACHERS ──────────────────────────────────────────────────────────────────

function rowToTeacher(row: Record<string, unknown>): Teacher {
  return {
    id: String(row.id ?? ''),
    firstName: String(row.firstName ?? row.first_name ?? ''),
    lastName: String(row.lastName ?? row.last_name ?? ''),
    color: String(row.color ?? '#6366f1'),
  };
}

export async function fetchTeachers(): Promise<Teacher[]> {
  const res = await fetch(`${API_BASE}/api/teachers`, {
    headers: await authGetHeaders(),
  });
  if (!res.ok) throw new Error(`fetchTeachers failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const rows = Array.isArray(data) ? data : (data.teachers ?? data.rows ?? []);
  return rows.map((row: Record<string, unknown>) => rowToTeacher(row));
}

export async function addTeacher(teacher: Teacher): Promise<Teacher> {
  const res = await fetch(`${API_BASE}/api/teachers`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(teacher),
  });
  if (!res.ok) throw new Error(`addTeacher failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return rowToTeacher(data.teacher ?? data);
}

export async function updateTeacher(teacher: Teacher): Promise<Teacher> {
  const res = await fetch(`${API_BASE}/api/teachers/${encodeURIComponent(teacher.id)}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(teacher),
  });
  if (!res.ok) throw new Error(`updateTeacher failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return rowToTeacher(data.teacher ?? data);
}

export async function deleteTeacher(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/teachers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authGetHeaders(),
  });
  if (!res.ok) throw new Error(`deleteTeacher failed: ${res.status} ${await res.text()}`);
}

// ── SCHOOLS ───────────────────────────────────────────────────────────────────

function rowToSchool(row: Record<string, unknown>): School {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    address: String(row.address ?? ''),
    sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : (typeof row.sort_order === 'number' ? row.sort_order : 0),
  };
}

export async function fetchSchools(): Promise<School[]> {
  const res = await fetch(`${API_BASE}/api/schools`, {
    headers: await authGetHeaders(),
  });
  if (!res.ok) throw new Error(`fetchSchools failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const rows = Array.isArray(data) ? data : (data.schools ?? data.rows ?? []);
  return rows.map((row: Record<string, unknown>) => rowToSchool(row));
}

export async function addSchool(school: School): Promise<School> {
  const res = await fetch(`${API_BASE}/api/schools`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(school),
  });
  if (!res.ok) throw new Error(`addSchool failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return rowToSchool(data.school ?? data);
}

export async function updateSchool(school: School): Promise<School> {
  const res = await fetch(`${API_BASE}/api/schools/${encodeURIComponent(school.id)}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(school),
  });
  if (!res.ok) throw new Error(`updateSchool failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return rowToSchool(data.school ?? data);
}

export async function deleteSchool(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/schools/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authGetHeaders(),
  });
  if (!res.ok) throw new Error(`deleteSchool failed: ${res.status} ${await res.text()}`);
}

// ── LESSONS ───────────────────────────────────────────────────────────────────

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
    correctedDuration:
      row.correctedDuration != null ? Number(row.correctedDuration)
        : row.corrected_duration != null ? Number(row.corrected_duration)
          : undefined,
  };
}

export async function fetchLessons(): Promise<Lesson[]> {
  const res = await fetch(`${API_BASE}/api/lessons`, {
    headers: await authGetHeaders(),
  });
  if (!res.ok) throw new Error(`fetchLessons failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const rows = Array.isArray(data) ? data : (data.lessons ?? data.rows ?? []);
  return rows.map((row: Record<string, unknown>) => rowToLesson(row));
}

export async function addLesson(lesson: Lesson): Promise<Lesson> {
  const res = await fetch(`${API_BASE}/api/lessons`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(lesson),
  });
  if (!res.ok) throw new Error(`addLesson failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return rowToLesson(data.lesson ?? data);
}

export async function updateLesson(lesson: Lesson): Promise<Lesson> {
  const res = await fetch(`${API_BASE}/api/lessons/${encodeURIComponent(lesson.id)}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(lesson),
  });
  if (!res.ok) throw new Error(`updateLesson failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return rowToLesson(data.lesson ?? data);
}

export async function deleteLesson(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/lessons/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authGetHeaders(),
  });
  if (!res.ok) throw new Error(`deleteLesson failed: ${res.status} ${await res.text()}`);
}

// ── USERS ─────────────────────────────────────────────────────────────────────

function rowToAppUser(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id ?? ''),
    email: String(row.email ?? ''),
    role: String(row.role ?? 'viewer') as AppUser['role'],
    teacherId: row.teacher_id ? String(row.teacher_id) : undefined,
    teacherName: row.teacher_first_name && row.teacher_last_name
      ? `${row.teacher_first_name} ${row.teacher_last_name}`
      : undefined,
  };
}

export async function fetchUsers(): Promise<AppUser[]> {
  const res = await fetch(`${API_BASE}/api/users`, {
    headers: await authGetHeaders(),
  });
  if (!res.ok) throw new Error(`fetchUsers failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const rows = Array.isArray(data) ? data : (data.users ?? data.rows ?? []);
  return rows.map((row: Record<string, unknown>) => rowToAppUser(row));
}

/**
 * Проверяет роль текущего пользователя через СЕРВЕРНЫЙ endpoint /api/users?me=true
 *
 * ABAP-аналогия: CALL FUNCTION 'SUSR_USER_AUTH_FOR_OBJ_GET'
 * — не читает всю таблицу пользователей, а только данные текущего юзера.
 *
 * В отличие от старого подхода (fetchUsers + поиск на клиенте),
 * этот метод безопасен: данные других пользователей не передаются на фронт.
 */
export async function checkUserRole(email: string): Promise<{
  isAdmin: boolean;
  role: string;
  teacherId?: string;
  userId?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/users?me=true`, {
      headers: await authGetHeaders(),
    });

    if (res.status === 403) {
      return { isAdmin: false, role: 'unauthorized' };
    }
    if (!res.ok) {
      return { isAdmin: false, role: 'viewer' };
    }

    const data = await res.json();
    return {
      isAdmin: data.isAdmin,
      role: data.role,
      teacherId: data.teacherId,
    };
  } catch (error) {
    console.error('Error checking user role:', error);
    return { isAdmin: false, role: 'viewer' };
  }
}

export async function addUser(user: AppUser): Promise<AppUser> {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error(`addUser failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return rowToAppUser(data.user ?? data);
}

export async function updateUser(user: AppUser): Promise<AppUser> {
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(user.id)}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ ...user, teacherId: user.teacherId ?? null }),
  });
  if (!res.ok) throw new Error(`updateUser failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return rowToAppUser(data.user ?? data);
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authGetHeaders(),
  });
  if (!res.ok) throw new Error(`deleteUser failed: ${res.status} ${await res.text()}`);
}
