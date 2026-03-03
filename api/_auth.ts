/**
 * ABAP-аналогия: этот файл — как INCLUDE ZSCHEDULE_AUTH_CHECK,
 * который вставляется в начало каждого Function Module через PERFORM.
 *
 * Проверяет Clerk JWT-токен из заголовка Authorization.
 * Возвращает email пользователя и его роль из БД.
 *
 * Использование в API-хендлере:
 *   const auth = await requireAuth(req, res);
 *   if (!auth) return; // ответ уже отправлен (401/403)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClerkClient } from '@clerk/backend';
import { sql } from '@vercel/postgres';

// Clerk клиент — создаётся один раз (аналог глобального объекта соединения)
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

export interface AuthContext {
  clerkUserId: string;
  email: string;
  role: 'admin' | 'teacher' | 'viewer';
  isAdmin: boolean;
  teacherId?: string;
}

/**
 * Проверяет аутентификацию и авторизацию запроса.
 *
 * ABAP-аналогия:
 *   AUTHORITY-CHECK OBJECT 'Z_SCHEDULE' ID 'ACTVT' FIELD '03'.
 *   IF SY-SUBRC <> 0. MESSAGE 'No authorization' TYPE 'E'. ENDIF.
 *
 * @returns AuthContext если всё ок, null если уже отправил 401/403
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthContext | null> {
  // 1. Читаем Bearer token из заголовка
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return null;
  }

  const token = authHeader.split(' ')[1];

  // 2. Верифицируем JWT через Clerk (проверяет подпись, срок действия)
  // ABAP-аналогия: SUSR_USER_AUTH_FOR_OBJ_GET — проверка токена в SAP
  let clerkUserId: string;
  let email: string;

  try {
    const payload = await clerk.verifyToken(token);
    clerkUserId = payload.sub; // subject = Clerk User ID

    const clerkUser = await clerk.users.getUser(clerkUserId);
    email = clerkUser.emailAddresses[0]?.emailAddress ?? '';

    if (!email) {
      res.status(401).json({ error: 'Cannot determine user email' });
      return null;
    }
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  // 3. Проверяем роль в НАШЕЙ БД — СЕРВЕРНАЯ проверка, нельзя обойти из браузера
  // ABAP-аналогия: SELECT SINGLE * FROM ZSC_USERS WHERE EMAIL = email
  const { rows } = await sql`
    SELECT role, teacher_id
    FROM app_users
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;

  if (rows.length === 0) {
    // Пользователь есть в Clerk, но не добавлен администратором в приложение
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
}

/**
 * Проверяет, что пользователь является администратором.
 *
 * ABAP-аналогия:
 *   AUTHORITY-CHECK OBJECT 'Z_SCHEDULE' ID 'ACTVT' FIELD '02'. " 02 = Change
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
 * Настройка CORS — только для доверенного домена.
 * В .env задай: ALLOWED_ORIGIN=https://your-app.vercel.app
 *
 * ABAP-аналогия: фильтрация по IP в транзакции SM59
 */
export function setCors(res: VercelResponse, methods = 'GET, POST, PATCH, DELETE, OPTIONS') {
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
