import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAuth, requireAdmin, setCors } from './_auth.js';

function normalizeSchool(body: Record<string, unknown>, id?: string) {
  return {
    id: id ?? String(body.id ?? ''),
    name: String(body.name ?? ''),
    address: String(body.address ?? ''),
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder
      : typeof body.sort_order === 'number' ? body.sort_order : 0,
  };
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      sort_order INTEGER DEFAULT 0
    )
  `;
  await sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`;
}

// ABAP-аналогия: SPLIT lv_url AT '/' INTO TABLE lt_parts → READ последний элемент
function extractId(req: VercelRequest): string | null {
  const urlPath = (req.url ?? '').split('?')[0];
  const parts = urlPath.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  return last && last !== 'schools' ? last : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = extractId(req);

  try {
    await ensureTable();

    // ════════════════════════════════════════════════════════════════════════════
    // МАРШРУТЫ С ID: /api/schools/:id  (GET, PATCH, DELETE)
    // ════════════════════════════════════════════════════════════════════════════
    if (id) {
      if (req.method === 'GET') {
        const auth = await requireAuth(req, res);
        if (!auth) return;
        const { rows } = await sql`SELECT * FROM schools WHERE id = ${id}`;
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const r = rows[0];
        return res.status(200).json({ id: r.id, name: r.name, address: r.address, sortOrder: r.sort_order });
      }

      if (req.method === 'PATCH') {
        const auth = await requireAdmin(req, res);
        if (!auth) return;
        const body = (req.body ?? {}) as Record<string, unknown>;
        const school = normalizeSchool(body, id);
        await sql`
          UPDATE schools SET
            name = ${school.name},
            address = ${school.address},
            sort_order = ${school.sortOrder}
          WHERE id = ${id}
        `;
        return res.status(200).json({ school: { ...school, id } });
      }

      if (req.method === 'DELETE') {
        const auth = await requireAdmin(req, res);
        if (!auth) return;
        await sql`DELETE FROM schools WHERE id = ${id}`;
        return res.status(204).end();
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // МАРШРУТЫ БЕЗ ID: /api/schools  (GET all, POST)
    // ════════════════════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      const auth = await requireAuth(req, res);
      if (!auth) return;
      const { rows } = await sql`
        SELECT id, name, address, sort_order FROM schools ORDER BY sort_order ASC, name ASC
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const auth = await requireAdmin(req, res);
      if (!auth) return;
      const body = req.body as Record<string, unknown>;
      const school = normalizeSchool(body);
      await sql`
        INSERT INTO schools (id, name, address, sort_order)
        VALUES (${school.id}, ${school.name}, ${school.address}, ${school.sortOrder})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          sort_order = EXCLUDED.sort_order
      `;
      return res.status(200).json({ school });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
