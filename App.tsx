
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import LessonCard from './components/LessonCard';
import Login from './components/Login';
import { Lesson, LessonStatus, ViewType, User, Teacher, School } from './types';
//import { getScheduleAdvice } from './services/geminiService';

const INITIAL_TEACHERS: Teacher[] = [
  { id: 't1', firstName: 'John', lastName: 'Doe', color: '#6366f1' },
  { id: 't2', firstName: 'Jane', lastName: 'Smith', color: '#10b981' },
];

const INITIAL_SCHOOLS: School[] = [
  { id: 's1', name: 'Lincoln High' },
  { id: 's2', name: 'Westside Academy' },
];

const toLocalDateStr = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('dashboard');
  
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('eduplan_teachers');
    return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
  });
  const [schools, setSchools] = useState<School[]>(() => {
    const saved = localStorage.getItem('eduplan_schools');
    return saved ? JSON.parse(saved) : INITIAL_SCHOOLS;
  });
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    const saved = localStorage.getItem('eduplan_lessons');
    return saved ? JSON.parse(saved) : [];
  });

  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusedDay, setFocusedDay] = useState<Date | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [isCopyWeekModalOpen, setIsCopyWeekModalOpen] = useState(false);
  const [copyKeepTeachers, setCopyKeepTeachers] = useState(true);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('eduplan_lessons', JSON.stringify(lessons));
    localStorage.setItem('eduplan_teachers', JSON.stringify(teachers));
    localStorage.setItem('eduplan_schools', JSON.stringify(schools));
  }, [lessons, teachers, schools]);

