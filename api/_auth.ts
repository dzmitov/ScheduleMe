/**
 * api/_auth.ts — централизованная проверка авторизации.
 *
 * ABAP-аналогия: INCLUDE ZSCHEDULE_AUTH_CHECK
 * Вставляется в начало каждого API-хендлера через requireAuth/requireAdmin.
 *
 * Исправление: Clerk-клиент создаётся лениво (при первом вызове),
 * а не при загрузке модуля — чтобы избежать краша если CLERK_SECRET_KEY
 * ещё не доступен во время инициализации Vercel Function.
 *
 * ABAP-аналогия ленивой инициализации:
 *   IF go_clerk_client IS NOT BOUND.
 *     CREATE OBJECT go_clerk_client.
 *   ENDIF.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { sql } from '@vercel/postgres';

export interface AuthContext {
  clerkUserId: string;
  email: string;
  role: 'admin' | 'teacher' | 'viewer';
  isAdmin: boolean;
  teacherId?: string;
}

// Ленивая инициализация — клиент создаётся только при первом вызове
// ABAP-аналогия: IF go_connection IS NOT BOUND → CREATE OBJECT go_connection
let _clerk: ReturnType<typeof createClerkClient> | null = null;

function getClerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'CLERK_SECRET_KEY is not set. ' +
      'Add it in Vercel Dashboard → Settings → Environment Variables, ' +
      'then redeploy.'
    );
  }
  if (!_clerk) {
    _clerk = createClerkClient({ secretKey });
  }
  return _clerk;
}

/**
 * Проверяет аутентификацию запроса через Clerk JWT.
 * Затем проверяет роль в таблице app_users (серверная проверка).
 *
 * ABAP-аналогия:
 *   AUTHORITY-CHECK OBJECT 'Z_SCHEDULE' ID 'ACTVT' FIELD '03'.
 *   IF SY-SUBRC <> 0. RETURN. ENDIF.
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthContext | null> {
  // 1. Читаем Bearer токен
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return null;
  }
  const token = authHeader.split(' ')[1];

  // 2. Верифицируем JWT через Clerk
  let clerkUserId: string;
  let email: string;

  try {
    const clerk = getClerk();
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    clerkUserId = payload.sub;

    const clerkUser = await clerk.users.getUser(clerkUserId);
    email = clerkUser.emailAddresses[0]?.emailAddress ?? '';

    if (!email) {
      res.status(401).json({ error: 'Cannot determine user email from Clerk' });
      return null;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Auth error:', message);

    // Если проблема с отсутствием ключа — возвращаем понятную ошибку
    if (message.includes('CLERK_SECRET_KEY')) {
      res.status(500).json({ error: 'Server configuration error: ' + message });
    } else {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
    return null;
  }

  // 3. Проверяем роль в нашей БД — это СЕРВЕРНАЯ проверка, нельзя обойти из браузера
  // ABAP-аналогия: SELECT SINGLE FROM ZSC_USERS WHERE EMAIL = email
  try {
    const { rows } = await sql`
      SELECT role, teacher_id
      FROM app_users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    if (rows.length === 0) {
      res.status(403).json({ error: 'Access denied: user not registered in the application' });
      return null;
    }

    const dbUser = rows[0];
    const role = (dbUser.role as AuthContext['role']) ?? 'viewer';

    return {
      clerkUserId,
      email,
      role,
      isAdmin: role === 'admin',
      teacherId: dbUser.teacher_id ?? undefined,
    };
  } catch (err) {
    console.error('DB error in requireAuth:', err);
    res.status(500).json({ error: 'Database error while checking permissions' });
    return null;
  }
}

/**
 * Проверяет что пользователь администратор.
 *
 * ABAP-аналогия:
 *   AUTHORITY-CHECK OBJECT 'Z_SCHEDULE' ID 'ACTVT' FIELD '02'. " Change
 */
export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthContext | null> {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  if (!auth.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return auth;
}

/**
 * Настройка CORS. В .env задай: ALLOWED_ORIGIN=https://your-app.vercel.app
 * ABAP-аналогия: фильтрация по IP в SM59
 */
export function setCors(res: VercelResponse, methods = 'GET, POST, PATCH, DELETE, OPTIONS') {
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}