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
        ORDER BY app_users.email
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = req.body as Record<string, unknown>;
      const user = normalizeUser(body);
      
      // Validate email format
      if (!isValidEmail(user.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      // Validate role
      if (!['admin', 'teacher', 'viewer'].includes(user.role)) {
        return res.status(400).json({ error: 'Invalid role. Must be admin, teacher, or viewer' });
      }
      
      // If teacher_id is provided, verify it exists
      if (user.teacherId) {
        const { rowCount } = await sql`SELECT 1 FROM teachers WHERE id = ${user.teacherId}`;
        if (rowCount === 0) {
          return res.status(400).json({ error: 'Teacher not found' });
        }
      }
      
      await sql`
        INSERT INTO app_users (id, email, role, teacher_id)
        VALUES (${user.id}, ${user.email}, ${user.role}, ${user.teacherId})
        ON CONFLICT (email) DO UPDATE SET
          role = EXCLUDED.role, 
          teacher_id = EXCLUDED.teacher_id
      `;
      return res.status(200).json({ user });
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
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'viewer',
      teacher_id TEXT NULL REFERENCES teachers(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email)
  `;
  
  // Ensure default admin exists
  const { rowCount } = await sql`SELECT 1 FROM app_users WHERE email = 'dzmitov@gmail.com'`;
  if (rowCount === 0) {
    await sql`
      INSERT INTO app_users (id, email, role)
      VALUES ('admin-1', 'dzmitov@gmail.com', 'admin')
    `;
  }
}

function normalizeUser(body: Record<string, unknown>) {
  return {
    id: String(body.id ?? generateId()),
    email: String(body.email ?? '').toLowerCase().trim(),
    role: String(body.role ?? 'viewer'),
    teacherId: body.teacherId ? String(body.teacherId) : null,
  };
}

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}