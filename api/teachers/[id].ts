import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAuth, requireAdmin, setCors } from '../_auth';

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
  setCors(res, 'GET, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    if (req.method === 'GET') {
      // GET: доступно всем авторизованным пользователям
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { rows } = await sql`SELECT * FROM teachers WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rowToApi(rows[0]));
    }

    if (req.method === 'PATCH') {
      // PATCH: только администратор
      const auth = await requireAdmin(req, res);
      if (!auth) return;

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
      // DELETE: только администратор
      const auth = await requireAdmin(req, res);
      if (!auth) return;

      await sql`DELETE FROM teachers WHERE id = ${id}`;
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
