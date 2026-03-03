import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAuth, setCors } from '../_auth.js';

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

function normalizeLesson(body: Record<string, unknown>, id: string) {
  const rawDuration = body.correctedDuration ?? body.corrected_duration;
  return {
    id,
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
  setCors(res, 'GET, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── AUTH ──────────────────────────────────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
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

    // PATCH и DELETE — только для администраторов
    // ABAP-аналогия: AUTHORITY-CHECK ... ID 'ACTVT' FIELD '02' (изменение)
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
