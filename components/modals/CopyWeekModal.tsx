import React from 'react';
import { getStartOfWeek } from '../../src/utils/dateUtils';

interface CopyWeekModalProps {
  currentWeekOffset: number;
  copyTargetWeekOffset: number;
  copyKeepTeachers: boolean;
  onTargetOffsetChange: (offset: number) => void;
  onKeepTeachersChange: (keep: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Модалка клонирования недели.
 * ABAP-аналогия: POPUP_TO_CONFIRM с выбором параметров копирования
 */
const CopyWeekModal: React.FC<CopyWeekModalProps> = ({
  currentWeekOffset,
  copyTargetWeekOffset,
  copyKeepTeachers,
  onTargetOffsetChange,
  onKeepTeachersChange,
  onConfirm,
  onClose,
}) => {
  const sourceStart = getStartOfWeek(currentWeekOffset);
  const sourceEnd   = getStartOfWeek(currentWeekOffset);
  sourceEnd.setDate(sourceEnd.getDate() + 5);

  const targetStart = getStartOfWeek(copyTargetWeekOffset);
  const targetEnd   = getStartOfWeek(copyTargetWeekOffset);
  targetEnd.setDate(targetEnd.getDate() + 5);

  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString('en-US', opts);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 lg:p-10 relative">
        <h2 className="text-2xl font-black text-slate-800 mb-4">Clone Roadmap</h2>

        {/* Источник */}
        <div className="mb-4 p-4 bg-indigo-50 rounded-2xl">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Copying FROM</p>
          <p className="text-sm font-bold text-indigo-700">
            {fmt(sourceStart, { month: 'short', day: 'numeric' })}
            {' — '}
            {fmt(sourceEnd, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Цель */}
        <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Copy TO</p>
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => onTargetOffsetChange(copyTargetWeekOffset - 1)}
              disabled={copyTargetWeekOffset <= currentWeekOffset + 1}
              className="w-9 h-9 flex items-center justify-center bg-white rounded-xl border border-slate-200 hover:border-indigo-400 disabled:opacity-30 transition-all"
            >
              <i className="fa-solid fa-chevron-left text-slate-500 text-xs"></i>
            </button>
            <div className="text-center flex-1">
              <p className="text-sm font-black text-slate-800">
                {fmt(targetStart, { month: 'short', day: 'numeric' })}
                {' — '}
                {fmt(targetEnd, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {copyTargetWeekOffset === currentWeekOffset + 1
                  ? 'Next week'
                  : `Week +${copyTargetWeekOffset - currentWeekOffset}`}
              </p>
            </div>
            <button
              onClick={() => onTargetOffsetChange(copyTargetWeekOffset + 1)}
              className="w-9 h-9 flex items-center justify-center bg-white rounded-xl border border-slate-200 hover:border-indigo-400 transition-all"
            >
              <i className="fa-solid fa-chevron-right text-slate-500 text-xs"></i>
            </button>
          </div>
        </div>

        <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer border-2 border-transparent hover:border-indigo-100 transition-all mb-8">
          <input
            type="checkbox"
            checked={copyKeepTeachers}
            onChange={e => onKeepTeachersChange(e.target.checked)}
            className="w-6 h-6 rounded-lg text-indigo-600 focus:ring-indigo-500"
          />
          <span className="font-bold text-slate-700 text-sm">Transfer staff assignments</span>
        </label>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-4 text-slate-400 font-black hover:bg-slate-50 rounded-2xl text-xs uppercase tracking-widest transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all text-xs uppercase tracking-widest"
          >
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
};

export default CopyWeekModal;
