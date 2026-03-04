import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAuth, requireAdmin, setCors } from './_auth.js';

function rowToApi(row: Record<string, unknown>) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    color: row.color,
  };
}

function normalizeTeacher(body: Record<string, unknown>, id?: string) {
  return {
    id: id ?? String(body.id ?? ''),
    firstName: String(body.firstName ?? body.first_name ?? ''),
    lastName: String(body.lastName ?? body.last_name ?? ''),
    color: String(body.color ?? '#6366f1'),
  };
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

// ABAP-аналогия: SPLIT lv_url AT '/' INTO TABLE lt_parts → READ последний элемент
function extractId(req: VercelRequest): string | null {
  const urlPath = (req.url ?? '').split('?')[0];
  const parts = urlPath.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  return last && last !== 'teachers' ? last : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = extractId(req);

  try {
    await ensureTable();

    // ════════════════════════════════════════════════════════════════════════════
    // МАРШРУТЫ С ID: /api/teachers/:id  (GET, PATCH, DELETE)
    // ════════════════════════════════════════════════════════════════════════════
    if (id) {
      if (req.method === 'GET') {
        const auth = await requireAuth(req, res);
        if (!auth) return;
        const { rows } = await sql`SELECT * FROM teachers WHERE id = ${id}`;
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rowToApi(rows[0]));
      }

      if (req.method === 'PATCH') {
        const auth = await requireAdmin(req, res);
        if (!auth) return;
        const body = (req.body ?? {}) as Record<string, unknown>;
        const teacher = normalizeTeacher(body, id);
        await sql`
          UPDATE teachers SET
            first_name = ${teacher.firstName},
            last_name = ${teacher.lastName},
            color = ${teacher.color}
          WHERE id = ${id}
        `;
        return res.status(200).json({ teacher: { ...teacher, id } });
      }

      if (req.method === 'DELETE') {
        const auth = await requireAdmin(req, res);
        if (!auth) return;
        await sql`DELETE FROM teachers WHERE id = ${id}`;
        return res.status(204).end();
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // МАРШРУТЫ БЕЗ ID: /api/teachers  (GET all, POST)
    // ════════════════════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      const auth = await requireAuth(req, res);
      if (!auth) return;
      const { rows } = await sql`
        SELECT id, first_name, last_name, color FROM teachers ORDER BY last_name, first_name
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const auth = await requireAdmin(req, res);
      if (!auth) return;
      const body = req.body as Record<string, unknown>;
      const teacher = normalizeTeacher(body);
      await sql`
        INSERT INTO teachers (id, first_name, last_name, color)
        VALUES (${teacher.id}, ${teacher.firstName}, ${teacher.lastName}, ${teacher.color})
        ON CONFLICT (id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          color = EXCLUDED.color
      `;
      return res.status(200).json({ teacher });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
