import type { Lesson } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

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
    status: (row.status as Lesson['status']) ?? 'upcoming',
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
