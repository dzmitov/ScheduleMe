
import React from 'react';
import { Lesson, Teacher, School } from '../types';

interface LessonCardProps {
  lesson: Lesson;
  teachers: Teacher[];
  schools: School[];
  isAdmin?: boolean;
  onEdit?: (lesson: Lesson) => void;
  compact?: boolean;
}

const LessonCard: React.FC<LessonCardProps> = ({ lesson, teachers, schools, isAdmin, onEdit, compact }) => {
  const teacher = teachers.find(t => t.id === lesson.teacherId);
  const school = schools.find(s => s.id === lesson.schoolId);

  const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned';
  const teacherColor = teacher?.color || '#cbd5e1';

  if (compact) {
    return (
      <div 
        onClick={() => isAdmin && onEdit?.(lesson)}
        className="bg-white rounded-lg border border-slate-100 shadow-sm transition-all p-2.5 flex items-center gap-3 relative cursor-pointer active:scale-95"
        style={{ borderLeft: `3px solid ${teacherColor}` }}
      >
        <div className="w-10 shrink-0">
          <p className="text-[10px] font-black text-slate-400 font-mono leading-none">
            {lesson.startTime}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-slate-800 truncate">
              {teacher?.lastName || 'TBA'}
            </p>
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter truncate opacity-70">
              {school?.name || 'Unit'}
            </span>
          </div>
          <p className="text-[9px] font-medium text-slate-400 truncate mt-0.5">
            {lesson.grade} • Room {lesson.room}
          </p>
        </div>
        <div className="shrink-0 text-slate-300">
          <i className="fa-solid fa-chevron-right text-[8px]"></i>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3 relative group" 
      style={{ borderLeft: `6px solid ${teacherColor}` }}
    >
      <div className="flex justify-between items-start">
        <div className="pr-8">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
            {school?.name || 'Academic Unit'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-black text-slate-700">{lesson.startTime} - {lesson.endTime}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <i className="fa-solid fa-user-tie text-indigo-400 w-4"></i>
          <span className="font-bold" style={{ color: teacherColor }}>{teacherName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <i className="fa-solid fa-users text-indigo-400 w-4"></i>
          <span className="font-medium">{lesson.grade || 'No Class'} • <span className="font-black text-slate-400">R-{lesson.room}</span></span>
        </div>
      </div>

      {lesson.notes && (
        <div className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded-xl border border-slate-100 mt-1">
          {lesson.notes}
        </div>
      )}

      {isAdmin && (
        <button 
          onClick={() => onEdit?.(lesson)}
          className="absolute top-4 right-4 bg-slate-100 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          title="Edit"
        >
          <i className="fa-solid fa-pen-to-square text-xs"></i>
        </button>
      )}
    </div>
  );
};

export default LessonCard;
