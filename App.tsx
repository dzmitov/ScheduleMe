
import React, { useState, useEffect, useMemo } from 'react';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import Sidebar from './components/Sidebar';
import LessonCard from './components/LessonCard';
import TeacherHoursReport from './components/TeacherHoursReport';
import { Lesson, LessonStatus, ViewType, Teacher, School, AppUser } from './types';
import { useUserRole } from './src/hooks/useUserRole';
import { useAppData } from './src/hooks/useAppData';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingScreen from './components/layout/LoadingScreen';
import AccessDenied from './components/layout/AccessDenied';
import { toLocalDateStr, getStartOfWeek, getWeekDays } from './src/utils/dateUtils';
import CopyWeekModal from './components/modals/CopyWeekModal';
import CopyDayModal from './components/modals/CopyDayModal';
import LessonModal from './components/modals/LessonModal';
import UserModal from './components/modals/UserModal';


const App: React.FC = () => {
  const { user, isSignedIn, isLoaded } = useUser();
  // const [view, setView] = useState<ViewType>('dashboard');
  const navigate = useNavigate();       // инструмент для смены URL
  const location = useLocation();       // читаем текущий URL

  const view = (location.pathname.slice(1) || 'dashboard') as ViewType;
  const setView = (v: ViewType) => navigate(`/${v}`);

  const [openSettingsSections, setOpenSettingsSections] = useState<Record<string, boolean>>({
    faculty: false,
    schools: false,
    users: false,
  });
  const toggleSettingsSection = (key: string) =>
    setOpenSettingsSections(prev => ({ ...prev, [key]: !prev[key] }));

  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedDay, setFocusedDay] = useState<Date | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [isCopyWeekModalOpen, setIsCopyWeekModalOpen] = useState(false);
  const [copyKeepTeachers, setCopyKeepTeachers] = useState(true);
  const [copyTargetWeekOffset, setCopyTargetWeekOffset] = useState(1);
  const [isCopyDayModalOpen, setIsCopyDayModalOpen] = useState(false);
  const [copyDayTargetDate, setCopyDayTargetDate] = useState<string>('');
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { userRole, isAdmin, defaultTeacherFilter } = useUserRole();
  const [dashboardTeacherFilter, setDashboardTeacherFilter] = useState<string>(defaultTeacherFilter);

  const {
    lessons, teachers, schools, users,
    setLessons, setTeachers, setSchools, setUsers,
    isLoading, errors,
    lessonActions, teacherActions, schoolActions, userActions,
  } = useAppData();

  const stats = useMemo(() => ({ total: lessons.length }), [lessons]);

  const dashboardDayGroups = useMemo(() => {
    const todayStr = toLocalDateStr(new Date());

    const filtered = [...lessons]
      .filter(l => {
        if (l.date < todayStr) return false; // только сегодня и будущее
        if (defaultTeacherFilter !== 'all' && l.teacherId !== defaultTeacherFilter) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    // Группируем по дате
    const groups: { date: string; lessons: Lesson[] }[] = [];
    for (const lesson of filtered) {
      const last = groups[groups.length - 1];
      if (last && last.date === lesson.date) {
        last.lessons.push(lesson);
      } else {
        if (groups.length >= 5) break; // берём только 5 ближайших дней с уроками
        groups.push({ date: lesson.date, lessons: [lesson] });
      }
    }
    return groups;
  }, [lessons, defaultTeacherFilter]);

  const weekDays = useMemo(() => getWeekDays(currentWeekOffset), [currentWeekOffset]);

  const addMinutes = (time: string, mins: number) => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + mins);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getEffectiveHour = (startTime: string): number => {
    const h = parseInt(startTime.split(':')[0]);
    return h < 8 ? 8 : h;  // если раньше 8:00 — "прижимаем" к слоту 08:00
  };

  const openEditModal = (lesson?: Lesson, initialData?: Partial<Lesson>) => {
    if (!isAdmin) return;
    const startTime = initialData?.startTime || '09:00';
    let targetSchoolId = initialData?.schoolId || (selectedSchoolId !== 'all' ? selectedSchoolId : schools[0]?.id) || '';
    if (targetSchoolId && !schools.some(s => s.id === targetSchoolId)) {
      targetSchoolId = schools[0]?.id || '';
    }

    setEditingLesson(lesson || {
      id: Math.random().toString(36).substr(2, 9),
      subject: 'English',
      grade: '',
      teacherId: initialData?.teacherId || (selectedTeacherId !== 'all' ? selectedTeacherId : teachers[0]?.id || ''),
      schoolId: targetSchoolId,
      date: initialData?.date || (focusedDay ? toLocalDateStr(focusedDay) : toLocalDateStr(new Date())),
      startTime: startTime,
      endTime: addMinutes(startTime, 45),
      room: initialData?.room || '',
      status: LessonStatus.UPCOMING,
      notes: '',
      ...initialData
    });
    setIsModalOpen(true);
  };

  // Show loading state while Clerk is initializing
  if (!isLoaded) return <LoadingScreen />;

  // If not signed in, show the sidebar with sign-in button
  if (!isSignedIn || !user) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
        <Sidebar currentView={view} onViewChange={setView} />
        <main className="flex-1 flex items-center justify-center p-12">
          <div className="text-center max-w-md">
            <i className="fa-solid fa-graduation-cap text-6xl text-indigo-600 mb-6"></i>
            <h1 className="text-4xl font-black text-slate-900 mb-4">Welcome to ScheduleMe</h1>
            <p className="text-slate-600 font-medium mb-8">Please sign in to access your schedule and manage lessons.</p>
          </div>
        </main>
      </div>
    );
  }

  // НОВЫЙ БЛОК: залогинен в Clerk, но роль ещё загружается
  if (userRole === null) return <LoadingScreen message="Checking access..." />;

  // НОВЫЙ БЛОК: в Clerk есть, в app_users нет → доступ запрещён
  if (userRole.role === 'unauthorized') {
    return <AccessDenied email={user.primaryEmailAddress?.emailAddress} />;
  }

  const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

  const renderDailyTimetable = (day: Date) => {
    const dateStr = toLocalDateStr(day);
    if (isMobile) {
      return (
        <div className="flex-1 flex flex-col min-h-0 animate-fadeIn space-y-2">
          <div className="grid grid-cols-2 gap-1.5 shrink-0">
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Branch</label>
              <select value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm">
                <option value="all">All Units</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Staff</label>
              <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm">
                <option value="all">All Faculty</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.lastName}, {t.firstName[0]}.</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {timeSlots.map(time => {
              const hour = parseInt(time.split(':')[0]);
              const timeLessons = lessons.filter(l => l.date === dateStr && getEffectiveHour(l.startTime) === hour && (selectedSchoolId === 'all' || l.schoolId === selectedSchoolId) && (selectedTeacherId === 'all' || l.teacherId === selectedTeacherId));
              if (timeLessons.length === 0 && !isAdmin) return null;
              return (
                <div key={time} className="flex gap-1.5">
                  <div className="w-7 text-right shrink-0 pt-1"><span className="text-[8px] font-black text-slate-400 font-mono">{time}</span></div>
                  <div className="flex-1 space-y-1">
                    {timeLessons.map(l => <LessonCard key={l.id} lesson={l} teachers={teachers} schools={schools} isAdmin={isAdmin} compact={true} onEdit={openEditModal} />)}
                    {isAdmin && (
                      <button onClick={() => openEditModal(undefined, { date: dateStr, startTime: time })} className="w-full h-6 border border-dashed border-slate-100 rounded-md flex items-center justify-center text-slate-300 text-[7px] font-black hover:border-indigo-100 hover:text-indigo-400 transition-all">
                        <i className="fa-solid fa-plus mr-0.5"></i> {timeLessons.length > 0 ? 'ADD MORE' : `ADD AT ${time}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    const filteredSchools = (selectedSchoolId === 'all' ? schools : schools.filter(s => s.id === selectedSchoolId))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));  // ← ДОБАВЛЕНА СОРТИРОВКА
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex-1 flex flex-col min-h-0 animate-fadeIn">
        <div className="overflow-auto flex-1 relative custom-scrollbar">
          {/* <table className="w-full border-collapse table-fixed min-w-[800px]"> */}
          <table className="border-collapse table-auto w-max">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky top-0 left-0 z-50 w-16 p-2 text-[9px] font-black text-slate-800 uppercase tracking-widest text-center border-r border-b border-slate-200 bg-slate-50 shadow-[2px_0_0_0_#e2e8f0]">TIME</th>
                {filteredSchools.map(school => (
                  <th key={school.id} className="sticky top-0 z-40 p-2 border-l border-b border-slate-200 bg-slate-50">
                    <div className="flex flex-col items-center"><span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest truncate max-w-full" title={school.name}>{school.name}</span></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time} className="group border-b border-slate-100 last:border-0">
                  <td className="sticky left-0 z-30 p-2 text-[10px] font-black text-slate-400 text-center bg-slate-50/50 backdrop-blur-sm font-mono border-r border-slate-200 shadow-[2px_0_0_0_#e2e8f0]">{time}</td>
                  {filteredSchools.map(school => {
                    const hour = parseInt(time.split(':')[0]);
                    const cellLessons = lessons.filter(l =>
                      l.date === dateStr &&
                      getEffectiveHour(l.startTime) === hour &&
                      l.schoolId === school.id &&
                      (selectedTeacherId === 'all' || l.teacherId === selectedTeacherId)
                    );
                    return (
                      <td key={`${school.id}-${time}`} className="p-1 border-l border-slate-100 relative align-top hover:bg-slate-50/40 group/cell transition-colors cursor-pointer" onClick={() => openEditModal(undefined, { date: dateStr, startTime: time, schoolId: school.id })}>
                        <div className="flex flex-col gap-1 h-full min-h-[45px]">
                          {cellLessons.map(l => {
                            const t = teachers.find(teacher => teacher.id === l.teacherId);
                            return (
                              <div key={l.id} onClick={(e) => { e.stopPropagation(); openEditModal(l); }} className="p-1.5 rounded-lg border-l-3 shadow-sm transition-all hover:scale-[1.02] active:scale-95 group/card" style={{ backgroundColor: `${t?.color || '#6366f1'}15`, borderLeftColor: t?.color || '#cbd5e1' }}>
                                <div className="flex justify-between items-start"><p className="text-[9px] font-black leading-tight text-slate-800 truncate" title={t ? `${t.firstName} ${t.lastName}` : 'TBA'}>{t ? t.lastName : 'TBA'}</p>{l.grade && <p className="text-[9px] font-black text-slate-500 shrink-0 ml-1">{l.grade}</p>}</div>
                                <div className="flex flex-wrap items-center justify-between gap-x-1"><p className="text-[8px] font-black text-slate-400 whitespace-nowrap">{l.startTime} – {l.endTime}</p><p className="text-[7px] font-bold text-slate-400">{l.room}</p></div>
                              </div>
                            );
                          })}
                          {isAdmin && <div className="opacity-0 group-hover/cell:opacity-100 flex items-center justify-center p-1 border border-dashed border-slate-200 rounded-lg text-slate-300 text-[7px] font-black transition-all hover:border-indigo-300 hover:text-indigo-400"><i className="fa-solid fa-plus"></i></div>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // const renderWeeklyTimetable = () => {
  //   const dayConfigs = weekDays.map(day => {
  //     const dayDateStr = toLocalDateStr(day);
  //     const dayLessons = lessons.filter(l => l.date === dayDateStr);
  //     return { day, lessonCount: dayLessons.length, activeSchools: dayLessons.map(l => l.schoolId).filter((v, i, a) => a.indexOf(v) === i).map(id => schools.find(s => s.id === id)).filter(Boolean) as School[] };
  //   });
  const renderWeeklyTimetable = () => {
    const dayConfigs = weekDays.map(day => {
      const dayDateStr = toLocalDateStr(day);
      const dayLessons = lessons.filter(l => l.date === dayDateStr &&
        (selectedTeacherId === 'all' || l.teacherId === selectedTeacherId)
      );
      return {
        day,
        lessonCount: dayLessons.length,
        activeSchools: dayLessons
          .map(l => l.schoolId)
          .filter((v, i, a) => a.indexOf(v) === i)
          .map(id => schools.find(s => s.id === id))
          .filter(Boolean)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) as School[]  // ← ДОБАВЛЕНА СОРТИРОВКА
      };
    });
    if (isMobile) {
      return (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar animate-fadeIn">
          {dayConfigs.map(({ day, lessonCount }) => (
            <button key={day.toISOString()} onClick={() => setFocusedDay(day)} className="w-full bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex flex-col items-start"><span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{day.toLocaleDateString('en-US', { weekday: 'long' })}</span><span className="text-base font-bold text-slate-800">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>
              <div className="flex items-center gap-2">
                <div className="text-right"><p className="text-lg font-black text-slate-900 leading-none">{lessonCount}</p><p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Classes</p></div>
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><i className="fa-solid fa-chevron-right"></i></div>
              </div>
            </button>
          ))}
          {isAdmin && (
            <div className="pt-2 px-1">
              <button onClick={() => { setCopyTargetWeekOffset(currentWeekOffset + 1); setIsCopyWeekModalOpen(true); }} className="w-full py-3 rounded-xl bg-indigo-50 text-indigo-600 border border-dashed border-indigo-200 text-[10px] font-black uppercase tracking-widest"><i className="fa-solid fa-copy mr-1"></i> Clone Weekly Roadmap</button>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex-1 flex flex-col min-h-0 animate-fadeIn">
        <div className="overflow-auto flex-1 relative custom-scrollbar">
          {/* <table className="w-full border-collapse table-fixed min-w-[1200px]"> */}
          <table className="border-collapse table-auto w-max">
            <thead>
              {/* <tr className="bg-slate-50">
                <th className="sticky top-0 left-0 z-50 w-16 p-2 text-[9px] font-black text-slate-800 uppercase tracking-widest text-center border-r border-b border-slate-200 bg-slate-50 shadow-[2px_0_0_0_#e2e8f0]">TIME</th>
                {dayConfigs.map(({ day, activeSchools }) => (
                  <th key={toLocalDateStr(day)} colSpan={Math.max(1, activeSchools.length)} className="sticky top-0 z-40 p-2 border-l border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors group/header" onClick={() => setFocusedDay(day)}>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest group-hover/header:underline">{day.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                      <span className="text-xs font-bold text-slate-400">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </th>
                ))} */}
              {/* Строка 1: дни недели — как раньше */}
              <tr className="bg-slate-50">
                <th className="sticky top-0 left-0 z-50 w-16 p-2 text-[9px] font-black text-slate-800 uppercase tracking-widest text-center border-r border-b border-slate-200 bg-slate-50 shadow-[2px_0_0_0_#e2e8f0]" rowSpan={2}>TIME</th>
                {dayConfigs.map(({ day, activeSchools }) => (
                  <th key={toLocalDateStr(day)} colSpan={Math.max(1, activeSchools.length)} className="sticky top-0 z-40 p-2 border-l border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors group/header" onClick={() => setFocusedDay(day)}>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest group-hover/header:underline">{day.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                      <span className="text-xs font-bold text-slate-400">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </th>
                ))}
              </tr>

              {/* Строка 2: названия школ под каждым днём */}
              <tr className="bg-slate-50/80">
                {dayConfigs.map(({ day, activeSchools }) => {
                  if (activeSchools.length === 0) {
                    return (
                      <th key={`schools-${toLocalDateStr(day)}`} className="sticky top-[36px] z-39 p-1 border-l border-slate-200 bg-slate-50/80 border-t-0">
                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">—</span>
                      </th>
                    );
                  }
                  return activeSchools.map(school => (
                    <th key={`school-${toLocalDateStr(day)}-${school.id}`} className="sticky top-[36px] z-39 p-1 border-l border-slate-200 bg-indigo-50/60 border-t-0">
                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest truncate block text-center" title={school.name}>
                        {school.name}
                      </span>
                    </th>
                  ));
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time} className="group border-b border-slate-100 last:border-0">
                  <td className="sticky left-0 z-30 p-2 text-[10px] font-black text-slate-400 text-center bg-slate-50/50 backdrop-blur-sm font-mono border-r border-slate-200 shadow-[2px_0_0_0_#e2e8f0]">{time}</td>
                  {dayConfigs.map(({ day, activeSchools }) => {
                    const dateStr = toLocalDateStr(day);
                    const hour = parseInt(time.split(':')[0]);
                    if (activeSchools.length === 0) {
                      return <td key={`${dateStr}-empty`} className="p-0.5 border-l border-slate-100 relative align-top hover:bg-slate-50/40 group/cell cursor-pointer" onClick={() => openEditModal(undefined, { date: dateStr, startTime: time })}><div className="min-h-[45px] flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity"><span className="text-[9px] font-black text-slate-300">+ ADD</span></div></td>;
                    }
                    return activeSchools.map(school => {
                      const cellLessons = lessons.filter(l =>
                        l.date === dateStr &&
                        getEffectiveHour(l.startTime) === hour &&
                        l.schoolId === school.id &&
                        (selectedTeacherId === 'all' || l.teacherId === selectedTeacherId)
                      );
                      return (
                        <td key={`${dateStr}-${school.id}`} className="p-1 border-l border-slate-100 relative align-top hover:bg-slate-50/40 group/cell transition-colors cursor-pointer" onClick={() => openEditModal(undefined, { date: dateStr, startTime: time, schoolId: school.id })}>
                          <div className="flex flex-col gap-1 h-full min-h-[45px]">
                            {cellLessons.map(l => {
                              const t = teachers.find(teacher => teacher.id === l.teacherId);
                              return (
                                <div key={l.id} onClick={(e) => { e.stopPropagation(); openEditModal(l); }} className="p-1.5 rounded-lg border-l-3 shadow-sm transition-all hover:scale-[1.02] active:scale-95 group/card" style={{ backgroundColor: `${t?.color || '#6366f1'}15`, borderLeftColor: t?.color || '#cbd5e1' }}>
                                  <div className="flex justify-between items-start"><p className="text-[9px] font-black leading-tight text-slate-800 truncate" title={t ? `${t.firstName} ${t.lastName}` : 'TBA'}>{t ? t.lastName : 'TBA'}</p>{l.grade && <p className="text-[9px] font-black text-slate-500 shrink-0 ml-1">{l.grade}</p>}</div>
                                  <div className="flex flex-wrap items-center justify-between gap-x-1"><p className="text-[8px] font-black text-slate-400 whitespace-nowrap">{l.startTime} – {l.endTime}</p><p className="text-[7px] font-bold text-slate-400">{l.room}</p></div>
                                </div>
                              );
                            })}
                            {isAdmin && <div className="opacity-0 group-hover/cell:opacity-100 flex items-center justify-center p-1 border border-dashed border-slate-200 rounded-lg text-slate-300 text-[7px] font-black transition-all hover:border-indigo-300 hover:text-indigo-400"><i className="fa-solid fa-plus"></i></div>}
                          </div>
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div >
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <Sidebar currentView={view} isAdmin={isAdmin} /> {/*onViewChange={(v) => { setView(v); setFocusedDay(null); }} />*/}
      <main className="flex-1 flex flex-col overflow-hidden p-2.5">
        {errors.lessons && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-800 text-sm font-medium">
            Lessons: {errors.lessons}
          </div>
        )}
        {errors.teachers && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-800 text-sm font-medium">
            Teachers: {errors.teachers}
          </div>
        )}
        {errors.schools && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-800 text-sm font-medium">
            Schools: {errors.schools}
          </div>
        )}
        {isLoading && !errors.lessons && !errors.teachers && !errors.schools && (
          <p className="text-slate-500 text-sm font-medium mb-2">Loading...</p>
        )}
        {view === 'dashboard' && (
          <div className="space-y-8 lg:space-y-12 animate-fadeIn max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div><h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Overview</h1><p className="text-slate-500 mt-2 font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Class active for <span className="text-indigo-600 font-bold">{user.fullName || user.firstName || 'User'}</span></p></div>
              {isAdmin && <button onClick={() => openEditModal()} className="bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0 text-sm lg:text-base">+ New Class</button>}
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              <div className="bg-white p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center"><p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">Volume</p><div className="flex items-baseline gap-2"><p className="text-5xl lg:text-6xl font-black text-indigo-600">{stats.total}</p><span className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">total units</span></div></div>
              {/* <div className="bg-indigo-600 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden flex flex-col justify-center"><p className="opacity-70 text-[11px] font-black uppercase tracking-widest mb-1">AI Guidance</p><p className="text-base lg:text-lg font-bold italic leading-snug z-10">"{aiAdvice || "Calculating optimal patterns..."}"</p><i className="fa-solid fa-bolt absolute -right-4 -bottom-4 text-white/10 text-9xl"></i></div> */}
            </div>
            <section>
              {/* Фильтр по учителю */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <h2 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">Upcoming roadmap</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
                    <i className="fa-solid fa-chalkboard-user text-indigo-400 text-sm"></i>
                    <select
                      value={defaultTeacherFilter}
                      onChange={e => setDashboardTeacherFilter(e.target.value)}
                      className="text-sm font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer pr-1"
                    >
                      <option value="all">All Teachers</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => setView('schedule')} className="text-indigo-600 font-black text-sm hover:underline whitespace-nowrap">
                    Full Timetable
                  </button>
                </div>
              </div>

              {/* Группировка по дням */}
              {dashboardDayGroups.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <i className="fa-solid fa-calendar-xmark text-4xl mb-3"></i>
                  <p className="font-bold">No upcoming lessons found</p>
                </div>
              ) : (
                <div className="space-y-8 pb-10">
                  {dashboardDayGroups.map(group => {
                    // Форматируем заголовок дня 
                    const dayDate = new Date(group.date + 'T12:00:00');
                    const todayStr = toLocalDateStr(new Date());
                    const isToday = group.date === todayStr;
                    const dayLabel = isToday
                      ? 'Today'
                      : dayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

                    return (
                      <div key={group.date}>
                        {/* Промежуточный итог по дате */}
                        <div className="flex items-center gap-3 mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${isToday
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                            }`}>
                            {dayLabel}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {group.lessons.length} lesson{group.lessons.length !== 1 ? 's' : ''}
                          </span>
                          <div className="flex-1 h-px bg-slate-100"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                          {group.lessons.map(l => (
                            <LessonCard
                              key={l.id}
                              lesson={l}
                              teachers={teachers}
                              schools={schools}
                              isAdmin={isAdmin}
                              compact={isMobile}
                              onEdit={openEditModal}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
        {view === 'schedule' && (
          <div className="animate-fadeIn w-full h-full flex flex-col min-h-0">
            {/* <header className="flex flex-col gap-2 max-w-7xl mx-auto w-full mb-3 lg:mb-4 shrink-0">
              <div className="flex items-start justify-between">
                <div><h1 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight">{focusedDay ? focusedDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Weekly Loop'}</h1></div>
                <div className="flex items-center gap-2 lg:gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                  <button onClick={() => { setCurrentWeekOffset(prev => prev - 1); setFocusedDay(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all"><i className="fa-solid fa-chevron-left text-slate-400"></i></button>
                  <button onClick={() => { setCurrentWeekOffset(0); setFocusedDay(null); }} className="px-3 lg:px-6 py-2 text-[10px] font-black text-indigo-600 hover:bg-indigo-50 rounded-lg uppercase tracking-widest hidden sm:block">
                    <span>Current</span>
                    <span>Week</span>
                  </button>
                  <button onClick={() => { setCurrentWeekOffset(prev => prev + 1); setFocusedDay(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all"><i className="fa-solid fa-chevron-right text-slate-400"></i></button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {focusedDay && <button onClick={() => { setFocusedDay(null); setSelectedSchoolId('all'); setSelectedTeacherId('all'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"><i className="fa-solid fa-arrow-left"></i> BACK TO WEEK</button>}
                {!focusedDay && isAdmin && !isMobile && <button onClick={() => setIsCopyWeekModalOpen(true)} className="bg-white border-2 border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-2"><i className="fa-solid fa-copy"></i> CLONE WEEK</button>}
              </div>
            </header> */}
            <header className="flex flex-col gap-2 max-w-7xl mx-auto w-full mb-3 lg:mb-4 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight">
                    {focusedDay ? focusedDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Weekly Loop'}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  {!focusedDay && !isMobile && (
                    <div className="flex flex-col gap-0.5">
                      {/* <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Staff</label> */}
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm hover:border-indigo-300 transition-all cursor-pointer"
                      >
                        <option value="all">All Faculty</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.lastName}, {t.firstName[0]}.</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!focusedDay && isAdmin && !isMobile && (
                    <button
                      onClick={() => { setCopyTargetWeekOffset(currentWeekOffset + 1); setIsCopyWeekModalOpen(true); }}
                      className="bg-white border-2 border-slate-200 px-3 py-2 rounded-xl text-[9px] font-black hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-copy text-xs"></i>
                      <span>CLONE WEEK</span>
                    </button>
                  )}
                  {/* Навигационные стрелки и Current Week */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                    <button
                      onClick={() => { setCurrentWeekOffset(prev => prev - 1); setFocusedDay(null); }}
                      className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-all"
                    >
                      <i className="fa-solid fa-chevron-left text-slate-400 text-sm"></i>
                    </button>
                    <button
                      onClick={() => { setCurrentWeekOffset(0); setFocusedDay(null); }}
                      className="px-2 py-1 text-[9px] font-black text-indigo-600 hover:bg-indigo-50 rounded-lg uppercase tracking-widest hidden sm:flex sm:flex-col sm:items-center leading-tight"
                    >
                      <span>Current</span>
                      <span>Week</span>
                    </button>
                    <button
                      onClick={() => { setCurrentWeekOffset(prev => prev + 1); setFocusedDay(null); }}
                      className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-all"
                    >
                      <i className="fa-solid fa-chevron-right text-slate-400 text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Блок для кнопки BACK TO WEEK - только когда focusedDay активен */}
              {focusedDay && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setFocusedDay(null); setSelectedSchoolId('all'); setSelectedTeacherId('all'); }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    <i className="fa-solid fa-arrow-left"></i> BACK TO WEEK
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        const next = new Date(focusedDay);
                        next.setDate(next.getDate() + 7);
                        setCopyDayTargetDate(toLocalDateStr(next));
                        setIsCopyDayModalOpen(true);
                      }}
                      className="bg-white border-2 border-slate-200 px-3 py-2 rounded-xl text-[9px] font-black hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-copy text-xs"></i>
                      <span>CLONE DAY</span>
                    </button>
                  )}
                </div>
              )}
            </header>
            <div className="flex-1 min-h-0 flex flex-col">
              {focusedDay ? renderDailyTimetable(focusedDay) : renderWeeklyTimetable()}
            </div>
          </div>
        )}
        {view === 'reports' && isAdmin && (
          <TeacherHoursReport
            lessons={lessons}
            teachers={teachers}
            schools={schools}
          />
        )}
        {view === 'settings' && isAdmin && (
          <div className="animate-fadeIn max-w-3xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2 pb-20 space-y-4">
            <header className="mb-6">
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Settings</h1>
              <p className="text-slate-500 font-medium">Manage faculty, academic branches, and user access.</p>
            </header>

            {/* ── ACCORDION HELPER ── аналог SectionBox в Fiori */}
            {([
              {
                key: 'faculty',
                icon: 'fa-chalkboard-user',
                label: 'Faculty',
                badge: teachers.length,
                action: <button onClick={() => teacherActions.add()} className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest">+ STAFF</button>,
                content: (
                  <div className="divide-y divide-slate-50">
                    {teachers.map(t => (
                      <div key={t.id} className="p-4 lg:p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                        <input type="color" value={t.color}
                          onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, color: e.target.value } : item))}
                          onBlur={() => teacherActions.update(t)}
                          className="w-8 h-8 rounded-lg border-none cursor-pointer" />
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <input value={t.firstName}
                            onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, firstName: e.target.value } : item))}
                            onBlur={() => teacherActions.update(t)}
                            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="First name" />
                          <input value={t.lastName}
                            onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, lastName: e.target.value } : item))}
                            onBlur={() => teacherActions.update(t)}
                            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Last name" />
                        </div>
                        <button onClick={() => teacherActions.remove(t.id)} className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                          <i className="fa-solid fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )
              },
              {
                key: 'schools',
                icon: 'fa-school',
                label: 'Schools',
                badge: schools.length,
                action: <button onClick={() => schoolActions.add()} className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest">+ SCHOOL</button>,
                content: (
                  <div className="divide-y divide-slate-50">
                    {schools.map(s => (
                      <div key={s.id} className="p-4 lg:p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1 space-y-2">
                          <input value={s.name}
                            onChange={e => setSchools(prev => prev.map(item => item.id === s.id ? { ...item, name: e.target.value } : item))}
                            onBlur={() => schoolActions.update(s)}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="School name" />
                          <input value={s.address || ''}
                            onChange={e => setSchools(prev => prev.map(item => item.id === s.id ? { ...item, address: e.target.value } : item))}
                            onBlur={() => schoolActions.update(s)}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-xs text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Address (optional)" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Order</span>
                          <input type="number" value={s.sortOrder ?? 0}
                            onChange={e => setSchools(prev => prev.map(item => item.id === s.id ? { ...item, sortOrder: parseInt(e.target.value) || 0 } : item))}
                            onBlur={() => schoolActions.update(s)}
                            className="w-16 bg-slate-50 border-none rounded-lg px-2 py-2 text-sm font-bold text-slate-700 outline-none text-center" />
                        </div>
                        <button onClick={() => schoolActions.remove(s.id)} className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                          <i className="fa-solid fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )
              },
              {
                key: 'users',
                icon: 'fa-users',
                label: 'User Access',
                badge: users.length,
                action: <button onClick={() => { setEditingUser({ id: Math.random().toString(36).substring(2, 11), email: '', role: 'viewer' }); setIsUserModalOpen(true); }} className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest">+ USER</button>,
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
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : user.role === 'teacher' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Teacher' : 'Viewer'}
                              </span>
                            </div>
                            <div className="col-span-3 text-sm text-slate-500 truncate">{user.teacherName || '-'}</div>
                            <div className="col-span-1 flex justify-center">
                              <button onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                <i className="fa-solid fa-pen-to-square"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {users.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No users yet.</div>}
                    </div>
                  </div>
                )
              }
            ] as const).map(({ key, icon, label, badge, action, content }) => (
              <div key={key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Accordion Header — клик сворачивает/разворачивает, аналог SectionBox header */}
                <button
                  onClick={() => toggleSettingsSection(key)}
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
                    <i className={`fa-solid fa-chevron-down text-slate-400 transition-transform duration-200 ${openSettingsSections[key] ? 'rotate-180' : ''}`}></i>
                  </div>
                </button>
                {/* Accordion Body */}
                {openSettingsSections[key] && (
                  <div className="border-t border-slate-100">
                    {content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {view === 'admin-manage' && (
          <div className="space-y-8 lg:space-y-12 animate-fadeIn max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2 pb-20">
            <div className="space-y-8 lg:space-y-12 animate-fadeIn max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2 pb-20">
              <header><h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Audit Feed</h1><p className="text-slate-500 font-medium">History of all school classes.</p></header>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">{[...lessons].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)).map(l => <LessonCard key={l.id} lesson={l} teachers={teachers} schools={schools} isAdmin={isAdmin} compact={isMobile} onEdit={openEditModal} />)}</div>
            </div>
          </div>
        )}
      </main>

      {/* Duplicate Week Modal */}
      {isCopyWeekModalOpen && (
        <CopyWeekModal
          currentWeekOffset={currentWeekOffset}
          copyTargetWeekOffset={copyTargetWeekOffset}
          copyKeepTeachers={copyKeepTeachers}
          onTargetOffsetChange={setCopyTargetWeekOffset}
          onKeepTeachersChange={setCopyKeepTeachers}
          onClose={() => setIsCopyWeekModalOpen(false)}
          onConfirm={async () => {
            try {
              await lessonActions.copyWeek({
                weekDays,
                currentWeekOffset,
                targetWeekOffset: copyTargetWeekOffset,
                keepTeachers: copyKeepTeachers,
              });
              setIsCopyWeekModalOpen(false);
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Failed to clone week');
            }
          }}
        />
      )}
      {/* Clone Day Modal */}
      {isCopyDayModalOpen && focusedDay && (
        <CopyDayModal
          focusedDay={focusedDay}
          copyDayTargetDate={copyDayTargetDate}
          copyKeepTeachers={copyKeepTeachers}
          onTargetDateChange={setCopyDayTargetDate}
          onKeepTeachersChange={setCopyKeepTeachers}
          onClose={() => setIsCopyDayModalOpen(false)}
          onConfirm={async () => {
            try {
              await lessonActions.copyDay({
                sourceDate: toLocalDateStr(focusedDay),
                targetDate: copyDayTargetDate,
                keepTeachers: copyKeepTeachers,
              });
              setIsCopyDayModalOpen(false);
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Failed to clone day');
            }
          }}
        />
      )}
      {/* Edit Session Modal */}
      {isModalOpen && editingLesson && (
        <LessonModal
          lesson={editingLesson}
          lessons={lessons}
          teachers={teachers}
          schools={schools}
          addMinutes={addMinutes}
          onChange={setEditingLesson}
          onClose={() => { setIsModalOpen(false); setEditingLesson(null); }}
          onSave={async (e) => {
            e.preventDefault();
            if (!editingLesson || !isAdmin) return;
            try {
              await lessonActions.save(editingLesson, lessons);
              setIsModalOpen(false);
              setEditingLesson(null);
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Failed to save lesson');
            }
          }}
          onDelete={async () => {
            if (!isAdmin || !editingLesson?.id) return;
            if (!window.confirm('Delete this lesson? This cannot be undone.')) return;
            try {
              await lessonActions.remove(editingLesson.id);
              setIsModalOpen(false);
              setEditingLesson(null);
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Failed to delete lesson');
            }
          }}
        />
      )}

      {/* User Edit Modal */}
      {isUserModalOpen && editingUser && (
        <UserModal
          user={editingUser}
          users={users}
          teachers={teachers}
          onChange={setEditingUser}
          onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }}
          onSave={async (e) => {
            e.preventDefault();
            if (!editingUser || !isAdmin) return;
            try {
              await userActions.save(editingUser, users);
              setIsUserModalOpen(false);
              setEditingUser(null);
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Failed to save user');
            }
          }}
          onDelete={async () => {
            if (!editingUser.id || !window.confirm('Are you sure you want to delete this user?')) return;
            try {
              await userActions.remove(editingUser.id);
              setIsUserModalOpen(false);
              setEditingUser(null);
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Failed to delete user');
            }
          }}
        />
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; }
        input[type="time"]::-webkit-calendar-picker-indicator { display: block; background-position: center; background-size: contain; cursor: pointer; }
        th { backface-visibility: hidden; }
        body { overflow: hidden; touch-action: manipulation; }
        @media (max-width: 640px) { .p-12 { padding: 1.5rem !important; } }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1rem; }
      `}</style>
    </div>
  );
};
export default App;