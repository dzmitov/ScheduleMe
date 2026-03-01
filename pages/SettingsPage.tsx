import React, { useState } from 'react';
import { Teacher, School, AppUser } from '../../types';

interface SettingsPageProps {
  teachers: Teacher[];
  schools: School[];
  users: AppUser[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  setSchools: React.Dispatch<React.SetStateAction<School[]>>;
  teacherActions: {
    add: () => Promise<Teacher>;
    update: (t: Teacher) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
  schoolActions: {
    add: () => Promise<School>;
    update: (s: School) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
  onAddUser: () => void;
  onEditUser: (user: AppUser) => void;
}

/**
 * Страница Settings — управление преподавателями, школами, пользователями.
 * ABAP-аналогия: транзакция настройки справочников (SM30 / кастомные Z-транзакции).
 * Аккордеон — аналог SectionBox в SAP Fiori Elements.
 */
const SettingsPage: React.FC<SettingsPageProps> = ({
  teachers,
  schools,
  users,
  setTeachers,
  setSchools,
  teacherActions,
  schoolActions,
  onAddUser,
  onEditUser,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    faculty: false,
    schools: false,
    users: false,
  });

  const toggle = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const sections = [
    {
      key: 'faculty',
      icon: 'fa-chalkboard-user',
      label: 'Faculty',
      badge: teachers.length,
      action: (
        <button
          onClick={() => teacherActions.add()}
          className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest"
        >
          + STAFF
        </button>
      ),
      content: (
        <div className="divide-y divide-slate-50">
          {teachers.map(t => (
            <div key={t.id} className="p-4 lg:p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
              <input
                type="color"
                value={t.color}
                onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, color: e.target.value } : item))}
                onBlur={() => teacherActions.update(t)}
                className="w-8 h-8 rounded-lg border-none cursor-pointer"
              />
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input
                  value={t.firstName}
                  onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, firstName: e.target.value } : item))}
                  onBlur={() => teacherActions.update(t)}
                  className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="First name"
                />
                <input
                  value={t.lastName}
                  onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, lastName: e.target.value } : item))}
                  onBlur={() => teacherActions.update(t)}
                  className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Last name"
                />
              </div>
              <button
                onClick={() => teacherActions.remove(t.id)}
                className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors"
              >
                <i className="fa-solid fa-trash-can text-sm"></i>
              </button>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'schools',
      icon: 'fa-school',
      label: 'Schools',
      badge: schools.length,
      action: (
        <button
          onClick={() => schoolActions.add()}
          className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest"
        >
          + SCHOOL
        </button>
      ),
      content: (
        <div className="divide-y divide-slate-50">
          {schools.map(s => (
            <div key={s.id} className="p-4 lg:p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex-1 space-y-2">
                <input
                  value={s.name}
                  onChange={e => setSchools(prev => prev.map(item => item.id === s.id ? { ...item, name: e.target.value } : item))}
                  onBlur={() => schoolActions.update(s)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="School name"
                />
                <input
                  value={s.address || ''}
                  onChange={e => setSchools(prev => prev.map(item => item.id === s.id ? { ...item, address: e.target.value } : item))}
                  onBlur={() => schoolActions.update(s)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-xs text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Address (optional)"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Order</span>
                <input
                  type="number"
                  value={s.sortOrder ?? 0}
                  onChange={e => setSchools(prev => prev.map(item => item.id === s.id ? { ...item, sortOrder: parseInt(e.target.value) || 0 } : item))}
                  onBlur={() => schoolActions.update(s)}
                  className="w-16 bg-slate-50 border-none rounded-lg px-2 py-2 text-sm font-bold text-slate-700 outline-none text-center"
                />
              </div>
              <button
                onClick={() => schoolActions.remove(s.id)}
                className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors"
              >
                <i className="fa-solid fa-trash-can text-sm"></i>
              </button>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'users',
      icon: 'fa-users',
      label: 'User Access',
      badge: users.length,
      action: (
        <button
          onClick={onAddUser}
          className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest"
        >
          + USER
        </button>
      ),
      content: (
        <div>
          <div className="p-3 bg-slate-50 border-b border-slate-100 grid grid-cols-12 gap-4">
            <div className="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</div>
            <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</div>
            <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</div>
            <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Edit</div>
          </div>
          <div className="divide-y divide-slate-50">
            {users.map(user => (
              <div key={user.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-5 font-medium text-slate-700 truncate text-sm">{user.email}</div>
                  <div className="col-span-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-indigo-100 text-indigo-800'
                        : user.role === 'teacher'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-800'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Teacher' : 'Viewer'}
                    </span>
                  </div>
                  <div className="col-span-3 text-sm text-slate-500 truncate">{user.teacherName || '-'}</div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => onEditUser(user)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No users yet.</div>
            )}
          </div>
        </div>
      ),
    },
  ] as const;

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2 pb-20 space-y-4">
      <header className="mb-6">
        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 font-medium">Manage faculty, academic branches, and user access.</p>
      </header>

      {sections.map(({ key, icon, label, badge, action, content }) => (
        <div key={key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => toggle(key)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <i className={`fa-solid ${icon} text-indigo-600`}></i>
              </div>
              <span className="text-lg font-black text-slate-800">{label}</span>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{badge}</span>
            </div>
            <div className="flex items-center gap-4">
              <span onClick={e => e.stopPropagation()}>{action}</span>
              <i className={`fa-solid fa-chevron-down text-slate-400 transition-transform duration-200 ${openSections[key] ? 'rotate-180' : ''}`}></i>
            </div>
          </button>
          {openSections[key] && (
            <div className="border-t border-slate-100">{content}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SettingsPage;
