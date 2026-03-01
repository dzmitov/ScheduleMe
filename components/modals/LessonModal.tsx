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
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] lg:rounded-[3.5rem] shadow-2xl p-6 lg:p-10 relative overflow-hidden max-h-[95vh] overflow-y-auto custom-scrollbar">

        {/* Header */}
        <div className="flex justify-between items-center mb-8 lg:mb-10">
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">
            {isEdit ? 'Edit Record' : 'New Class'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all"
          >
            <i className="fa-solid fa-xmark text-slate-400 text-xl"></i>
          </button>
        </div>

        {/* Form */}
        <form
          id="lesson-form"
          onSubmit={onSave}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"
        >
          {/* Teacher */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Faculty Member</label>
            <select
              required
              value={lesson.teacherId}
              onChange={e => onChange({ ...lesson, teacherId: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
            >
              <option value="">Select Personnel</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
          </div>

          {/* School */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution / Branch</label>
            <select
              required
              value={lesson.schoolId}
              onChange={e => onChange({ ...lesson, schoolId: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
            >
              <option value="">Select School</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade / Level</label>
            <input
              value={lesson.grade}
              onChange={e => onChange({ ...lesson, grade: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
              placeholder="e.g. Grade 10-A"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
            <input
              required
              type="date"
              value={lesson.date}
              onChange={e => onChange({ ...lesson, date: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
            />
          </div>

          {/* Room */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Assignment</label>
            <input
              value={lesson.room}
              onChange={e => onChange({ ...lesson, room: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
              placeholder="e.g. Room 302"
            />
          </div>

          {/* Start / End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
              <input
                required
                type="time"
                step="300"
                value={lesson.startTime}
                onChange={e => {
                  const ns = e.target.value;
                  onChange({ ...lesson, startTime: ns, endTime: addMinutes(ns, 45) });
                }}
                className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-4 py-3 lg:py-4 font-black text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label>
              <input
                required
                type="time"
                step="300"
                value={lesson.endTime}
                onChange={e => onChange({ ...lesson, endTime: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-4 py-3 lg:py-4 font-black text-sm"
              />
            </div>
          </div>

          {/* Corrected Duration */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Corrected Lesson Duration (min)
            </label>
            <input
              type="number"
              min="1"
              max="480"
              placeholder="e.g. 60"
              value={lesson.correctedDuration ?? ''}
              onChange={e => onChange({
                ...lesson,
                correctedDuration: e.target.value !== '' ? Number(e.target.value) : undefined,
              })}
              className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Notes / Topics</label>
            <textarea
              rows={2}
              value={lesson.notes}
              onChange={e => onChange({ ...lesson, notes: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 resize-none text-sm"
              placeholder="Additional details..."
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 lg:gap-6 mt-4 lg:mt-8">
          {isEdit ? (
            <button
              type="button"
              onClick={onDelete}
              className="w-full sm:w-auto text-rose-500 font-black hover:bg-rose-50 px-8 py-4 rounded-2xl lg:rounded-3xl transition-all text-xs uppercase tracking-widest border border-transparent hover:border-rose-100"
            >
              Delete Record
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}
          <button
            type="submit"
            form="lesson-form"
            className="w-full sm:flex-1 bg-indigo-600 text-white font-black py-4 lg:py-5 rounded-2xl lg:rounded-[2rem] shadow-2xl shadow-indigo-100 hover:scale-[1.02] transition-all text-xs uppercase tracking-widest"
          >
            Update Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonModal;
