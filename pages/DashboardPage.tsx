import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lesson, Teacher, School } from '../../types';
import LessonCard from '../LessonCard';
import { toLocalDateStr } from '../../src/utils/dateUtils';

interface DashboardPageProps {
  lessons: Lesson[];
  teachers: Teacher[];
  schools: School[];
  isAdmin: boolean;
  isMobile: boolean;
  defaultTeacherFilter: string;
  onNewLesson: () => void;
  onEditLesson: (lesson: Lesson) => void;
}

/**
 * Страница Dashboard — обзор ближайших уроков.
 * ABAP-аналогия: отдельная транзакция "Обзор расписания"
 * с ALV-листом ближайших занятий, сгруппированных по дате.
 */
const DashboardPage: React.FC<DashboardPageProps> = ({
  lessons,
  teachers,
  schools,
  isAdmin,
  isMobile,
  defaultTeacherFilter,
  onNewLesson,
  onEditLesson,
}) => {
  const navigate = useNavigate();
  const [teacherFilter, setTeacherFilter] = useState<string>(defaultTeacherFilter);

  const stats = useMemo(() => ({ total: lessons.length }), [lessons]);

  // Группируем ближайшие уроки по дате (максимум 5 дней вперёд)
  // ABAP-аналогия: LOOP AT lt_lessons WHERE date >= sy-datum
  //   с промежуточным итогом AT NEW date
  const dayGroups = useMemo(() => {
    const todayStr = toLocalDateStr(new Date());

    const filtered = [...lessons]
      .filter(l => {
        if (l.date < todayStr) return false;
        if (teacherFilter !== 'all' && l.teacherId !== teacherFilter) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    const groups: { date: string; lessons: Lesson[] }[] = [];
    for (const lesson of filtered) {
      const last = groups[groups.length - 1];
      if (last && last.date === lesson.date) {
        last.lessons.push(lesson);
      } else {
        if (groups.length >= 5) break;
        groups.push({ date: lesson.date, lessons: [lesson] });
      }
    }
    return groups;
  }, [lessons, teacherFilter]);

  return (
    <div className="space-y-8 lg:space-y-12 animate-fadeIn max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Overview</h1>
        </div>
        {isAdmin && (
          <button
            onClick={onNewLesson}
            className="bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0 text-sm lg:text-base"
          >
            + New Class
          </button>
        )}
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">Volume</p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl lg:text-6xl font-black text-indigo-600">{stats.total}</p>
            <span className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">total units</span>
          </div>
        </div>
      </div>

      {/* Upcoming lessons */}
      <section>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">Upcoming roadmap</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
              <i className="fa-solid fa-chalkboard-user text-indigo-400 text-sm"></i>
              <select
                value={teacherFilter}
                onChange={e => setTeacherFilter(e.target.value)}
                className="text-sm font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer pr-1"
              >
                <option value="all">All Teachers</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => navigate('/schedule')}
              className="text-indigo-600 font-black text-sm hover:underline whitespace-nowrap"
            >
              Full Timetable
            </button>
          </div>
        </div>

        {dayGroups.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <i className="fa-solid fa-calendar-xmark text-4xl mb-3"></i>
            <p className="font-bold">No upcoming lessons found</p>
          </div>
        ) : (
          <div className="space-y-8 pb-10">
            {dayGroups.map(group => {
              const dayDate = new Date(group.date + 'T12:00:00');
              const todayStr = toLocalDateStr(new Date());
              const isToday = group.date === todayStr;
              const dayLabel = isToday
                ? 'Today'
                : dayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

              return (
                <div key={group.date}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                      isToday ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
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
                        onEdit={onEditLesson}
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
  );
};

export default DashboardPage;
