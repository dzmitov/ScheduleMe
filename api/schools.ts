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
      // Добавляем sort_order в SELECT и сортируем по нему
      const { rows } = await sql`SELECT id, name, address, sort_order FROM schools ORDER BY sort_order ASC, name ASC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
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

async function ensureTable() {
  // Создаём таблицу с полем sort_order
  await sql`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      sort_order INTEGER DEFAULT 0
    )
  `;
  
  // На случай, если таблица уже существует - добавляем колонки
  await sql`
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0
  `;
}

function normalizeSchool(body: Record<string, unknown>) {
  return {
    id: String(body.id ?? ''),
    name: String(body.name ?? ''),
    address: String(body.address ?? ''),
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : (typeof body.sort_order === 'number' ? body.sort_order : 0),
  };
}
