import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAuth, setCors } from './_auth.js';

// ... (rowToApi и normalizeLesson остаются без изменений) ...

function rowToApi(row: Record<string, unknown>) {
  return {
    id: row.id,
    subject: row.subject,
    grade: row.grade,
    teacherId: row.teacher_id,
    schoolId: row.school_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    room: row.room,
    status: row.status,
    topic: row.topic,
    notes: row.notes,
    correctedDuration: row.corrected_duration ?? null,
  };
}

function normalizeLesson(body: Record<string, unknown>) {
  const rawDuration = body.correctedDuration ?? body.corrected_duration;
  return {
    id: String(body.id ?? ''),
    subject: String(body.subject ?? ''),
    grade: String(body.grade ?? ''),
    teacherId: String(body.teacherId ?? body.teacher_id ?? ''),
    schoolId: String(body.schoolId ?? body.school_id ?? ''),
    date: String(body.date ?? ''),
    startTime: String(body.startTime ?? body.start_time ?? ''),
    endTime: String(body.endTime ?? body.end_time ?? ''),
    room: String(body.room ?? ''),
    status: String(body.status ?? 'upcoming'),
    topic: body.topic != null ? String(body.topic) : null,
    notes: body.notes != null ? String(body.notes) : null,
    correctedDuration: rawDuration != null && rawDuration !== '' ? Number(rawDuration) : null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ─────────────────────────────────────────────────────────────────────
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── AUTH ──────────────────────────────────────────────────────────────────────
  // ABAP-аналогия: AUTHORITY-CHECK в начале каждого FM/отчёта
  // GET доступен всем авторизованным пользователям (role=viewer, teacher, admin)
  // POST/PATCH/DELETE — только admin
  const auth = await requireAuth(req, res);
  if (!auth) return; // requireAuth уже отправил 401/403

  try {
    // ── GET /api/lessons ────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      await ensureTable();

      // Учитель видит только СВОИ уроки
      // ABAP-аналогия: SELECT WHERE TEACHER_ID = SY-UNAME (если не админ)
      let rows;
      if (auth.isAdmin) {
        const result = await sql`SELECT * FROM lessons ORDER BY date, start_time`;
        rows = result.rows;
      } else if (auth.teacherId) {
        const result = await sql`
          SELECT * FROM lessons 
          WHERE teacher_id = ${auth.teacherId}
          ORDER BY date, start_time
        `;
        rows = result.rows;
      } else {
        // viewer без teacherId — видит всё расписание, но не может редактировать
        const result = await sql`SELECT * FROM lessons ORDER BY date, start_time`;
        rows = result.rows;
      }

      return res.status(200).json(rows.map(rowToApi));
    }

    // ── POST /api/lessons ───────────────────────────────────────────────────────
    if (req.method === 'POST') {
      // Только админ может создавать уроки
      if (!auth.isAdmin) {
        return res.status(403).json({ error: 'Admin access required to create lessons' });
      }

      await ensureTable();
      const body = (req.body ?? {}) as Record<string, unknown>;
      const lesson = normalizeLesson(body);

      if (!lesson.id) return res.status(400).json({ error: 'Missing lesson id' });
      if (!lesson.date) return res.status(400).json({ error: 'Missing lesson date' });

      await sql`
        INSERT INTO lessons (
          id, subject, grade, teacher_id, school_id, date,
          start_time, end_time, room, status, topic, notes, corrected_duration
        ) VALUES (
          ${lesson.id}, ${lesson.subject}, ${lesson.grade},
          ${lesson.teacherId}, ${lesson.schoolId}, ${lesson.date},
          ${lesson.startTime}, ${lesson.endTime}, ${lesson.room},
          ${lesson.status}, ${lesson.topic}, ${lesson.notes}, ${lesson.correctedDuration}
        )
      `;

      const { rows } = await sql`SELECT * FROM lessons WHERE id = ${lesson.id}`;
      return res.status(201).json(rowToApi(rows[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL DEFAULT '',
      grade TEXT NOT NULL DEFAULT '',
      teacher_id TEXT NOT NULL DEFAULT '',
      school_id TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'upcoming',
      topic TEXT,
      notes TEXT,
      corrected_duration NUMERIC
    )
  `;
}
