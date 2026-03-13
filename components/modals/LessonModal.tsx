import React from 'react';
import { Lesson, Teacher, School } from '../../types';

interface LessonModalProps {
  lesson: Partial<Lesson>;
  lessons: Lesson[];
  teachers: Teacher[];
  schools: School[];
  addMinutes: (time: string, mins: number) => string;
  onChange: (lesson: Partial<Lesson>) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Модалка создания / редактирования урока.
 * ABAP-аналогия: POPUP с экраном ввода (аналог DYNPRO-подэкрана)
 */
const LessonModal: React.FC<LessonModalProps> = ({
  lesson,
  lessons,
  teachers,
  schools,
  addMinutes,
  onChange,
  onSave,
  onDelete,
  onClose,
}) => {
  const isEdit = !!lesson.id && lessons.some(l => l.id === lesson.id);

  return (
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      {/* Контейнер: на мобилке полная ширина, скруглён только сверху */}
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl lg:rounded-3xl shadow-2xl p-3 sm:p-4 lg:p-6 relative max-h-[92vh] overflow-y-auto custom-scrollbar">

        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
            {isEdit ? 'Edit Record' : 'New Class'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all"
          >
            <i className="fa-solid fa-xmark text-slate-400 text-base"></i>
          </button>
        </div>

        {/* Form — grid-cols-2 уже на мобилке!
            Было:  grid-cols-1 md:grid-cols-2
            Стало: grid-cols-2  (всегда 2 колонки)
            ABAP-аналогия: SY-LINSZ достаточно — поля можно поставить рядом */}
        <form
          id="lesson-form"
          onSubmit={onSave}
          className="grid grid-cols-2 gap-2 sm:gap-3"
        >
          {/* Teacher */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Faculty Member</label>
            <select
              required
              value={lesson.teacherId}
              onChange={e => onChange({ ...lesson, teacherId: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
            >
              <option value="">— Teacher</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
          </div>

          {/* School */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution</label>
            <select
              required
              value={lesson.schoolId}
              onChange={e => onChange({ ...lesson, schoolId: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
            >
              <option value="">— School</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade</label>
            <input
              value={lesson.grade}
              onChange={e => onChange({ ...lesson, grade: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
              placeholder="e.g. 10-A"
            />
          </div>

          {/* Date */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
            <input
              required
              type="date"
              value={lesson.date}
              onChange={e => onChange({ ...lesson, date: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
            />
          </div>

          {/* Room */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Room</label>
            <input
              value={lesson.room}
              onChange={e => onChange({ ...lesson, room: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
              placeholder="Room 302"
            />
          </div>

          {/* Corrected Duration */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration (min)</label>
            <input
              type="number"
              min="1"
              max="480"
              placeholder="60"
              value={lesson.correctedDuration ?? ''}
              onChange={e => onChange({
                ...lesson,
                correctedDuration: e.target.value !== '' ? Number(e.target.value) : undefined,
              })}
              className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
            />
          </div>

          {/* Start / End Time */}
          <div className="col-span-2 grid grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-0.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start</label>
              <input
                required
                type="time"
                step="300"
                value={lesson.startTime}
                onChange={e => {
                  const ns = e.target.value;
                  onChange({ ...lesson, startTime: ns, endTime: addMinutes(ns, 45) });
                }}
                className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 font-black text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-0.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End</label>
              <input
                required
                type="time"
                step="300"
                value={lesson.endTime}
                onChange={e => onChange({ ...lesson, endTime: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 font-black text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="col-span-2 space-y-0.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
            <textarea
              rows={2}
              value={lesson.notes}
              onChange={e => onChange({ ...lesson, notes: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 resize-none text-sm"
              placeholder="Additional details..."
            />
          </div>
        </form>

        {/* Actions — уменьшены отступы и высота кнопок
            Было:  mt-4 lg:mt-8  gap-4 lg:gap-6  py-4 lg:py-5  rounded-2xl lg:rounded-[2rem]
            Стало: mt-3          gap-3            py-2.5        rounded-xl
            ABAP-аналогия: кнопки в TOOLBAR без лишних отступов ────────────── */}
        {/* Кнопки — всегда в строку, Delete слева, Save справа
            ABAP-аналогия: TOOLBAR с кнопками LEFT/RIGHT без переноса */}
        <div className="flex flex-row justify-between items-center gap-2 mt-3">
          {isEdit ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-rose-500 font-black hover:bg-rose-50 px-4 py-2.5 rounded-xl transition-all text-xs uppercase tracking-widest border border-transparent hover:border-rose-100 shrink-0"
            >
              <i className="fa-solid fa-trash-can sm:mr-1"></i>
              <span className="hidden sm:inline">Delete</span>
            </button>
          ) : (
            <div />
          )}
          <button
            type="submit"
            form="lesson-form"
            className="flex-1 bg-indigo-600 text-white font-black py-2.5 rounded-xl shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-all text-xs uppercase tracking-widest"
          >
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonModal;
