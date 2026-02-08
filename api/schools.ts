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
      const { rows } = await sql`SELECT id, name FROM schools ORDER BY name`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = req.body as Record<string, unknown>;
      const school = normalizeSchool(body);
      await sql`
        INSERT INTO schools (id, name)
        VALUES (${school.id}, ${school.name})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `;
      return res.status(200).json({ school });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT ''
    )
  `;
}

function normalizeSchool(body: Record<string, unknown>) {
  return {
    id: String(body.id ?? ''),
    name: String(body.name ?? ''),
  };
}
