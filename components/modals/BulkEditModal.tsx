import React, { useState } from 'react';
import { Teacher } from '../../types';

interface BulkEditModalProps {
  selectedCount: number;
  teachers: Teacher[];
  onClose: () => void;
  onChangeTeacher: (teacherId: string | null) => Promise<void>;
  onDelete: () => Promise<void>;
}

/**
 * Модалка массового редактирования уроков.
 *
 * ABAP-аналогия: POPUP_WITH_TABLE — диалог подтверждения массового действия
 * над несколькими выбранными записями ALV (аналог MASS-транзакции).
 *
 * Два блока действий:
 *  1. Смена учителя (аналог MASS → поле TEACHER_ID → F4-Help → Apply)
 *  2. Удаление (аналог MASS → Delete → Confirm)
 */
const BulkEditModal: React.FC<BulkEditModalProps> = ({
  selectedCount,
  teachers,
  onClose,
  onChangeTeacher,
  onDelete,
}) => {
  // __keep__  = не менять учителя (нет действия)
  // __none__  = убрать учителя (teacherId = null)
  // <id>      = назначить конкретного учителя
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('__keep__');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChangeTeacher = async () => {
    if (selectedTeacherId === '__keep__') return;
    setIsLoading(true);
    try {
      const tid = selectedTeacherId === '__none__' ? null : selectedTeacherId;
      await onChangeTeacher(tid);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsLoading(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 lg:p-10 relative">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Change Lessons</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all"
          >
            <i className="fa-solid fa-xmark text-slate-400 text-xl"></i>
          </button>
        </div>

        {/* Selection count badge */}
        <div className="mb-6 px-4 py-3 bg-indigo-50 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <i className="fa-solid fa-check text-white text-xs"></i>
          </div>
          <p className="text-sm font-black text-indigo-700">
            {selectedCount} lesson{selectedCount !== 1 ? 's' : ''} selected
          </p>
        </div>

        {/* ── Change Teacher ── */}
        <div className="mb-4 p-5 bg-slate-50 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            <i className="fa-solid fa-user-tie mr-1.5"></i>Change Teacher
          </p>
          <select
            value={selectedTeacherId}
            onChange={e => setSelectedTeacherId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 text-sm mb-3 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="__keep__">— Keep current teacher —</option>
            <option value="__none__">No teacher (unassigned)</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </select>
          <button
            onClick={handleChangeTeacher}
            disabled={isLoading || selectedTeacherId === '__keep__'}
            className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest disabled:opacity-40 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <i className="fa-solid fa-user-pen"></i>
            )}
            Apply Teacher Change
          </button>
        </div>

        {/* ── Delete ── */}
        <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">
            <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>Danger Zone
          </p>
          {confirmDelete && (
            <p className="text-sm font-bold text-rose-700 mb-3 leading-relaxed">
              Are you sure? This will permanently delete{' '}
              <span className="font-black">{selectedCount} lesson{selectedCount !== 1 ? 's' : ''}</span>.
              This cannot be undone.
            </p>
          )}
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="w-full bg-rose-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest disabled:opacity-40 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <i className="fa-solid fa-trash"></i>
            )}
            {confirmDelete
              ? `Yes, Delete ${selectedCount} Lesson${selectedCount !== 1 ? 's' : ''}`
              : 'Delete Selected'}
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="mt-5 w-full text-center text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-colors py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BulkEditModal;
