import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

const cors = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

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
  };
}

function normalizeLesson(body: Record<string, unknown>, id: string) {
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
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM lessons WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rowToApi(rows[0]));
    }

    if (req.method === 'PATCH') {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const lesson = normalizeLesson(body, id);
      await sql`
        UPDATE lessons SET
          subject = ${lesson.subject}, grade = ${lesson.grade}, teacher_id = ${lesson.teacherId},
          school_id = ${lesson.schoolId}, date = ${lesson.date}, start_time = ${lesson.startTime},
          end_time = ${lesson.endTime}, room = ${lesson.room}, status = ${lesson.status},
          topic = ${lesson.topic}, notes = ${lesson.notes}
        WHERE id = ${id}
      `;
      return res.status(200).json({ lesson: { ...lesson, id } });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM lessons WHERE id = ${id}`;
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
