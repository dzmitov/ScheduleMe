import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAdmin, requireAuth, setCors } from './_auth.js';

function rowToApi(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    teacherId: row.teacher_id ?? undefined,
  };
}

function generateId() {
  // Используем crypto для криптографически стойкого ID
  // ABAP-аналогия: CALL FUNCTION 'GUID_CREATE' вместо SY-TABIX
  return crypto.randomUUID().replace(/-/g, '').substring(0, 11);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidRole(role: string): boolean {
  return ['admin', 'teacher', 'viewer'].includes(role);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── СПЕЦИАЛЬНЫЙ ENDPOINT: GET /api/users/me ───────────────────────────────────
  // Любой авторизованный пользователь может узнать свою роль.
  // ABAP-аналогия: чтение своего SY-UNAME — всегда разрешено.
  if (req.method === 'GET' && req.query.me === 'true') {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    return res.status(200).json({
      email: auth.email,
      role: auth.role,
      isAdmin: auth.isAdmin,
      teacherId: auth.teacherId,
    });
  }

  // ── ВСЕ ОСТАЛЬНЫЕ ОПЕРАЦИИ С ПОЛЬЗОВАТЕЛЯМИ — ТОЛЬКО ДЛЯ АДМИНИСТРАТОРА ──────
  // ABAP-аналогия: AUTHORITY-CHECK OBJECT 'S_USER_GRP' ID 'ACTVT' FIELD '01'
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      await ensureTable();
      const { rows } = await sql`
        SELECT u.id, u.email, u.role, u.teacher_id
        FROM app_users u
        ORDER BY u.email
      `;
      return res.status(200).json(rows.map(rowToApi));
    }

    if (req.method === 'POST') {
      await ensureTable();
      const body = (req.body ?? {}) as Record<string, unknown>;
      const email = String(body.email ?? '').toLowerCase().trim();
      const role = String(body.role ?? 'viewer');

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      if (!isValidRole(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be: admin, teacher, or viewer' });
      }

      // Проверка на дубликат email
      const { rows: existing } = await sql`SELECT id FROM app_users WHERE LOWER(email) = ${email}`;
      if (existing.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const id = String(body.id ?? generateId());
      const teacherId = body.teacherId ? String(body.teacherId) : null;

      await sql`
        INSERT INTO app_users (id, email, role, teacher_id)
        VALUES (${id}, ${email}, ${role}, ${teacherId})
      `;

      const { rows } = await sql`SELECT * FROM app_users WHERE id = ${id}`;
      return res.status(201).json({ user: rowToApi(rows[0]) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      teacher_id TEXT
    )
  `;
}
