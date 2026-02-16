
import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import Sidebar from './components/Sidebar';
import LessonCard from './components/LessonCard';
import { Lesson, LessonStatus, ViewType, Teacher, School, AppUser } from './types';
import {
  fetchLessons,
  addLesson,
  updateLesson,
  deleteLesson,
  fetchTeachers,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  fetchSchools,
  addSchool,
  updateSchool,
  deleteSchool,
  fetchUsers,
  addUser,
  updateUser,
  deleteUser,
  checkUserRole,
} from './src/services/dbService';

const toLocalDateStr = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
  const { user, isSignedIn, isLoaded } = useUser();
  const [view, setView] = useState<ViewType>('dashboard');
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

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
  const [userRole, setUserRole] = useState<{ isAdmin: boolean; role: string; teacherId?: string; userId?: string } | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Admin check using the database
  const isAdmin = userRole?.isAdmin || false;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check user role when signed in
  useEffect(() => {
    if (isSignedIn && user?.primaryEmailAddress?.emailAddress) {
      const email = user.primaryEmailAddress.emailAddress;
      
      // Add debugger for role verification
      debugger;
      
      checkUserRole(email)
        .then(role => {
          console.log('User role:', role); // For debugging
          setUserRole(role);
        })
        .catch(err => {
          console.error('Error checking user role:', err);
          // Fallback to default admin if it's dzmitov@gmail.com
          if (email === 'dzmitov@gmail.com') {
            setUserRole({ isAdmin: true, role: 'admin' });
          } else {
            setUserRole({ isAdmin: false, role: 'viewer' });
          }
        });
    }
  }, [isSignedIn, user]);

  // Load application data
  useEffect(() => {
    Promise.all([
      fetchLessons()
        .then(setLessons)
        .catch((err) => setLessonsError(err instanceof Error ? err.message : 'Failed to load lessons')),
      fetchTeachers()
        .then(setTeachers)
        .catch((err) => setTeachersError(err instanceof Error ? err.message : 'Failed to load teachers')),
      fetchSchools()
        .then(setSchools)
        .catch((err) => setSchoolsError(err instanceof Error ? err.message : 'Failed to load schools')),
      fetchUsers()
        .then(setUsers)
        .catch((err) => setUsersError(err instanceof Error ? err.message : 'Failed to load users')),
    ]).finally(() => setDataLoading(false));
  }, []);

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

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !isAdmin) return;
    let finalSchoolId = editingLesson.schoolId || (schools.length > 0 ? schools[0].id : '');
    const l = { ...editingLesson, schoolId: finalSchoolId, subject: 'English', status: LessonStatus.UPCOMING } as Lesson;
    const isUpdate = lessons.some((item) => item.id === l.id);
    try {
      if (isUpdate) {
        await updateLesson(l);
      } else {
        await addLesson(l);
      }
      setLessons((prev) => {
        const idx = prev.findIndex((item) => item.id === l.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = l;
          return next;
        }
        return [...prev, l];
      });
      setIsModalOpen(false);
      setEditingLesson(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to save lesson');
    }
  };

  // ROBUST DELETE LOGIC
  const handleDeleteCurrentLesson = async () => {
    if (!isAdmin || !editingLesson?.id) return;
    
    // Check if it's a real lesson that exists in state
    const exists = lessons.some(l => l.id === editingLesson.id);
    if (!exists) return;

    const confirmMessage = "Are you sure you want to permanently delete this lesson? This action cannot be undone.";
    if (window.confirm(confirmMessage)) {
      const idToDelete = editingLesson.id;
      try {
        await deleteLesson(idToDelete);
        setLessons((currentLessons) => currentLessons.filter((lesson) => lesson.id !== idToDelete));
        setIsModalOpen(false);
        setEditingLesson(null);
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'Failed to delete lesson');
      }
    }
  };

  const handleCopyWeek = async () => {
    if (!isAdmin) return;
    const dayStrings = weekDays.map((d) => toLocalDateStr(d));
    const currentWeekLessons = lessons.filter((l) => dayStrings.includes(l.date));
    if (currentWeekLessons.length === 0) {
      alert('No sessions found to duplicate.');
      return;
    }
    const newLessons = currentWeekLessons.map((l) => {
      const d = new Date(l.date);
      d.setDate(d.getDate() + 7);
      return {
        ...l,
        id: Math.random().toString(36).substr(2, 9),
        date: toLocalDateStr(d),
        teacherId: copyKeepTeachers ? l.teacherId : '',
        status: LessonStatus.UPCOMING,
      };
    });
    try {
      await Promise.all(newLessons.map((lesson) => addLesson(lesson)));
      setLessons((prev) => [...prev, ...newLessons]);
      setIsCopyWeekModalOpen(false);
      alert(`Successfully cloned ${newLessons.length} sessions.`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to clone week');
    }
  };

  const handleAddTeacher = async () => {
    const newTeacher: Teacher = {
      id: Math.random().toString(36).substr(2, 9),
      firstName: 'New',
      lastName: 'Staff',
      color: '#6366f1',
    };
    try {
      const saved = await addTeacher(newTeacher);
      setTeachers((prev) => [...prev, saved]);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to add teacher');
    }
  };

  const handleTeacherBlur = async (id: string) => {
    const teacher = teachers.find((x) => x.id === id);
    if (!teacher) return;
    try {
      await updateTeacher(teacher);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to save teacher');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await deleteTeacher(id);
      setTeachers((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete teacher');
    }
  };

  const handleAddSchool = async () => {
    const newSchool: School = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Unit',
    };
    try {
      const saved = await addSchool(newSchool);
      setSchools((prev) => [...prev, saved]);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to add school');
    }
  };

  const handleSchoolBlur = async (id: string) => {
    const school = schools.find((x) => x.id === id);
    if (!school) return;
    try {
      await updateSchool(school);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to save school');
    }
  };

  const handleDeleteSchool = async (id: string) => {
    try {
      await deleteSchool(id);
      setSchools((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete school');
    }
  };

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-indigo-600 mb-4"></i>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

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
      <Sidebar currentView={view} onViewChange={(v) => { setView(v); setFocusedDay(null); }} />
      <main className="flex-1 flex flex-col overflow-hidden p-4 lg:p-12">
        {lessonsError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-800 text-sm font-medium">
            Lessons: {lessonsError}
          </div>
        )}
        {teachersError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-800 text-sm font-medium">
            Teachers: {teachersError}
          </div>
        )}
        {schoolsError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-800 text-sm font-medium">
            Schools: {schoolsError}
          </div>
        )}
        {dataLoading && !lessonsError && !teachersError && !schoolsError && (
          <p className="text-slate-500 text-sm font-medium mb-2">Loading...</p>
        )}
        {view === 'dashboard' && (
          <div className="space-y-8 lg:space-y-12 animate-fadeIn max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div><h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Overview</h1><p className="text-slate-500 mt-2 font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Session active for <span className="text-indigo-600 font-bold">{user.fullName || user.firstName || 'User'}</span></p></div>
              {isAdmin && <button onClick={() => openEditModal()} className="bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0 text-sm lg:text-base">+ New Session</button>}
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              <div className="bg-white p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center"><p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">Volume</p><div className="flex items-baseline gap-2"><p className="text-5xl lg:text-6xl font-black text-indigo-600">{stats.total}</p><span className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">total units</span></div></div>
{/* <div className="bg-indigo-600 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden flex flex-col justify-center"><p className="opacity-70 text-[11px] font-black uppercase tracking-widest mb-1">AI Guidance</p><p className="text-base lg:text-lg font-bold italic leading-snug z-10">"{aiAdvice || "Calculating optimal patterns..."}"</p><i className="fa-solid fa-bolt absolute -right-4 -bottom-4 text-white/10 text-9xl"></i></div> */}
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
            <header><h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Settings</h1><p className="text-slate-500 font-medium">Manage faculty, academic branches, and user access.</p></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              <section className="space-y-6">
                <div className="flex justify-between items-center px-2"><h2 className="text-xl lg:text-2xl font-black text-slate-800">Faculty</h2><button onClick={handleAddTeacher} className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest">+ STAFF</button></div>
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                  {teachers.map(t => (
                    <div key={t.id} className="p-4 lg:p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <input type="color" value={t.color} onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, color: e.target.value } : item))} onBlur={() => handleTeacherBlur(t.id)} className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm ring-2 ring-slate-100 shrink-0" />
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3"><input value={t.firstName} onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, firstName: e.target.value } : item))} onBlur={() => handleTeacherBlur(t.id)} className="bg-slate-50 border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none" placeholder="First Name" /><input value={t.lastName} onChange={e => setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, lastName: e.target.value } : item))} onBlur={() => handleTeacherBlur(t.id)} className="bg-slate-50 border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none" placeholder="Last Name" /></div>
                      <button onClick={() => handleDeleteTeacher(t.id)} className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  ))}
                </div>
              </section>
              <section className="space-y-6">
                <div className="flex justify-between items-center px-2"><h2 className="text-xl lg:text-2xl font-black text-slate-800">Branches</h2><button onClick={handleAddSchool} className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest">+ UNIT</button></div>
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                  {schools.map(s => (
                    <div key={s.id} className="p-4 lg:p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0">U</div>
                      <input value={s.name} onChange={e => setSchools(prev => prev.map(item => item.id === s.id ? { ...item, name: e.target.value } : item))} onBlur={() => handleSchoolBlur(s.id)} className="flex-1 bg-slate-50 border-none rounded-lg px-4 py-3 text-sm font-bold text-slate-700 outline-none" placeholder="Branch Name" />
                      <button onClick={() => handleDeleteSchool(s.id)} className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            
            {/* User Management Section */}
            <section className="space-y-6 mt-12">
              <div className="flex justify-between items-center px-2">
                <h2 className="text-xl lg:text-2xl font-black text-slate-800">User Access</h2>
                <button 
                  onClick={() => {
                    setEditingUser({
                      id: Math.random().toString(36).substring(2, 11),
                      email: '',
                      role: 'viewer'
                    });
                    setIsUserModalOpen(true);
                  }} 
                  className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest"
                >
                  + USER
                </button>
              </div>
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</div>
                    <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</div>
                    <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</div>
                    <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</div>
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {users.map(user => (
                    <div key={user.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-5 font-medium text-slate-700 truncate">{user.email}</div>
                        <div className="col-span-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-indigo-100 text-indigo-800' 
                              : user.role === 'teacher' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-slate-100 text-slate-800'
                          }`}>
                            {user.role === 'admin' ? 'Administrator' : user.role === 'teacher' ? 'Teacher' : 'Viewer'}
                          </span>
                        </div>
                        <div className="col-span-3 text-sm text-slate-500 truncate">
                          {user.teacherName || (user.teacherId ? 'Assigned' : '-')}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button 
                            onClick={() => {
                              setEditingUser(user);
                              setIsUserModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      <p>No users found. Add your first user to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
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
      
      {/* User Edit Modal */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-6 lg:p-8 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingUser.id && users.some(u => u.id === editingUser.id) ? 'Edit User' : 'New User'}
              </h2>
              <button 
                onClick={() => { 
                  setIsUserModalOpen(false); 
                  setEditingUser(null); 
                }} 
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all"
              >
                <i className="fa-solid fa-xmark text-slate-400 text-xl"></i>
              </button>
            </div>
            
            <form 
              id="user-form" 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editingUser || !isAdmin) return;
                
                try {
                  const isUpdate = users.some(u => u.id === editingUser.id);
                  let savedUser;
                  
                  if (isUpdate) {
                    savedUser = await updateUser(editingUser as AppUser);
                    setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
                  } else {
                    savedUser = await addUser(editingUser as AppUser);
                    setUsers(prev => [...prev, savedUser]);
                  }
                  
                  setIsUserModalOpen(false);
                  setEditingUser(null);
                } catch (err) {
                  console.error(err);
                  alert(err instanceof Error ? err.message : 'Failed to save user');
                }
              }} 
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={editingUser.email} 
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                  className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm" 
                  placeholder="user@example.com"
                  disabled={editingUser.email === 'dzmitov@gmail.com'} // Prevent changing the default admin email
                />
                {editingUser.email === 'dzmitov@gmail.com' && (
                  <p className="text-xs text-amber-600 ml-1 mt-1">Default admin email cannot be changed</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                <select 
                  required 
                  value={editingUser.role} 
                  onChange={e => setEditingUser({...editingUser, role: e.target.value as AppUser['role']})} 
                  className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
                >
                  <option value="admin">Administrator</option>
                  <option value="teacher">Teacher</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Linked Teacher (Optional)</label>
                <select 
                  value={editingUser.teacherId || ''} 
                  onChange={e => setEditingUser({...editingUser, teacherId: e.target.value || undefined})} 
                  className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
                >
                  <option value="">No Teacher Link</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 ml-1 mt-1">Link to a teacher account for calendar access</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
                {editingUser.id && users.some(u => u.id === editingUser.id) && editingUser.email !== 'dzmitov@gmail.com' ? (
                  <button 
                    type="button" 
                    onClick={async () => {
                      if (!editingUser.id || !window.confirm('Are you sure you want to delete this user?')) return;
                      
                      try {
                        await deleteUser(editingUser.id);
                        setUsers(prev => prev.filter(u => u.id !== editingUser.id));
                        setIsUserModalOpen(false);
                        setEditingUser(null);
                      } catch (err) {
                        console.error(err);
                        alert(err instanceof Error ? err.message : 'Failed to delete user');
                      }
                    }} 
                    className="w-full sm:w-auto text-rose-500 font-black hover:bg-rose-50 px-6 py-3 rounded-xl transition-all text-xs uppercase tracking-widest border border-transparent hover:border-rose-100"
                  >
                    Delete User
                  </button>
                ) : <div className="hidden sm:block"></div>}
                
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
