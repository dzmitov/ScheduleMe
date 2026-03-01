import React from 'react';

interface CopyDayModalProps {
  focusedDay: Date;
  copyDayTargetDate: string;
  copyKeepTeachers: boolean;
  onTargetDateChange: (date: string) => void;
  onKeepTeachersChange: (keep: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Модалка клонирования одного дня.
 * ABAP-аналогия: POPUP_TO_CONFIRM с выбором даты назначения
 */
const CopyDayModal: React.FC<CopyDayModalProps> = ({
  focusedDay,
  copyDayTargetDate,
  copyKeepTeachers,
  onTargetDateChange,
  onKeepTeachersChange,
  onConfirm,
  onClose,
}) => {
  const sourceDateLabel = focusedDay.toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 lg:p-10 relative">
        <h2 className="text-2xl font-black text-slate-800 mb-4">Clone Day</h2>

        {/* Источник */}
        <div className="mb-4 p-4 bg-indigo-50 rounded-2xl">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Copying FROM</p>
          <p className="text-sm font-bold text-indigo-700">{sourceDateLabel}</p>
        </div>

        {/* Цель */}
        <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Copy TO</p>
          <input
            type="date"
            value={copyDayTargetDate}
            onChange={e => onTargetDateChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
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

export default CopyDayModal;
