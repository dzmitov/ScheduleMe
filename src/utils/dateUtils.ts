/**
 * Утилиты для работы с датами.
 *
 * ABAP-аналогия: Function Group ZDATE_UTILS с набором функций
 * типа CONVERT_DATE_TO_INTERNAL / FORMAT_DATE и т.д.
 */

/**
 * Преобразует объект Date в строку формата YYYY-MM-DD
 * используя ЛОКАЛЬНЫЙ часовой пояс (не UTC).
 *
 * ABAP-аналогия:
 *   WRITE sy-datum TO lv_date_str USING EDIT MASK '____-__-__'.
 *
 * @example
 *   toLocalDateStr(new Date()) // '2025-02-27'
 */
export const toLocalDateStr = (d: Date): string => {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Возвращает дату начала недели (понедельник) с учётом смещения.
 *
 * ABAP-аналогия:
 *   CALL FUNCTION 'DATE_GET_WEEK' / ручной расчёт через SY-DATUM
 *
 * @param weekOffset - смещение недель от текущей (0 = текущая, 1 = следующая, -1 = прошлая)
 */
export const getStartOfWeek = (weekOffset: number = 0): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  // Смещаем к понедельнику: если сегодня воскресенье (0) → -6, иначе → -(dayOfWeek - 1)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

/**
 * Возвращает массив дат рабочей недели (Пн–Сб) для заданного смещения.
 *
 * ABAP-аналогия: LOOP с COMPUTE или таблица рабочих дней
 *
 * @param weekOffset - смещение недель (0 = текущая)
 * @param daysCount  - количество дней (по умолчанию 6: Пн–Сб)
 */
export const getWeekDays = (weekOffset: number = 0, daysCount: number = 6): Date[] => {
  const start = getStartOfWeek(weekOffset);
  return Array.from({ length: daysCount }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

/**
 * Проверяет, является ли дата сегодняшним днём.
 *
 * ABAP-аналогия: IF lv_date = sy-datum.
 */
export const isToday = (date: Date): boolean => {
  return toLocalDateStr(date) === toLocalDateStr(new Date());
};

/**
 * Вычисляет продолжительность урока в минутах по строкам времени.
 *
 * ABAP-аналогия: расчёт через COMPUTE TIME
 *
 * @param startTime - строка 'HH:mm'
 * @param endTime   - строка 'HH:mm'
 */
export const calcDurationMinutes = (startTime: string, endTime: string): number => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
};
