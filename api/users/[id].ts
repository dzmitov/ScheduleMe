import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAdmin, setCors } from '../_auth';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRole(role: string): boolean {
  return ['admin', 'teacher', 'viewer'].includes(role);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res, 'GET, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Все операции с конкретным пользователем — только для администратора
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, email, role, teacher_id FROM app_users WHERE id = ${id}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PATCH') {
      const body = (req.body ?? {}) as Record<string, unknown>;

      // Валидация входных данных
      // ABAP-аналогия: проверка через CHECK перед MODIFY ZUSERS
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
        SELECT id, email, role, teacher_id FROM app_users WHERE id = ${id}
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
