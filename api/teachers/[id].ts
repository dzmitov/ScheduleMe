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
    firstName: row.first_name,
    lastName: row.last_name,
    color: row.color,
  };
}

function normalizeTeacher(body: Record<string, unknown>, id: string) {
  return {
    id,
    firstName: String(body.firstName ?? body.first_name ?? ''),
    lastName: String(body.lastName ?? body.last_name ?? ''),
    color: String(body.color ?? '#6366f1'),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM teachers WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rowToApi(rows[0]));
    }

    if (req.method === 'PATCH') {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const teacher = normalizeTeacher(body, id);
      await sql`
        UPDATE teachers SET
          first_name = ${teacher.firstName}, last_name = ${teacher.lastName}, color = ${teacher.color}
        WHERE id = ${id}
      `;
      return res.status(200).json({ teacher: { ...teacher, id } });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM teachers WHERE id = ${id}`;
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
