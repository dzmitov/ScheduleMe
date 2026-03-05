import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAdmin, requireAuth, setCors } from './_auth.js';

function rowToApi(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    teacherId: row.teacher_id ?? undefined,
    teacher_first_name: row.teacher_first_name ?? undefined,
    teacher_last_name: row.teacher_last_name ?? undefined,
  };
}

function generateId() {
  // ABAP-аналогия: CALL FUNCTION 'GUID_CREATE'
  return crypto.randomUUID().replace(/-/g, '').substring(0, 11);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRole(role: string): boolean {
  return ['admin', 'teacher', 'viewer'].includes(role);
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'viewer',
      teacher_id TEXT
    )
  `;
}

// ABAP-аналогия: SPLIT lv_url AT '/' INTO TABLE lt_parts → READ последний элемент
function extractId(req: VercelRequest): string | null {
  const urlPath = (req.url ?? '').split('?')[0];
  const parts = urlPath.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  return last && last !== 'users' ? last : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── СПЕЦИАЛЬНЫЙ ENDPOINT: GET /api/users?me=true ──────────────────────────
  // ABAP-аналогия: чтение своего SY-UNAME — разрешено любому авторизованному
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

  const id = extractId(req);

  try {
    // ════════════════════════════════════════════════════════════════════════════
    // МАРШРУТЫ С ID: /api/users/:id  (GET, PATCH, DELETE) — только admin
    // ════════════════════════════════════════════════════════════════════════════
    if (id) {
      // ABAP-аналогия: AUTHORITY-CHECK OBJECT 'S_USER_GRP' ID 'ACTVT' FIELD '02'
      const auth = await requireAdmin(req, res);
      if (!auth) return;

      if (req.method === 'GET') {
        const { rows } = await sql`
          SELECT id, email, role, teacher_id FROM app_users WHERE id = ${id}
        `;
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rows[0]);
      }

      if (req.method === 'PATCH') {
        const body = (req.body ?? {}) as Record<string, unknown>;

        if (body.email !== undefined) {
          const email = String(body.email).toLowerCase().trim();
          if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
          }
        }
        if (body.role !== undefined && !isValidRole(String(body.role))) {
          return res.status(400).json({ error: 'Invalid role' });
        }

        // Строим UPDATE динамически — только переданные поля
        // ABAP-аналогия: строим WHERE-условие через строку запроса
        const updateFields: string[] = [];
        const updateValues: unknown[] = [];

        if (body.email !== undefined) {
          updateFields.push(`email = $${updateValues.length + 1}`);
          updateValues.push(String(body.email).toLowerCase().trim());
        }
        if (body.role !== undefined) {
          updateFields.push(`role = $${updateValues.length + 1}`);
          updateValues.push(String(body.role));
        }
        if ('teacherId' in body) {
          updateFields.push(`teacher_id = $${updateValues.length + 1}`);
          updateValues.push(body.teacherId ? String(body.teacherId) : null);
        }

        if (updateFields.length === 0) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        const updateQuery =
          'UPDATE app_users SET ' + updateFields.join(', ') + ' WHERE id = $' + (updateValues.length + 1);
        updateValues.push(id);
        await sql.query(updateQuery, updateValues);

        const { rows } = await sql`
            SELECT u.id, u.email, u.role, u.teacher_id,
                   t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
              FROM app_users u
              LEFT JOIN teachers t ON t.id = u.teacher_id
              WHERE u.id = ${id}
        `;
        return res.status(200).json({ user: rows[0] });
      }

      if (req.method === 'DELETE') {
        // Защита: нельзя удалить самого себя
        const { rows: selfRows } = await sql`SELECT email FROM app_users WHERE id = ${id}`;
        if (selfRows[0]?.email?.toLowerCase() === auth.email.toLowerCase()) {
          return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Защита: нельзя удалить последнего администратора
        const { rows: userRows } = await sql`SELECT role FROM app_users WHERE id = ${id}`;
        if (userRows[0]?.role === 'admin') {
          const { rowCount } = await sql`SELECT 1 FROM app_users WHERE role = 'admin'`;
          if (rowCount !== null && rowCount <= 1) {
            return res.status(400).json({ error: 'Cannot delete the last admin user' });
          }
        }

        await sql`DELETE FROM app_users WHERE id = ${id}`;
        return res.status(200).json({ success: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // МАРШРУТЫ БЕЗ ID: /api/users  (GET all, POST) — только admin
    // ════════════════════════════════════════════════════════════════════════════
    // ABAP-аналогия: AUTHORITY-CHECK OBJECT 'S_USER_GRP' ID 'ACTVT' FIELD '01'
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    if (req.method === 'GET') {
      await ensureTable();
      const { rows } = await sql`
      SELECT u.id, u.email, u.role, u.teacher_id,
             t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
      FROM app_users u
      LEFT JOIN teachers t ON t.id = u.teacher_id
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

      const { rows: existing } = await sql`SELECT id FROM app_users WHERE LOWER(email) = ${email}`;
      if (existing.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const newId = String(body.id ?? generateId());
      const teacherId = body.teacherId ? String(body.teacherId) : null;

      await sql`
        INSERT INTO app_users (id, email, role, teacher_id)
        VALUES (${newId}, ${email}, ${role}, ${teacherId})
      `;

      const { rows } = await sql`
        SELECT u.id, u.email, u.role, u.teacher_id,
               t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
          FROM app_users u
          LEFT JOIN teachers t ON t.id = u.teacher_id
          WHERE u.id = ${newId}
        `;
      return res.status(201).json({ user: rowToApi(rows[0] ?? {}) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
