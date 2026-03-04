import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAuth, setCors } from './_auth.js';

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

function normalizeLesson(body: Record<string, unknown>, id?: string) {
  const rawDuration = body.correctedDuration ?? body.corrected_duration;
  return {
    id: id ?? String(body.id ?? ''),
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

// ── ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: извлечь ID из URL ───────────────────────────────
// ABAP-аналогия: SPLIT lv_url AT '/' INTO TABLE lt_parts.
//                lv_id = lt_parts[ lines( lt_parts ) ].
// Возвращает ID если URL вида /api/lessons/abc123, иначе null
function extractId(req: VercelRequest): string | null {
  const urlPath = (req.url ?? '').split('?')[0];
  const parts = urlPath.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  // Если последний сегмент не 'lessons' — это ID
  return last && last !== 'lessons' ? last : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ─────────────────────────────────────────────────────────────────────
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── AUTH ──────────────────────────────────────────────────────────────────────
  // ABAP-аналогия: AUTHORITY-CHECK в начале FM
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── РОУТИНГ: есть ID в URL? ──────────────────────────────────────────────────
  // ABAP-аналогия: IF iv_id IS NOT INITIAL. ... ELSE. ... ENDIF.
  const id = extractId(req);

  try {
    await ensureTable();

    // ════════════════════════════════════════════════════════════════════════════
    // МАРШРУТЫ С ID: /api/lessons/:id  (GET, PATCH, DELETE)
    // ════════════════════════════════════════════════════════════════════════════
    if (id) {
      if (req.method === 'GET') {
        const { rows } = await sql`SELECT * FROM lessons WHERE id = ${id}`;
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

        // Учитель может смотреть только свои уроки
        const lesson = rows[0];
        if (!auth.isAdmin && auth.teacherId && lesson.teacher_id !== auth.teacherId) {
          return res.status(403).json({ error: 'Access denied: not your lesson' });
        }
        return res.status(200).json(rowToApi(lesson));
      }

      if (req.method === 'PATCH') {
        if (!auth.isAdmin) {
          return res.status(403).json({ error: 'Admin access required' });
        }
        const body = (req.body ?? {}) as Record<string, unknown>;
        const lesson = normalizeLesson(body, id);
        await sql`
          UPDATE lessons SET
            subject = ${lesson.subject},
            grade = ${lesson.grade},
            teacher_id = ${lesson.teacherId},
            school_id = ${lesson.schoolId},
            date = ${lesson.date},
            start_time = ${lesson.startTime},
            end_time = ${lesson.endTime},
            room = ${lesson.room},
            status = ${lesson.status},
            topic = ${lesson.topic},
            notes = ${lesson.notes},
            corrected_duration = ${lesson.correctedDuration}
          WHERE id = ${id}
        `;
        const { rows } = await sql`SELECT * FROM lessons WHERE id = ${id}`;
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rowToApi(rows[0]));
      }

      if (req.method === 'DELETE') {
        if (!auth.isAdmin) {
          return res.status(403).json({ error: 'Admin access required' });
        }
        await sql`DELETE FROM lessons WHERE id = ${id}`;
        return res.status(200).json({ success: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // МАРШРУТЫ БЕЗ ID: /api/lessons  (GET all, POST)
    // ════════════════════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
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
        const result = await sql`SELECT * FROM lessons ORDER BY date, start_time`;
        rows = result.rows;
      }
      return res.status(200).json(rows.map(rowToApi));
    }

    if (req.method === 'POST') {
      if (!auth.isAdmin) {
        return res.status(403).json({ error: 'Admin access required to create lessons' });
      }
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
