import React from 'react';
import { Lesson, Teacher, School } from '../types';

interface LessonCardProps {
  lesson: Lesson;
  teachers: Teacher[];
  schools: School[];
  isAdmin?: boolean;
  onEdit?: (lesson: Lesson) => void;
  compact?: boolean;
  // ── Режим массового редактирования ──────────────────────────────────────────
  // ABAP-аналогия: ALV с SET_TABLE_FOR_FIRST_DISPLAY и is_layout-sel_mode = 'A'
  // isEditMode = true  → режим выбора включён (чекбоксы видны)
  // isSelected        → эта строка выбрана (аналог FIELDCAT-SELTEXT / MARK)
  // onToggleSelect    → клик по чекбоксу (аналог AT LINE-SELECTION)
  isEditMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  teachers,
  schools,
  isAdmin,
  onEdit,
  compact,
  isEditMode,
  isSelected,
  onToggleSelect,
}) => {
  const teacher = teachers.find(t => t.id === lesson.teacherId);
  const school = schools.find(s => s.id === lesson.schoolId);

  const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned';
  const teacherColor = teacher?.color || '#cbd5e1';

  // Обработчик клика по карточке:
  // В режиме editMode — переключаем выбор (toggle), иначе открываем редактирование
  // ABAP-аналогия: USER-COMMAND 'PICK' vs USER-COMMAND 'MARK'
  const handleCardClick = () => {
    if (isEditMode) {
      onToggleSelect?.(lesson.id);
    } else if (isAdmin) {
      onEdit?.(lesson);
    }
  };

  if (compact) {
    return (
      <div
        onClick={handleCardClick}
        className={`bg-white rounded-lg border shadow-sm transition-all p-1.5 flex items-center gap-2 relative cursor-pointer active:scale-95 ${
          isEditMode && isSelected
            ? 'border-indigo-400 bg-indigo-50/60 shadow-indigo-100'
            : 'border-slate-100'
        }`}
        style={{ borderLeft: `3px solid ${isEditMode && isSelected ? '#6366f1' : teacherColor}` }}
      >
        {/* Чекбокс в режиме editMode */}
        {isEditMode && (
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
            isSelected
              ? 'bg-indigo-600 border-indigo-600'
              : 'border-slate-300 bg-white'
          }`}>
            {isSelected && <i className="fa-solid fa-check text-white text-[7px]"></i>}
          </div>
        )}
        <div className="w-14 shrink-0">
          <p className="text-[8px] font-black text-slate-700 font-mono leading-none">
            {lesson.startTime}
          </p>
          <p className="text-[7px] font-medium text-slate-400 font-mono leading-none mt-0.5">
            {lesson.endTime}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[10px] font-bold text-slate-800 truncate">
              {teacher?.lastName || 'TBA'}
            </p>
            <span className="text-[7px] font-black text-indigo-600 uppercase tracking-tighter truncate opacity-70">
              {school?.name || 'Unit'}
            </span>
          </div>
          <p className="text-[7px] font-medium text-slate-400 truncate">
            {lesson.grade} • {lesson.room}
          </p>
        </div>
        {!isEditMode && (
          <div className="shrink-0 text-slate-300">
            <i className="fa-solid fa-chevron-right text-[7px]"></i>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={isEditMode ? handleCardClick : undefined}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-3 flex flex-col gap-2 relative group ${
        isEditMode ? 'cursor-pointer' : ''
      } ${
        isEditMode && isSelected
          ? 'border-indigo-400 bg-indigo-50/40 shadow-indigo-100'
          : 'border-slate-100'
      }`}
      style={{ borderLeft: `4px solid ${isEditMode && isSelected ? '#6366f1' : teacherColor}` }}
    >
      {/* Чекбокс в режиме editMode (полная карточка) */}
      {isEditMode && (
        <div className="absolute top-3 right-3 z-10">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-indigo-600 border-indigo-600'
              : 'border-slate-300 bg-white'
          }`}>
            {isSelected && <i className="fa-solid fa-check text-white text-[9px]"></i>}
          </div>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="pr-6">
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
            {school?.name || 'Academic Unit'}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-sm font-black text-slate-700">{lesson.startTime} - {lesson.endTime}</span>
          </div>
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 min-w-0">
            <i className="fa-solid fa-user-tie text-indigo-400 w-3.5 shrink-0"></i>
            <span className="font-bold truncate" style={{ color: teacherColor }}>{teacherName}</span>
          </div>
          {lesson.grade && (
            <span className="font-black text-slate-500 text-[10px] shrink-0">{lesson.grade}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <i className="fa-solid fa-users text-indigo-400 w-3.5"></i>
          <span className="font-medium"><span className="font-black text-slate-400">{lesson.room}</span></span>
        </div>
      </div>

      {lesson.notes && (
        <div className="text-[9px] text-slate-400 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          {lesson.notes}
        </div>
      )}

      {/* Кнопка редактирования — скрыта в режиме editMode */}
      {isAdmin && !isEditMode && (
        <button
          onClick={e => { e.stopPropagation(); onEdit?.(lesson); }}
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
