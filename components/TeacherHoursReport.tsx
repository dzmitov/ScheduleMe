import React, { useState, useMemo } from 'react';
import { Lesson, Teacher, School } from '../types';

interface TeacherHoursReportProps {
  lessons: Lesson[];
  teachers: Teacher[];
  schools: School[];
}

interface ReportRow {
  teacherName: string;
  teacherId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  schoolName: string;
  subject: string;
  grade: string;
}

const TeacherHoursReport: React.FC<TeacherHoursReportProps> = ({ lessons, teachers, schools }) => {
  // === Фильтры (аналог Selection Screen в ABAP) ===
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  
  // === Сортировка (аналог SORT BY в ABAP) ===
  const [sortField, setSortField] = useState<keyof ReportRow>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Вычисляемые данные отчета (аналог Internal Table после SELECT + обработки)
  const reportData = useMemo<ReportRow[]>(() => {
    // SELECT * FROM lessons WHERE ... (фильтрация)
    let filtered = lessons.filter(lesson => {
      // Фильтр по датам
      if (dateFrom && lesson.date < dateFrom) return false;
      if (dateTo && lesson.date > dateTo) return false;
      
      // Фильтр по учителю
      if (selectedTeacherId !== 'all' && lesson.teacherId !== selectedTeacherId) return false;
      
      // Фильтр по школе
      if (selectedSchoolId !== 'all' && lesson.schoolId !== selectedSchoolId) return false;
      
      return true;
    });

    // LOOP AT filtered INTO lesson + обработка
    const rows: ReportRow[] = filtered.map(lesson => {
      const teacher = teachers.find(t => t.id === lesson.teacherId);
      const school = schools.find(s => s.id === lesson.schoolId);
      
      // Вычисление длительности в минутах
      const startMinutes = timeToMinutes(lesson.startTime);
      const endMinutes = timeToMinutes(lesson.endTime);
      const durationMinutes = endMinutes - startMinutes;

      return {
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown',
        teacherId: lesson.teacherId,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        durationMinutes,
        schoolName: school?.name || 'Unknown',
        subject: lesson.subject,
        grade: lesson.grade,
      };
    });

    // SORT BY (сортировка)
    rows.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal);
      const bStr = String(bVal);
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });

    return rows;
  }, [lessons, teachers, schools, dateFrom, dateTo, selectedTeacherId, selectedSchoolId, sortField, sortDirection]);

  // Суммы (аналог SUM в ABAP)
  const totalMinutes = useMemo(() => {
    return reportData.reduce((sum, row) => sum + row.durationMinutes, 0);
  }, [reportData]);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Хелпер для конвертации времени в минуты
  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Обработчик клика по заголовку колонки для сортировки
  const handleSort = (field: keyof ReportRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Экспорт в CSV (аналог DOWNLOAD в ABAP)
  const exportToCSV = () => {
    const headers = ['Teacher', 'Date', 'Start Time', 'End Time', 'Duration (min)', 'School', 'Subject', 'Grade'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => [
        `"${row.teacherName}"`,
        row.date,
        row.startTime,
        row.endTime,
        row.durationMinutes,
        `"${row.schoolName}"`,
        `"${row.subject}"`,
        `"${row.grade}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `teacher_hours_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2">
      {/* Заголовок отчета */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            Teacher Hours Report
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Detailed breakdown of teaching time
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-1 transition-all active:translate-y-0 text-sm lg:text-base"
        >
          <i className="fa-solid fa-download mr-2"></i>
          Export CSV
        </button>
      </header>

      {/* Selection Screen - Фильтры */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-filter text-indigo-600"></i>
          Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Фильтр: Дата от */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Фильтр: Дата до */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Фильтр: Учитель */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Teacher
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="all">All Teachers</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Фильтр: Школа */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              School
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="all">All Schools</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Статистика (аналог footer в ALV) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <p className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-1">Total Lessons</p>
          <p className="text-3xl font-black text-indigo-900">{reportData.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-1">Total Hours</p>
          <p className="text-3xl font-black text-emerald-900">{totalHours}h {remainingMinutes}m</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-black text-amber-600 uppercase tracking-wider mb-1">Average Duration</p>
          <p className="text-3xl font-black text-amber-900">
            {reportData.length > 0 ? Math.round(totalMinutes / reportData.length) : 0} min
          </p>
        </div>
      </div>

      {/* ALV Grid - Таблица с данными */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th 
                  onClick={() => handleSort('teacherName')}
                  className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Teacher
                    {sortField === 'teacherName' && (
                      <i className={`fa-solid fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-indigo-600`}></i>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortField === 'date' && (
                      <i className={`fa-solid fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-indigo-600`}></i>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('startTime')}
                  className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Start Time
                    {sortField === 'startTime' && (
                      <i className={`fa-solid fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-indigo-600`}></i>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('endTime')}
                  className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    End Time
                    {sortField === 'endTime' && (
                      <i className={`fa-solid fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-indigo-600`}></i>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('durationMinutes')}
                  className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Duration (min)
                    {sortField === 'durationMinutes' && (
                      <i className={`fa-solid fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-indigo-600`}></i>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('schoolName')}
                  className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    School
                    {sortField === 'schoolName' && (
                      <i className={`fa-solid fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-indigo-600`}></i>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    <i className="fa-solid fa-inbox text-3xl mb-2"></i>
                    <p className="font-medium">No data found for selected filters</p>
                  </td>
                </tr>
              ) : (
                reportData.map((row, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {row.teacherName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(row.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">
                      {row.startTime}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">
                      {row.endTime}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-indigo-600">
                      {row.durationMinutes}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {row.schoolName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {row.subject}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {row.grade}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherHoursReport;
