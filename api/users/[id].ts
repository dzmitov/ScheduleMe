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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    // Check if user exists
    const { rowCount } = await sql`SELECT 1 FROM app_users WHERE id = ${id}`;
    if (rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT 
          app_users.id, 
          app_users.email, 
          app_users.role, 
          app_users.teacher_id,
          teachers.first_name as teacher_first_name,
          teachers.last_name as teacher_last_name
        FROM app_users
        LEFT JOIN teachers ON app_users.teacher_id = teachers.id
        WHERE app_users.id = ${id}
      `;
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PATCH') {
      const body = req.body as Record<string, unknown>;
      
      // Prevent changing email of default admin
      const { rows: userRows } = await sql`SELECT email FROM app_users WHERE id = ${id}`;
      if (userRows[0]?.email === 'dzmitov@gmail.com' && body.email && body.email !== 'dzmitov@gmail.com') {
        return res.status(400).json({ error: 'Cannot change email of default admin user' });
      }
      
      // Validate email if provided
      if (body.email && !isValidEmail(String(body.email))) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      // Validate role if provided
      if (body.role && !['admin', 'teacher', 'viewer'].includes(String(body.role))) {
        return res.status(400).json({ error: 'Invalid role. Must be admin, teacher, or viewer' });
      }
      
      // If teacher_id is provided, verify it exists
      if (body.teacherId) {
        const { rowCount } = await sql`SELECT 1 FROM teachers WHERE id = ${String(body.teacherId)}`;
        if (rowCount === 0) {
          return res.status(400).json({ error: 'Teacher not found' });
        }
      }
      
      // Build dynamic update query
      let updateQuery = 'UPDATE app_users SET ';
      const updateValues: any[] = [];
      const updateFields: string[] = [];
      
      if (body.email !== undefined) {
        updateFields.push('email = $' + (updateValues.length + 1));
        updateValues.push(String(body.email).toLowerCase().trim());
      }
      
      if (body.role !== undefined) {
        updateFields.push('role = $' + (updateValues.length + 1));
        updateValues.push(String(body.role));
      }
      
      if (body.teacherId !== undefined) {
        updateFields.push('teacher_id = $' + (updateValues.length + 1));
        updateValues.push(body.teacherId ? String(body.teacherId) : null);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      updateQuery += updateFields.join(', ') + ' WHERE id = $' + (updateValues.length + 1);
      updateValues.push(id);
      
      await sql.query(updateQuery, updateValues);
      
      // Get updated user
      const { rows } = await sql`
        SELECT id, email, role, teacher_id FROM app_users WHERE id = ${id}
      `;
      
      return res.status(200).json({ user: rows[0] });
    }

    if (req.method === 'DELETE') {
      // Prevent deleting default admin
      const { rows: userRows } = await sql`SELECT email FROM app_users WHERE id = ${id}`;
      if (userRows[0]?.email === 'dzmitov@gmail.com') {
        return res.status(400).json({ error: 'Cannot delete default admin user' });
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

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}