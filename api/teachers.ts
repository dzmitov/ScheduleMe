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
        SELECT id, first_name, last_name, color FROM teachers ORDER BY last_name, first_name
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = req.body as Record<string, unknown>;
      const teacher = normalizeTeacher(body);
      await sql`
        INSERT INTO teachers (id, first_name, last_name, color)
        VALUES (${teacher.id}, ${teacher.firstName}, ${teacher.lastName}, ${teacher.color})
        ON CONFLICT (id) DO UPDATE SET
          first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, color = EXCLUDED.color
      `;
      return res.status(200).json({ teacher });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#6366f1'
    )
  `;
}

function normalizeTeacher(body: Record<string, unknown>) {
  return {
    id: String(body.id ?? ''),
    firstName: String(body.firstName ?? body.first_name ?? ''),
    lastName: String(body.lastName ?? body.last_name ?? ''),
    color: String(body.color ?? '#6366f1'),
  };
}
