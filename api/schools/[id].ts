import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

const cors = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

function normalizeSchool(body: Record<string, unknown>, id: string) {
  return {
    id,
    name: String(body.name ?? ''),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM schools WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ id: rows[0].id, name: rows[0].name });
    }

    if (req.method === 'PATCH') {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const school = normalizeSchool(body, id);
      await sql`UPDATE schools SET name = ${school.name} WHERE id = ${id}`;
      return res.status(200).json({ school: { ...school, id } });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM schools WHERE id = ${id}`;
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