/*   useEffect(() => {
    if (user && lessons.length > 0) {
      getScheduleAdvice(lessons).then(setAiAdvice).catch(console.error);
    }
  }, [user]); */

  const stats = useMemo(() => ({ total: lessons.length }), [lessons]);

  const getStartOfWeek = (offsetWeeks: number) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0); 
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    d.setDate(diff + (offsetWeeks * 7));
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const weekDays = useMemo(() => {
    const start = getStartOfWeek(currentWeekOffset);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentWeekOffset]);

  const addMinutes = (time: string, mins: number) => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + mins);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
      room: initialData?.room || '101',
      status: LessonStatus.UPCOMING,
      notes: '',
      ...initialData
    });
    setIsModalOpen(true);
  };

  const handleSaveLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !isAdmin) return;
    let finalSchoolId = editingLesson.schoolId || (schools.length > 0 ? schools[0].id : '');
    const l = { ...editingLesson, schoolId: finalSchoolId, subject: 'English', status: LessonStatus.UPCOMING } as Lesson;
    setLessons(prev => {
      const idx = prev.findIndex(item => item.id === l.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = l;
        return next;
      }
      return [...prev, l];
    });
    setIsModalOpen(false);
    setEditingLesson(null);
  };

  // ROBUST DELETE LOGIC
  const handleDeleteCurrentLesson = () => {
    if (!isAdmin || !editingLesson?.id) return;
    
    // Check if it's a real lesson that exists in state
    const exists = lessons.some(l => l.id === editingLesson.id);
    if (!exists) return;

    const confirmMessage = "Are you sure you want to permanently delete this lesson? This action cannot be undone.";
    if (window.confirm(confirmMessage)) {
      const idToDelete = editingLesson.id;
      setLessons(currentLessons => currentLessons.filter(lesson => lesson.id !== idToDelete));
      setIsModalOpen(false);
      setEditingLesson(null);
    }
  };

  const handleCopyWeek = () => {
    if (!isAdmin) return;
    const dayStrings = weekDays.map(d => toLocalDateStr(d));
    const currentWeekLessons = lessons.filter(l => dayStrings.includes(l.date));
    if (currentWeekLessons.length === 0) {
      alert("No sessions found to duplicate.");
      return;
    }
    const newLessons = currentWeekLessons.map(l => {
      const d = new Date(l.date);
      d.setDate(d.getDate() + 7);
      return {
        ...l,
        id: Math.random().toString(36).substr(2, 9),
        date: toLocalDateStr(d),
        teacherId: copyKeepTeachers ? l.teacherId : '',
        status: LessonStatus.UPCOMING
      };
    });
    setLessons(prev => [...prev, ...newLessons]);
    setIsCopyWeekModalOpen(false);
    alert(`Successfully cloned ${newLessons.length} sessions.`);
  };

  if (!user) return <Login onLogin={setUser} />;

  const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

  const renderDailyTimetable = (day: Date) => {
    const dateStr = toLocalDateStr(day);
    if (isMobile) {
      return (
        <div className="flex-1 flex flex-col min-h-0 animate-fadeIn space-y-4">
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Branch</label>
              <select value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm">
                <option value="all">All Units</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Staff</label>
              <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm">
                <option value="all">All Faculty</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.lastName}, {t.firstName[0]}.</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {timeSlots.map(time => {
              const hour = parseInt(time.split(':')[0]);
              const timeLessons = lessons.filter(l => l.date === dateStr && parseInt(l.startTime.split(':')[0]) === hour && (selectedSchoolId === 'all' || l.schoolId === selectedSchoolId) && (selectedTeacherId === 'all' || l.teacherId === selectedTeacherId));
              if (timeLessons.length === 0 && !isAdmin) return null;
              return (
                <div key={time} className="flex gap-3">
                  <div className="w-10 text-right shrink-0 pt-1.5"><span className="text-[9px] font-black text-slate-400 font-mono">{time}</span></div>
                  <div className="flex-1 space-y-2">
                    {timeLessons.map(l => <LessonCard key={l.id} lesson={l} teachers={teachers} schools={schools} isAdmin={isAdmin} compact={true} onEdit={openEditModal} />)}
                    {isAdmin && (
                      <button onClick={() => openEditModal(undefined, { date: dateStr, startTime: time })} className="w-full h-8 border border-dashed border-slate-100 rounded-lg flex items-center justify-center text-slate-300 text-[8px] font-black hover:border-indigo-100 hover:text-indigo-400 transition-all">
                        <i className="fa-solid fa-plus mr-1"></i> {timeLessons.length > 0 ? 'ADD MORE' : `ADD AT ${time}`}
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
    const filteredSchools = selectedSchoolId === 'all' ? schools : schools.filter(s => s.id === selectedSchoolId);
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex-1 flex flex-col min-h-0 animate-fadeIn">
        <div className="overflow-auto flex-1 relative custom-scrollbar">
          <table className="w-full border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky top-0 left-0 z-50 w-24 p-4 text-[11px] font-black text-slate-800 uppercase tracking-widest text-center border-r border-b border-slate-200 bg-slate-50 shadow-[2px_0_0_0_#e2e8f0]">TIME</th>
                {filteredSchools.map(school => (
                  <th key={school.id} className="sticky top-0 z-40 p-4 border-l border-b border-slate-200 bg-slate-50">
                    <div className="flex flex-col items-center"><span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest truncate max-w-full" title={school.name}>{school.name}</span></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time} className="group border-b border-slate-100 last:border-0">
                  <td className="sticky left-0 z-30 p-4 text-xs font-black text-slate-400 text-center bg-slate-50/50 backdrop-blur-sm font-mono border-r border-slate-200 shadow-[2px_0_0_0_#e2e8f0]">{time}</td>
                  {filteredSchools.map(school => {
                    const hour = parseInt(time.split(':')[0]);
                    const cellLessons = lessons.filter(l => l.date === dateStr && parseInt(l.startTime.split(':')[0]) === hour && l.schoolId === school.id);
                    return (
                      <td key={`${school.id}-${time}`} className="p-2 border-l border-slate-100 relative align-top hover:bg-slate-50/40 group/cell transition-colors cursor-pointer" onClick={() => openEditModal(undefined, { date: dateStr, startTime: time, schoolId: school.id })}>
                        <div className="flex flex-col gap-1.5 h-full min-h-[60px]">
                          {cellLessons.map(l => {
                            const t = teachers.find(teacher => teacher.id === l.teacherId);
                            return (
                              <div key={l.id} onClick={(e) => { e.stopPropagation(); openEditModal(l); }} className="p-2.5 rounded-xl border-l-4 shadow-sm transition-all hover:scale-[1.02] active:scale-95 group/card" style={{ backgroundColor: `${t?.color || '#6366f1'}15`, borderLeftColor: t?.color || '#cbd5e1' }}>
                                <div className="flex justify-between items-start mb-1"><p className="text-[10px] font-black leading-tight text-slate-800 truncate" title={t ? `${t.firstName} ${t.lastName}` : 'TBA'}>{t ? t.lastName : 'TBA'}</p></div>
                                <div className="flex flex-wrap items-center justify-between mt-1 gap-x-2"><p className="text-[9px] font-black text-slate-400 whitespace-nowrap">{l.startTime} – {l.endTime}</p><p className="text-[8px] font-bold text-slate-400">R{l.room}</p></div>
                              </div>
                            );
                          })}
                          {isAdmin && <div className="opacity-0 group-hover/cell:opacity-100 flex items-center justify-center p-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-300 text-[8px] font-black transition-all hover:border-indigo-300 hover:text-indigo-400"><i className="fa-solid fa-plus mr-1"></i> ADD</div>}
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

  const renderWeeklyTimetable = () => {
    const dayConfigs = weekDays.map(day => {
      const dayDateStr = toLocalDateStr(day);
      const dayLessons = lessons.filter(l => l.date === dayDateStr);
      return { day, lessonCount: dayLessons.length, activeSchools: dayLessons.map(l => l.schoolId).filter((v, i, a) => a.indexOf(v) === i).map(id => schools.find(s => s.id === id)).filter(Boolean) as School[] };
    });
    if (isMobile) {
      return (
        <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar animate-fadeIn">
          {dayConfigs.map(({ day, lessonCount }) => (
            <button key={day.toISOString()} onClick={() => setFocusedDay(day)} className="w-full bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex flex-col items-start"><span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{day.toLocaleDateString('en-US', { weekday: 'long' })}</span><span className="text-lg font-bold text-slate-800">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>
              <div className="flex items-center gap-4">
                <div className="text-right"><p className="text-xl font-black text-slate-900 leading-none">{lessonCount}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Sessions</p></div>
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><i className="fa-solid fa-chevron-right"></i></div>
              </div>
            </button>
          ))}
          {isAdmin && (
            <div className="pt-4 px-2">
               <button onClick={() => setIsCopyWeekModalOpen(true)} className="w-full py-5 rounded-[2rem] bg-indigo-50 text-indigo-600 border-2 border-dashed border-indigo-200 text-xs font-black uppercase tracking-widest"><i className="fa-solid fa-copy mr-2"></i> Clone Weekly Roadmap</button>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex-1 flex flex-col min-h-0 animate-fadeIn">
        <div className="overflow-auto flex-1 relative custom-scrollbar">
          <table className="w-full border-collapse table-fixed min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky top-0 left-0 z-50 w-24 p-4 text-[11px] font-black text-slate-800 uppercase tracking-widest text-center border-r border-b border-slate-200 bg-slate-50 shadow-[2px_0_0_0_#e2e8f0]">TIME</th>
                {dayConfigs.map(({ day, activeSchools }) => (
                  <th key={toLocalDateStr(day)} colSpan={Math.max(1, activeSchools.length)} className="sticky top-0 z-40 p-4 border-l border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors group/header" onClick={() => setFocusedDay(day)}>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest group-hover/header:underline">{day.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                      <span className="text-sm font-bold text-slate-400">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time} className="group border-b border-slate-100 last:border-0">
                  <td className="sticky left-0 z-30 p-4 text-xs font-black text-slate-400 text-center bg-slate-50/50 backdrop-blur-sm font-mono border-r border-slate-200 shadow-[2px_0_0_0_#e2e8f0]">{time}</td>
                  {dayConfigs.map(({ day, activeSchools }) => {
                    const dateStr = toLocalDateStr(day);
                    const hour = parseInt(time.split(':')[0]);
                    if (activeSchools.length === 0) {
                      return <td key={`${dateStr}-empty`} className="p-1 border-l border-slate-100 relative align-top hover:bg-slate-50/40 group/cell cursor-pointer" onClick={() => openEditModal(undefined, { date: dateStr, startTime: time })}><div className="min-h-[60px] flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity"><span className="text-[10px] font-black text-slate-300">+ ADD</span></div></td>;
                    }
                    return activeSchools.map(school => {
                      const cellLessons = lessons.filter(l => l.date === dateStr && parseInt(l.startTime.split(':')[0]) === hour && l.schoolId === school.id);
                      return (
                        <td key={`${dateStr}-${school.id}`} className="p-1.5 border-l border-slate-100 relative align-top hover:bg-slate-50/40 group/cell transition-colors cursor-pointer" onClick={() => openEditModal(undefined, { date: dateStr, startTime: time, schoolId: school.id })}>
                          <div className="flex flex-col gap-1.5 h-full min-h-[60px]">
                            {cellLessons.map(l => {
                              const t = teachers.find(teacher => teacher.id === l.teacherId);
                              return (
                                <div key={l.id} onClick={(e) => { e.stopPropagation(); openEditModal(l); }} className="p-2.5 rounded-xl border-l-4 shadow-sm transition-all hover:scale-[1.02] active:scale-95 group/card" style={{ backgroundColor: `${t?.color || '#6366f1'}15`, borderLeftColor: t?.color || '#cbd5e1' }}>
                                  <div className="flex justify-between items-start mb-1"><p className="text-[10px] font-black leading-tight text-slate-800 truncate" title={t ? `${t.firstName} ${t.lastName}` : 'TBA'}>{t ? t.lastName : 'TBA'}</p></div>
                                  <div className="flex flex-wrap items-center justify-between mt-1 gap-x-2"><p className="text-[9px] font-black text-slate-400 whitespace-nowrap">{l.startTime} – {l.endTime}</p><p className="text-[8px] font-bold text-slate-400">R{l.room}</p></div>
                                </div>
                              );
                            })}
                            {isAdmin && <div className="opacity-0 group-hover/cell:opacity-100 flex items-center justify-center p-1 border-2 border-dashed border-slate-200 rounded-lg text-slate-300 text-[8px] font-black hover:border-indigo-300 hover:text-indigo-400 transition-all"><i className="fa-solid fa-plus"></i></div>}
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
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <Sidebar currentView={view} onViewChange={(v) => { setView(v); setFocusedDay(null); }} user={user} onLogout={() => { setUser(null); setView('dashboard'); }} />
      <main className="flex-1 flex flex-col overflow-hidden p-4 lg:p-12">
        {view === 'dashboard' && (
          <div className="space-y-8 lg:space-y-12 animate-fadeIn max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div><h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Overview</h1><p className="text-slate-500 mt-2 font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Session active for <span className="text-indigo-600 font-bold">{user.name}</span></p></div>
              {isAdmin && <button onClick={() => openEditModal()} className="bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0 text-sm lg:text-base">+ New Session</button>}
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              <div className="bg-white p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center"><p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">Volume</p><div className="flex items-baseline gap-2"><p className="text-5xl lg:text-6xl font-black text-indigo-600">{stats.total}</p><span className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">total units</span></div></div>
              <div className="bg-indigo-600 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden flex flex-col justify-center"><p className="opacity-70 text-[11px] font-black uppercase tracking-widest mb-1">AI Guidance</p><p className="text-base lg:text-lg font-bold italic leading-snug z-10">"{aiAdvice || "Calculating optimal patterns..."}"</p><i className="fa-solid fa-bolt absolute -right-4 -bottom-4 text-white/10 text-9xl"></i></div>
            </div>
            <section>
              <div className="flex items-center justify-between mb-8"><h2 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">Upcoming roadmap</h2><button onClick={() => setView('schedule')} className="text-indigo-600 font-black text-sm hover:underline">Full Timetable</button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8 pb-10">{lessons.slice(0, 9).map(l => <LessonCard key={l.id} lesson={l} teachers={teachers} schools={schools} isAdmin={isAdmin} compact={isMobile} onEdit={openEditModal} />)}</div>
            </section>
          </div>
        )}
        {view === 'schedule' && (
          <div className="animate-fadeIn w-full h-full flex flex-col min-h-0">
            <header className="flex flex-col gap-4 max-w-7xl mx-auto w-full mb-6 lg:mb-8 shrink-0">
              <div className="flex items-start justify-between">
                <div><h1 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight">{focusedDay ? focusedDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Weekly Loop'}</h1><p className="text-xs lg:text-sm text-slate-500 font-medium truncate max-w-[200px] lg:max-w-none">{focusedDay ? 'Detailed view for the selected day.' : 'Consolidated schedule for all units.'}</p></div>
                <div className="flex items-center gap-2 lg:gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                  <button onClick={() => { setCurrentWeekOffset(prev => prev - 1); setFocusedDay(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all"><i className="fa-solid fa-chevron-left text-slate-400"></i></button>
                  <button onClick={() => { setCurrentWeekOffset(0); setFocusedDay(null); }} className="px-3 lg:px-6 py-2 text-[10px] font-black text-indigo-600 hover:bg-indigo-50 rounded-lg uppercase tracking-widest hidden sm:block">Today</button>
                  <button onClick={() => { setCurrentWeekOffset(prev => prev + 1); setFocusedDay(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all"><i className="fa-solid fa-chevron-right text-slate-400"></i></button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {focusedDay && <button onClick={() => { setFocusedDay(null); setSelectedSchoolId('all'); setSelectedTeacherId('all'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"><i className="fa-solid fa-arrow-left"></i> BACK TO WEEK</button>}
                {!focusedDay && isAdmin && !isMobile && <button onClick={() => setIsCopyWeekModalOpen(true)} className="bg-white border-2 border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-2"><i className="fa-solid fa-copy"></i> CLONE WEEK</button>}
              </div>
            </header>
            <div className="flex-1 min-h-0 flex flex-col">
              {focusedDay ? renderDailyTimetable(focusedDay) : renderWeeklyTimetable()}
            </div>
          </div>
        )}
        {view === 'settings' && isAdmin && (
          <div className="space-y-12 animate-fadeIn max-w-5xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2 pb-20">
            <header><h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Settings</h1><p className="text-slate-500 font-medium">Manage faculty and academic branches.</p></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              <section className="space-y-6">
                <div className="flex justify-between items-center px-2"><h2 className="text-xl lg:text-2xl font-black text-slate-800">Faculty</h2><button onClick={() => setTeachers([...teachers, { id: Math.random().toString(36).substr(2, 9), firstName: 'New', lastName: 'Staff', color: '#6366f1' }])} className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest">+ STAFF</button></div>
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                  {teachers.map(t => (
                    <div key={t.id} className="p-4 lg:p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <input type="color" value={t.color} onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, color: e.target.value } : item))} className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm ring-2 ring-slate-100 shrink-0" />
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3"><input value={t.firstName} onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, firstName: e.target.value } : item))} className="bg-slate-50 border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none" placeholder="First Name" /><input value={t.lastName} onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, lastName: e.target.value } : item))} className="bg-slate-50 border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none" placeholder="Last Name" /></div>
                      <button onClick={() => setTeachers(prev => prev.filter(item => item.id !== t.id))} className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  ))}
                </div>
              </section>
              <section className="space-y-6">
                <div className="flex justify-between items-center px-2"><h2 className="text-xl lg:text-2xl font-black text-slate-800">Branches</h2><button onClick={() => setSchools([...schools, { id: Math.random().toString(36).substr(2, 9), name: 'New Unit' }])} className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest">+ UNIT</button></div>
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                  {schools.map(s => (
                    <div key={s.id} className="p-4 lg:p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0">U</div>
                      <input value={s.name} onChange={e => setSchools(prev => prev.map(item => item.id === s.id ? { ...item, name: e.target.value } : item))} className="flex-1 bg-slate-50 border-none rounded-lg px-4 py-3 text-sm font-bold text-slate-700 outline-none" placeholder="Branch Name" />
                      <button onClick={() => setSchools(prev => prev.filter(item => item.id !== s.id))} className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
        {view === 'admin-manage' && (
           <div className="space-y-8 lg:space-y-12 animate-fadeIn max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2 pb-20">
             <header><h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Audit Feed</h1><p className="text-slate-500 font-medium">History of all school sessions.</p></header>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">{[...lessons].sort((a,b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)).map(l => <LessonCard key={l.id} lesson={l} teachers={teachers} schools={schools} isAdmin={isAdmin} compact={isMobile} onEdit={openEditModal} />)}</div>
           </div>
        )}
      </main>

      {/* Duplicate Week Modal */}
      {isCopyWeekModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 lg:p-10 relative">
            <h2 className="text-2xl font-black text-slate-800 mb-4">Clone Roadmap</h2>
            <p className="text-slate-500 mb-6 text-sm font-medium">Duplicate all active units to the following business week.</p>
            <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer border-2 border-transparent hover:border-indigo-100 transition-all mb-8"><input type="checkbox" checked={copyKeepTeachers} onChange={e => setCopyKeepTeachers(e.target.checked)} className="w-6 h-6 rounded-lg text-indigo-600 focus:ring-indigo-500" /><span className="font-bold text-slate-700 text-sm">Transfer staff assignments</span></label>
            <div className="flex gap-4"><button onClick={() => setIsCopyWeekModalOpen(false)} className="flex-1 px-4 py-4 text-slate-400 font-black hover:bg-slate-50 rounded-2xl text-xs uppercase tracking-widest transition-colors">Cancel</button><button onClick={handleCopyWeek} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all text-xs uppercase tracking-widest">Duplicate</button></div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {isModalOpen && editingLesson && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] lg:rounded-[3.5rem] shadow-2xl p-6 lg:p-10 relative overflow-hidden max-h-[95vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8 lg:mb-10">
              <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">{editingLesson.id && lessons.some(l => l.id === editingLesson.id) ? 'Edit Record' : 'New Session'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingLesson(null); }} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all"><i className="fa-solid fa-xmark text-slate-400 text-xl"></i></button>
            </div>
            
            {/* Form is separate from actions to prevent validation conflicts */}
            <form id="lesson-form" onSubmit={handleSaveLesson} className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Faculty Member</label>
                <select required value={editingLesson.teacherId} onChange={e => setEditingLesson({...editingLesson, teacherId: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"><option value="">Select Personnel</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}</select>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution / Branch</label>
                <select required value={editingLesson.schoolId} onChange={e => setEditingLesson({...editingLesson, schoolId: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"><option value="">Select School</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade / Level</label><input value={editingLesson.grade} onChange={e => setEditingLesson({...editingLesson, grade: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm" placeholder="e.g. Grade 10-A" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label><input required type="date" value={editingLesson.date} onChange={e => setEditingLesson({...editingLesson, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Assignment</label><input required value={editingLesson.room} onChange={e => setEditingLesson({...editingLesson, room: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 lg:px-6 py-3 lg:py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm" placeholder="e.g. Room 302" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label><input required type="time" step="300" value={editingLesson.startTime} onChange={e => { const ns = e.target.value; setEditingLesson({...editingLesson, startTime: ns, endTime: addMinutes(ns, 45)}); }} className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-4 py-3 lg:py-4 font-black text-sm" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label><input required type="time" step="300" value={editingLesson.endTime} onChange={e => setEditingLesson({...editingLesson, endTime: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-4 py-3 lg:py-4 font-black text-sm" /></div>
              </div>
              <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Notes / Topics</label><textarea rows={2} value={editingLesson.notes} onChange={e => setEditingLesson({...editingLesson, notes: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl lg:rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 resize-none text-sm" placeholder="Additional details..."></textarea></div>
            </form>

            {/* Action Buttons are OUTSIDE the form element to ensure strict separation of concerns */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 lg:gap-6 mt-4 lg:mt-8">
              {editingLesson?.id && lessons.some(l => l.id === editingLesson.id) ? (
                <button 
                  type="button" 
                  onClick={handleDeleteCurrentLesson} 
                  className="w-full sm:w-auto text-rose-500 font-black hover:bg-rose-50 px-8 py-4 rounded-2xl lg:rounded-3xl transition-all text-xs uppercase tracking-widest border border-transparent hover:border-rose-100"
                >
                  Delete Record
                </button>
              ) : <div className="hidden sm:block"></div>}
              
              <button 
                type="submit" 
                form="lesson-form" 
                className="w-full sm:flex-1 bg-indigo-600 text-white font-black py-4 lg:py-5 rounded-2xl lg:rounded-[2rem] shadow-2xl shadow-indigo-100 hover:scale-[1.02] transition-all text-xs uppercase tracking-widest"
              >
                Update Schedule
              </button>
            </div>

          </div>
        </div>
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
