import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { checkUserRole } from '../services/dbService';

/**
 * Тип роли пользователя в системе.
 *
 * ABAP-аналогия: структура с результатом AUTHORITY-CHECK
 *   isAdmin   → SY-SUBRC = 0 для профиля Z_ADMIN
 *   role      → значение поля в таблице USGRPT / кастомной Z-таблице
 *   teacherId → внешний ключ на таблицу учителей
 *   userId    → внутренний ID записи в app_users
 */
export interface UserRole {
  isAdmin: boolean;
  role: 'admin' | 'teacher' | 'viewer' | 'unauthorized';
  teacherId?: string;
  userId?: string;
}

/**
 * Возвращаемое значение хука.
 *
 * ABAP-аналогия: экспортные параметры FUNCTION MODULE проверки прав
 */
export interface UseUserRoleReturn {
  /** null = ещё загружается (аналог: начальное состояние до AUTHORITY-CHECK) */
  userRole: UserRole | null;
  isAdmin: boolean;
  /** teacherId текущего пользователя — для фильтрации его уроков на дашборде */
  defaultTeacherFilter: string;
}

/**
 * Хук: проверяет роль залогиненного пользователя через БД (app_users).
 *
 * ABAP-аналогия: вызов AUTHORITY-CHECK + SELECT из Z-таблицы прав
 * вынесенный в отдельную FORM / METHOD класса.
 *
 * Логика:
 *  1. Ждём пока Clerk сообщит что пользователь залогинен
 *  2. Берём email из Clerk
 *  3. Вызываем checkUserRole() → запрос к /api/users
 *  4. Если роль 'teacher' — сразу выставляем defaultTeacherFilter
 *
 * @example
 *   const { userRole, isAdmin, defaultTeacherFilter } = useUserRole();
 *   if (userRole === null) return <LoadingScreen message="Checking access..." />;
 *   if (userRole.role === 'unauthorized') return <AccessDenied />;
 */
export function useUserRole(): UseUserRoleReturn {
  const { user, isSignedIn } = useUser();

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [defaultTeacherFilter, setDefaultTeacherFilter] = useState<string>('all');

  useEffect(() => {
    // Аналог: IF sy-subrc <> 0 OR email IS INITIAL → выход
    if (!isSignedIn || !user?.primaryEmailAddress?.emailAddress) return;

    const email = user.primaryEmailAddress.emailAddress;

    checkUserRole(email)
      .then(role => {
        setUserRole(role as UserRole);

        // Если учитель — сразу фильтруем дашборд только его уроками
        // ABAP-аналогия: SET PARAMETER ID 'ZTEACHER_ID' FIELD lv_teacher_id
        if (role.role === 'teacher' && role.teacherId) {
          setDefaultTeacherFilter(role.teacherId);
        }
      })
      .catch(err => {
        console.error('Error checking user role:', err);
        // При ошибке проверки — даём минимальные права (не блокируем)
        setUserRole({ isAdmin: false, role: 'viewer' });
      });
  }, [isSignedIn, user]);

  return {
    userRole,
    isAdmin: userRole?.isAdmin ?? false,
    defaultTeacherFilter,
  };
}
