import React from 'react';
import { Link } from 'react-router-dom'; 
import { SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { user, isSignedIn } = useUser();
  
  // Admin check: only dzmitov@gmail.com is admin
  const isAdmin = user?.primaryEmailAddress?.emailAddress === 'dzmitov@gmail.com';
  
  // If not signed in, show sign-in button
  if (!isSignedIn || !user) {
    return (
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-[100]">
        <div className="p-6 flex items-center gap-3">
          <div className="flex items-center justify-center min-w-[32px] text-indigo-600">
            <i className="fa-solid fa-graduation-cap text-3xl"></i>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800 whitespace-nowrap opacity-0 lg:opacity-100">
            ScheduleMe
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <SignInButton mode="modal">
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
              Sign In
            </button>
          </SignInButton>
        </div>
      </aside>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', roles: ['admin', 'user'] },
    { id: 'schedule', label: 'Schedule', icon: 'fa-calendar-days', roles: ['admin', 'user'] },
    { id: 'admin-manage', label: 'Lesson Feed', icon: 'fa-list-check', roles: ['admin'] },
    { id: 'reports', label: 'Analytics', icon: 'fa-chart-pie', roles: ['admin'] },
//    { id: 'ai-planner', label: 'AI Planner', icon: 'fa-wand-magic-sparkles', roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: 'fa-gears', roles: ['admin'] },
  ];
  
  const userRole = isAdmin ? 'admin' : 'user';
  const userName = user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || 'User';

  return (
    <aside className="group/sidebar w-20 lg:w-64 hover:w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 transition-[width] duration-300 ease-in-out z-[100] overflow-hidden">
      <div className="p-6 flex items-center gap-3">
        <div className="flex items-center justify-center min-w-[32px] text-indigo-600">
          <i className="fa-solid fa-graduation-cap text-3xl"></i>
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800 whitespace-nowrap opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity duration-300">
          ScheduleMe
        </span>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-hidden">
        {navItems.filter(item => item.roles.includes(userRole)).map((item) => (
          <Link
            key={item.id}
            // onClick={() => onViewChange(item.id as ViewType)}
            to={`/${item.id}`} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group/item ${
              currentView === item.id 
                ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-500'
            }`}
          >
            <div className="flex items-center justify-center min-w-[24px]">
              <i className={`fa-solid ${item.icon} text-lg ${currentView === item.id ? 'text-indigo-600' : 'group-hover/item:scale-110'}`}></i>
            </div>
            <span className="whitespace-nowrap opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity duration-300">
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 flex flex-col gap-3 overflow-hidden">
        <div className="bg-indigo-600 text-white p-3 lg:p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-indigo-200">
          <UserButton 
            appearance={{
              elements: {
                avatarBox: "min-w-[40px] h-10 rounded-full"
              }
            }}
          />
          <div className="overflow-hidden whitespace-nowrap opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity duration-300">
            <p className="text-sm font-semibold truncate">{userName}</p>
            <p className="text-xs text-indigo-100 opacity-80 capitalize">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
