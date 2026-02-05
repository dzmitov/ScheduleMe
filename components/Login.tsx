
import React from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 p-10 border border-slate-100 animate-fadeIn">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200 mb-6">
            <i className="fa-solid fa-graduation-cap text-white text-4xl"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">ScheduleMe</h1>
          <p className="text-slate-500 mt-2">Choose your access level to continue</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onLogin({ id: 'admin-1', name: 'Admin User', role: 'admin' })}
            className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <i className="fa-solid fa-shield-halved text-xl"></i>
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800">Administrator</p>
                <p className="text-sm text-slate-500">Manage schedules & reports</p>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all"></i>
          </button>

          <button
            onClick={() => onLogin({ id: 'user-1', name: 'Teacher User', role: 'user' })}
            className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <i className="fa-solid fa-user-tie text-xl"></i>
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800">Teacher</p>
                <p className="text-sm text-slate-500">View schedule & resources</p>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all"></i>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          By logging in, you agree to our <span className="underline cursor-pointer">Terms of Service</span>
        </p>
      </div>
    </div>
  );
};

export default Login;