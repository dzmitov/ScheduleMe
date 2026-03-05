import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Lesson, Teacher, School, AppUser, LessonStatus } from '../../types';
import {
  fetchLessons, addLesson, updateLesson, deleteLesson,
  fetchTeachers, addTeacher, updateTeacher, deleteTeacher,
  fetchSchools, addSchool, updateSchool, deleteSchool,
  fetchUsers, addUser, updateUser, deleteUser,
} from '../services/dbService';

/**
 * Состояние загрузки/ошибок по каждой сущности.
 *
 * ABAP-аналогия: отдельная структура с SY-SUBRC и SY-MSGV1
 * для каждого SELECT / BAPI-вызова
 */
export interface DataErrors {
  lessons: string | null;
  teachers: string | null;
  schools: string | null;
  users: string | null;
}

/**
 * Все CRUD-операции над уроками.
 *
 * ABAP-аналогия: набор METHODS класса ZCL_LESSON_MANAGER
 *   - save   → INSERT / UPDATE в таблицу
 *   - delete → DELETE из таблицы
 *   - copy   → массовый INSERT с новыми ключами
 */
export interface LessonActions {
  save: (lesson: Partial<Lesson>, existingLessons: Lesson[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  copyWeek: (params: {
    weekDays: Date[];
    currentWeekOffset: number;
    targetWeekOffset: number;
    keepTeachers: boolean;
  }) => Promise<void>;
  copyDay: (params: {
    sourceDate: string;
    targetDate: string;
    keepTeachers: boolean;
  }) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkUpdateTeacher: (ids: string[], teacherId: string | null) => Promise<void>;
}

export interface TeacherActions {
  add: () => Promise<Teacher>;
  update: (teacher: Teacher) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export interface SchoolActions {
  add: () => Promise<School>;
  update: (school: School) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export interface UserActions {
  save: (user: Partial<AppUser>, existingUsers: AppUser[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Возвращаемое значение хука.
 *
 * ABAP-аналогия: экспортные параметры большого FUNCTION MODULE
 * типа ZSCHEDULE_GET_ALL_DATA с таблицами и операциями
 */
export interface UseAppDataReturn {
  // Данные (ABAP: TABLES параметры)
  lessons: Lesson[];
  teachers: Teacher[];
  schools: School[];
  users: AppUser[];

  // Сеттеры — нужны для оптимистичных обновлений прямо в компонентах
  setLessons: Dispatch<SetStateAction<Lesson[]>>;
  setTeachers: Dispatch<SetStateAction<Teacher[]>>;
  setSchools: Dispatch<SetStateAction<School[]>>;
  setUsers: Dispatch<SetStateAction<AppUser[]>>;

  // Состояние загрузки (ABAP: флаг IS_LOADING)
  isLoading: boolean;
  errors: DataErrors;

  // Операции (ABAP: METHODS)
  lessonActions: LessonActions;
  teacherActions: TeacherActions;
  schoolActions: SchoolActions;
  userActions: UserActions;
}

// Вспомогательная функция генерации ID (аналог NUMBER_GET_NEXT / GUID_CREATE)
const newId = () => Math.random().toString(36).substring(2, 11);

const toLocalDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Хук: загружает все данные приложения и предоставляет CRUD-операции.
 *
 * ABAP-аналогия: INITIALIZATION + AT SELECTION-SCREEN OUTPUT
 * с SELECT на все рабочие таблицы + набор PERFORM для CRUD.
 *
 * Загружает параллельно (Promise.all):
 *   lessons, teachers, schools, users
 *
 * @example
 *   const { lessons, teachers, schools, isLoading, lessonActions } = useAppData();
 */
export function useAppData(): UseAppDataReturn {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<DataErrors>({
    lessons: null, teachers: null, schools: null, users: null,
  });

  // Начальная загрузка всех данных
  // ABAP-аналогия: INITIALIZATION → параллельный SELECT * FROM zlessons, zteachers...
  useEffect(() => {
    const setErr = (key: keyof DataErrors) => (err: unknown) =>
      setErrors(prev => ({
        ...prev,
        [key]: err instanceof Error ? err.message : `Failed to load ${key}`,
      }));

    Promise.all([
      fetchLessons().then(setLessons).catch(setErr('lessons')),
      fetchTeachers().then(setTeachers).catch(setErr('teachers')),
      fetchSchools().then(setSchools).catch(setErr('schools')),
      fetchUsers().then(setUsers).catch(setErr('users')),
    ]).finally(() => setIsLoading(false));
  }, []);

  // ─── LESSON ACTIONS ──────────────────────────────────────────────────────────
  // ABAP-аналогия: METHODS save_lesson / delete_lesson / copy_week класса

  const lessonActions: LessonActions = {

    /**
     * Сохранить урок (INSERT или UPDATE).
     * ABAP: IF lv_id IS INITIAL → INSERT ELSE UPDATE
     */
    save: async (lessonData, existingLessons) => {
      const isNew = !lessonData.id || !existingLessons.some(l => l.id === lessonData.id);
      const lesson = { ...lessonData, id: lessonData.id || newId() } as Lesson;

      if (isNew) {
        const saved = await addLesson(lesson);
        setLessons(prev => [...prev, saved]);
      } else {
        const saved = await updateLesson(lesson);
        setLessons(prev => prev.map(l => l.id === saved.id ? saved : l));
      }
    },

    /**
     * Удалить урок по ID.
     * ABAP: DELETE FROM zlessons WHERE id = lv_id
     */
    remove: async (id) => {
      await deleteLesson(id);
      setLessons(prev => prev.filter(l => l.id !== id));
    },

    /**
     * Скопировать все уроки текущей недели в целевую неделю.
     * ABAP: LOOP AT lt_lessons → INSERT новые записи со смещёнными датами
     */
    copyWeek: async ({ weekDays, currentWeekOffset, targetWeekOffset, keepTeachers }) => {
      const dayStrings = weekDays.map(d => toLocalDateStr(d));
      const weekLessons = lessons.filter(l => dayStrings.includes(l.date));

      if (weekLessons.length === 0) {
        alert('No classes found to duplicate.');
        return;
      }

      // Вычисляем смещение в днях между неделями
      const getMonday = (offset: number) => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff + offset * 7);
        d.setHours(0, 0, 0, 0);
        return d;
      };
      const diffDays = Math.round(
        (getMonday(targetWeekOffset).getTime() - getMonday(currentWeekOffset).getTime())
        / (1000 * 60 * 60 * 24)
      );

      const newLessons = weekLessons.map(l => {
        const d = new Date(l.date);
        d.setDate(d.getDate() + diffDays);
        return {
          ...l,
          id: newId(),
          date: toLocalDateStr(d),
          teacherId: keepTeachers ? l.teacherId : '',
          status: LessonStatus.UPCOMING,
        };
      });

      await Promise.all(newLessons.map(addLesson));
      setLessons(prev => [...prev, ...newLessons]);
      alert(`Successfully cloned ${newLessons.length} sessions.`);
    },

    /**
     * Скопировать уроки одного дня в другой день.
     * ABAP: LOOP AT lt_day_lessons WHERE date = lv_source → INSERT с новой датой
     */
    copyDay: async ({ sourceDate, targetDate, keepTeachers }) => {
      const dayLessons = lessons.filter(l => l.date === sourceDate);

      if (dayLessons.length === 0) {
        alert('No classes found for this day.');
        return;
      }
      if (!targetDate || targetDate === sourceDate) {
        alert('Please select a different target date.');
        return;
      }

      const newLessons = dayLessons.map(l => ({
        ...l,
        id: newId(),
        date: targetDate,
        teacherId: keepTeachers ? l.teacherId : '',
        status: LessonStatus.UPCOMING,
      }));

      await Promise.all(newLessons.map(addLesson));
      setLessons(prev => [...prev, ...newLessons]);
      alert(`Successfully cloned ${newLessons.length} session(s) to ${targetDate}.`);
    },
    bulkDelete: async (ids) => {
      await Promise.all(ids.map(id => deleteLesson(id)));
      setLessons(prev => prev.filter(l => !ids.includes(l.id)));
    },

    bulkUpdateTeacher: async (ids, teacherId) => {
      const newTid = teacherId ?? '';
      const toUpdate = lessons.filter(l => ids.includes(l.id));
      await Promise.all(
        toUpdate.map(l => updateLesson({ ...l, teacherId: newTid }))
      );
      setLessons(prev =>
        prev.map(l => ids.includes(l.id) ? { ...l, teacherId: newTid } : l)
      );
    },
  };

  // ─── TEACHER ACTIONS ─────────────────────────────────────────────────────────

  const teacherActions: TeacherActions = {
    add: async () => {
      const newTeacher: Teacher = {
        id: newId(),
        firstName: 'New',
        lastName: 'Teacher',
        color: '#6366f1',
      };
      const saved = await addTeacher(newTeacher);
      setTeachers(prev => [...prev, saved]);
      return saved;
    },

    update: async (teacher) => {
      await updateTeacher(teacher);
      setTeachers(prev => prev.map(t => t.id === teacher.id ? teacher : t));
    },

    remove: async (id) => {
      await deleteTeacher(id);
      setTeachers(prev => prev.filter(t => t.id !== id));
    },
  };

  // ─── SCHOOL ACTIONS ──────────────────────────────────────────────────────────

  const schoolActions: SchoolActions = {
    add: async () => {
      const newSchool: School = {
        id: newId(),
        name: 'New School',
        address: '',
        sortOrder: schools.length,
      };
      const saved = await addSchool(newSchool);
      setSchools(prev => [...prev, saved]);
      return saved;
    },

    update: async (school) => {
      await updateSchool(school);
      setSchools(prev => prev.map(s => s.id === school.id ? school : s));
    },

    remove: async (id) => {
      await deleteSchool(id);
      setSchools(prev => prev.filter(s => s.id !== id));
    },
  };

  // ─── USER ACTIONS ────────────────────────────────────────────────────────────

  const userActions: UserActions = {
    save: async (userData, existingUsers) => {
      const isUpdate = existingUsers.some(u => u.id === userData.id);
      if (isUpdate) {
        const saved = await updateUser(userData as AppUser);
        setUsers(prev => prev.map(u => u.id === saved.id ? saved : u));
      } else {
        const saved = await addUser(userData as AppUser);
        setUsers(prev => [...prev, saved]);
      }
    },

    remove: async (id) => {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    },
  };

  return {
    lessons, teachers, schools, users,
    setLessons, setTeachers, setSchools, setUsers,
    isLoading, errors,
    lessonActions, teacherActions, schoolActions, userActions,
  };
}
