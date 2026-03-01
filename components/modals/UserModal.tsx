import React from 'react';
import { AppUser, Teacher } from '../../types';

interface UserModalProps {
  user: Partial<AppUser>;
  users: AppUser[];
  teachers: Teacher[];
  onChange: (user: Partial<AppUser>) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Модалка создания / редактирования пользователя.
 * ABAP-аналогия: транзакция SU01 в упрощённом виде —
 * создание/изменение пользователя с привязкой к роли
 */
const UserModal: React.FC<UserModalProps> = ({
  user,
  users,
  teachers,
  onChange,
  onSave,
  onDelete,
  onClose,
}) => {
  const isEdit = !!user.id && users.some(u => u.id === user.id);

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-6 lg:p-8 relative">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {isEdit ? 'Edit User' : 'New User'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all"
          >
            <i className="fa-solid fa-xmark text-slate-400 text-xl"></i>
          </button>
        </div>

        {/* Form */}
        <form id="user-form" onSubmit={onSave} className="space-y-6">

          {/* Email */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <input
              type="email"
              required
              value={user.email ?? ''}
              onChange={e => onChange({ ...user, email: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
              placeholder="user@example.com"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
            <select
              required
              value={user.role ?? 'viewer'}
              onChange={e => onChange({ ...user, role: e.target.value as AppUser['role'] })}
              className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
            >
              <option value="admin">Administrator</option>
              <option value="teacher">Teacher</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {/* Linked Teacher */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Linked Teacher (Optional)</label>
            <select
              value={user.teacherId ?? ''}
              onChange={e => onChange({ ...user, teacherId: e.target.value || undefined })}
              className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
            >
              <option value="">No Teacher Link</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 ml-1 mt-1">Link to a teacher account for calendar access</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
            {isEdit ? (
              <button
                type="button"
                onClick={onDelete}
                className="w-full sm:w-auto text-rose-500 font-black hover:bg-rose-50 px-6 py-3 rounded-xl transition-all text-xs uppercase tracking-widest border border-transparent hover:border-rose-100"
              >
                Delete User
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}
            <button
              type="submit"
              className="w-full sm:flex-1 bg-indigo-600 text-white font-black py-3 rounded-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all text-xs uppercase tracking-widest"
            >
              Save User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
