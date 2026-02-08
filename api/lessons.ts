import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

const cors = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, subject, grade, teacher_id, school_id, date, start_time, end_time, room, status, topic, notes
        FROM lessons ORDER BY date, start_time
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = req.body as Record<string, unknown>;
      const lesson = normalizeLesson(body);
      await sql`
        INSERT INTO lessons (id, subject, grade, teacher_id, school_id, date, start_time, end_time, room, status, topic, notes)
        VALUES (${lesson.id}, ${lesson.subject}, ${lesson.grade}, ${lesson.teacherId}, ${lesson.schoolId}, ${lesson.date}, ${lesson.startTime}, ${lesson.endTime}, ${lesson.room}, ${lesson.status}, ${lesson.topic ?? null}, ${lesson.notes ?? null})
        ON CONFLICT (id) DO UPDATE SET
          subject = EXCLUDED.subject, grade = EXCLUDED.grade, teacher_id = EXCLUDED.teacher_id,
          school_id = EXCLUDED.school_id, date = EXCLUDED.date, start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time, room = EXCLUDED.room, status = EXCLUDED.status,
          topic = EXCLUDED.topic, notes = EXCLUDED.notes
      `;
      return res.status(200).json({ lesson: lesson });
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
      notes TEXT
    )
  `;
}

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

function normalizeLesson(body: Record<string, unknown>) {
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
  };
}
