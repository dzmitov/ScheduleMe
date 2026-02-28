import React from 'react';
import { SignOutButton } from '@clerk/clerk-react';

interface AccessDeniedProps {
  /** Email пользователя, которому отказано в доступе */
  email?: string;
}

/**
 * Экран "Доступ запрещён" — пользователь есть в Clerk, но нет в app_users.
 *
 * ABAP-аналогия: AUTHORITY-CHECK с MESSAGE e001(zauth).
 * Если прав нет — показываем сообщение и останавливаем программу.
 *
 * @example
 *   if (userRole.role === 'unauthorized') {
 *     return <AccessDenied email={user.primaryEmailAddress?.emailAddress} />;
 *   }
 */
const AccessDenied: React.FC<AccessDeniedProps> = ({ email }) => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="text-center max-w-md px-6">
        <i className="fa-solid fa-ban text-6xl text-red-400 mb-6"></i>
        <h1 className="text-3xl font-black text-slate-900 mb-3">Access Denied</h1>
        <p className="text-slate-500 font-medium mb-6">
          Your account{email && (
            <> (<strong className="text-slate-700">{email}</strong>)</>
          )}{' '}
          is not authorized to use this application.
          Please contact the administrator.
        </p>
        <SignOutButton>
          <button className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-slate-700 transition-all">
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
};

export default AccessDenied;
