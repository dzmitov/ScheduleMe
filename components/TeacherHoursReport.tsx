import React, { useState, useMemo, useEffect } from 'react';
import { Lesson, Teacher, School } from '../types';

interface TeacherHoursReportAdvancedProps {
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

interface TeacherSummary {
  teacherId: string;
  teacherName: string;
  totalLessons: number;
  totalMinutes: number;
  totalHours: number;
  avgDuration: number;
}

interface FilterVariant {
  name: string;
  dateFrom: string;
  dateTo: string;
  teacherId: string;
  schoolId: string;
  minDuration: number;
  maxDuration: number;
}

type ViewMode = 'detailed' | 'summary' | 'chart';

const TeacherHoursReportAdvanced: React.FC<TeacherHoursReportAdvancedProps> = ({ 
  lessons, 
  teachers, 
  schools 
}) => {
  // === Фильтры ===
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [minDuration, setMinDuration] = useState<number>(0);
  const [maxDuration, setMaxDuration] = useState<number>(300);
  
  // === Сортировка ===
  const [sortField, setSortField] = useState<keyof ReportRow>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // === Режим отображения ===
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');

  // === Drill-down ===
  const [selectedTeacherForDrilldown, setSelectedTeacherForDrilldown] = useState<string | null>(null);

  // === Варианты фильтров ===
  const [variants, setVariants] = useState<FilterVariant[]>([]);
  const [currentVariantName, setCurrentVariantName] = useState<string>('');

  // Загрузка вариантов из localStorage при монтировании
  useEffect(() => {
    const saved = localStorage.getItem('teacherReportVariants');
    if (saved) {
      try {
        setVariants(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load variants:', e);
      }
    }
  }, []);

  // Вычисляемые данные отчета
  const reportData = useMemo<ReportRow[]>(() => {
    let filtered = lessons.filter(lesson => {
      if (dateFrom && lesson.date < dateFrom) return false;
      if (dateTo && lesson.date > dateTo) return false;
      if (selectedTeacherId !== 'all' && lesson.teacherId !== selectedTeacherId) return false;
      if (selectedSchoolId !== 'all' && lesson.schoolId !== selectedSchoolId) return false;
      
      const startMinutes = timeToMinutes(lesson.startTime);
      const endMinutes = timeToMinutes(lesson.endTime);
      const duration = endMinutes - startMinutes;
      
      if (duration < minDuration || duration > maxDuration) return false;
      
      return true;
    });

    const rows: ReportRow[] = filtered.map(lesson => {
      const teacher = teachers.find(t => t.id === lesson.teacherId);
      const school = schools.find(s => s.id === lesson.schoolId);
      
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
  }, [lessons, teachers, schools, dateFrom, dateTo, selectedTeacherId, selectedSchoolId, minDuration, maxDuration, sortField, sortDirection]);

  // Группировка по учителям
  const teacherSummary = useMemo<TeacherSummary[]>(() => {
    const groups = new Map<string, TeacherSummary>();
    
    reportData.forEach(row => {
      const existing = groups.get(row.teacherId);
      
      if (existing) {
        existing.totalLessons++;
        existing.totalMinutes += row.durationMinutes;
      } else {
        groups.set(row.teacherId, {
          teacherId: row.teacherId,
          teacherName: row.teacherName,
          totalLessons: 1,
          totalMinutes: row.durationMinutes,
          totalHours: 0,
          avgDuration: 0
        });
      }
    });
    
    groups.forEach(summary => {
      summary.totalHours = Math.floor(summary.totalMinutes / 60);
      summary.avgDuration = Math.round(summary.totalMinutes / summary.totalLessons);
    });
    
    return Array.from(groups.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [reportData]);

  // Subtotals по датам
  const subtotalsByDate = useMemo(() => {
    const groups = new Map<string, { date: string; count: number; minutes: number }>();
    
    reportData.forEach(row => {
      const existing = groups.get(row.date);
      
      if (existing) {
        existing.count++;
        existing.minutes += row.durationMinutes;
      } else {
        groups.set(row.date, {
          date: row.date,
          count: 1,
          minutes: row.durationMinutes
        });
      }
    });
    
    return groups;
  }, [reportData]);

  // Суммы
  const totalMinutes = useMemo(() => {
    return reportData.reduce((sum, row) => sum + row.durationMinutes, 0);
  }, [reportData]);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Хелперы
  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  const handleSort = (field: keyof ReportRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Экспорт в CSV
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

  // Сохранение варианта
  const saveVariant = () => {
    const name = prompt('Enter variant name:');
    if (!name) return;
    
    const variant: FilterVariant = {
      name,
      dateFrom,
      dateTo,
      teacherId: selectedTeacherId,
      schoolId: selectedSchoolId,
      minDuration,
      maxDuration
    };
    
    const newVariants = [...variants, variant];
    setVariants(newVariants);
    localStorage.setItem('teacherReportVariants', JSON.stringify(newVariants));
    setCurrentVariantName(name);
  };

  // Загрузка варианта
  const loadVariant = (variant: FilterVariant) => {
    setDateFrom(variant.dateFrom);
    setDateTo(variant.dateTo);
    setSelectedTeacherId(variant.teacherId);
    setSelectedSchoolId(variant.schoolId);
    setMinDuration(variant.minDuration);
    setMaxDuration(variant.maxDuration);
    setCurrentVariantName(variant.name);
  };

  // Удаление варианта
  const deleteVariant = (variantName: string) => {
    if (!confirm(`Delete variant "${variantName}"?`)) return;
    const newVariants = variants.filter(v => v.name !== variantName);
    setVariants(newVariants);
    localStorage.setItem('teacherReportVariants', JSON.stringify(newVariants));
    if (currentVariantName === variantName) {
      setCurrentVariantName('');
    }
  };

  // Сброс всех фильтров
  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedTeacherId('all');
    setSelectedSchoolId('all');
    setMinDuration(0);
    setMaxDuration(300);
    setCurrentVariantName('');
  };

  // Печать
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2">
      {/* Заголовок */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            Teacher Hours Report
            {currentVariantName && (
              <span className="text-lg text-indigo-600 ml-3">({currentVariantName})</span>
            )}
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Advanced analytics with grouping, charts, and drill-down
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <button
            onClick={exportToCSV}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all text-sm"
          >
            <i className="fa-solid fa-download mr-2"></i>
            CSV
          </button>
          <button
            onClick={handlePrint}
            className="bg-slate-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all text-sm"
          >
            <i className="fa-solid fa-print mr-2"></i>
            Print
          </button>
        </div>
      </header>

      {/* Переключатель режимов */}
      <div className="flex flex-wrap gap-2 no-print">
        <button 
          onClick={() => setViewMode('detailed')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            viewMode === 'detailed' 
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <i className="fa-solid fa-table mr-2"></i>
          Detailed
        </button>
        <button 
          onClick={() => setViewMode('summary')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            viewMode === 'summary' 
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <i className="fa-solid fa-chart-simple mr-2"></i>
          Summary
        </button>
        <button 
          onClick={() => setViewMode('chart')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            viewMode === 'chart' 
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <i className="fa-solid fa-chart-bar mr-2"></i>
          Chart
        </button>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm no-print">
        <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-filter text-indigo-600"></i>
          Filters
        </h2>
        
        {/* Основные фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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

        {/* Фильтры по длительности */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Min Duration (minutes)
            </label>
            <input
              type="number"
              value={minDuration}
              onChange={(e) => setMinDuration(Number(e.target.value))}
              min={0}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Max Duration (minutes)
            </label>
            <input
              type="number"
              value={maxDuration}
              onChange={(e) => setMaxDuration(Number(e.target.value))}
              min={0}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Управление вариантами */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
          <button 
            onClick={saveVariant}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm font-bold transition-all"
          >
            <i className="fa-solid fa-save mr-2"></i>
            Save Variant
          </button>
          
          {variants.length > 0 && (
            <select 
              onChange={(e) => {
                if (e.target.value) {
                  const variant = variants.find(v => v.name === e.target.value);
                  if (variant) loadVariant(variant);
                }
              }}
              value=""
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Load Variant...</option>
              {variants.map(v => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
            </select>
          )}

          {variants.length > 0 && currentVariantName && (
            <button 
              onClick={() => deleteVariant(currentVariantName)}
              className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 text-sm font-bold transition-all"
            >
              <i className="fa-solid fa-trash mr-2"></i>
              Delete Current
            </button>
          )}

          <button 
            onClick={resetFilters}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-bold transition-all"
          >
            <i className="fa-solid fa-rotate-left mr-2"></i>
            Reset All
          </button>
        </div>
      </div>

      {/* Статистика */}
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

      {/* Содержимое в зависимости от режима */}
      {viewMode === 'detailed' && (
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
                  reportData.map((row, index) => {
                    const nextRow = reportData[index + 1];
                    const isLastInDate = !nextRow || nextRow.date !== row.date;
                    const dateSubtotal = subtotalsByDate.get(row.date);

                    return (
                      <React.Fragment key={index}>
                        <tr className="hover:bg-slate-50 transition-colors">
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
                        {isLastInDate && dateSubtotal && (
                          <tr className="bg-indigo-50 font-bold text-sm">
                            <td colSpan={4} className="px-4 py-2 text-right text-indigo-700">
                              Subtotal for {row.date}:
                            </td>
                            <td className="px-4 py-2 text-indigo-600">
                              {dateSubtotal.minutes} min ({dateSubtotal.count} lessons)
                            </td>
                            <td colSpan={3}></td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'summary' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b">
            <h3 className="text-lg font-black text-slate-800">Summary by Teacher</h3>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase">Teacher</th>
                <th className="px-4 py-3 text-right text-xs font-black text-slate-600 uppercase">Lessons</th>
                <th className="px-4 py-3 text-right text-xs font-black text-slate-600 uppercase">Total Hours</th>
                <th className="px-4 py-3 text-right text-xs font-black text-slate-600 uppercase">Avg Duration</th>
                <th className="px-4 py-3 text-center text-xs font-black text-slate-600 uppercase no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teacherSummary.map(summary => (
                <tr 
                  key={summary.teacherId} 
                  className={`hover:bg-slate-50 transition-colors ${
                    selectedTeacherForDrilldown === summary.teacherId ? 'bg-indigo-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">{summary.teacherName}</td>
                  <td className="px-4 py-3 text-right text-indigo-600 font-bold">{summary.totalLessons}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                    {summary.totalHours}h {summary.totalMinutes % 60}m
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{summary.avgDuration} min</td>
                  <td className="px-4 py-3 text-center no-print">
                    <button
                      onClick={() => setSelectedTeacherForDrilldown(
                        selectedTeacherForDrilldown === summary.teacherId ? null : summary.teacherId
                      )}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                    >
                      {selectedTeacherForDrilldown === summary.teacherId ? (
                        <>
                          <i className="fa-solid fa-chevron-up mr-1"></i>
                          Hide Details
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-chevron-down mr-1"></i>
                          Show Details
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Drill-down details */}
          {selectedTeacherForDrilldown && (
            <div className="p-4 bg-indigo-50 border-t border-indigo-200">
              <h4 className="text-md font-black text-slate-800 mb-3">
                Lesson Details for {teacherSummary.find(t => t.teacherId === selectedTeacherForDrilldown)?.teacherName}
              </h4>
              <div className="bg-white rounded-lg overflow-hidden border border-indigo-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Duration</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">School</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Subject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData
                      .filter(row => row.teacherId === selectedTeacherForDrilldown)
                      .map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2">{row.date}</td>
                          <td className="px-3 py-2 font-mono">{row.startTime} - {row.endTime}</td>
                          <td className="px-3 py-2 font-bold text-indigo-600">{row.durationMinutes}m</td>
                          <td className="px-3 py-2">{row.schoolName}</td>
                          <td className="px-3 py-2">{row.subject} ({row.grade})</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'chart' && (
        <div className="space-y-6">
          {/* Bar chart визуализация */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="text-lg font-black text-slate-800 mb-6">Hours Distribution by Teacher</h3>
            <div className="space-y-3">
              {teacherSummary.map(summary => {
                const maxHours = Math.max(...teacherSummary.map(s => s.totalHours));
                const widthPercent = maxHours > 0 ? (summary.totalHours / maxHours) * 100 : 0;
                
                return (
                  <div key={summary.teacherId} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-semibold truncate text-right" title={summary.teacherName}>
                      {summary.teacherName}
                    </div>
                    <div className="flex-1 relative h-10 bg-slate-100 rounded-lg overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-end px-3 transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      >
                        {widthPercent > 15 && (
                          <span className="text-white text-sm font-bold">
                            {summary.totalHours}h {summary.totalMinutes % 60}m
                          </span>
                        )}
                      </div>
                      {widthPercent <= 15 && (
                        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-600">
                          {summary.totalHours}h {summary.totalMinutes % 60}m
                        </span>
                      )}
                    </div>
                    <div className="w-20 text-sm text-slate-600 text-right">
                      {summary.totalLessons} lessons
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Дополнительная визуализация - топ учителей */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="text-lg font-black text-slate-800 mb-6">Top 5 Teachers by Hours</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {teacherSummary.slice(0, 5).map((summary, index) => (
                <div 
                  key={summary.teacherId}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-100 relative overflow-hidden"
                >
                  <div className="absolute top-2 right-2 text-4xl font-black text-indigo-100">
                    #{index + 1}
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-black text-indigo-600 uppercase mb-1">
                      {summary.teacherName}
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {summary.totalHours}h {summary.totalMinutes % 60}m
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {summary.totalLessons} lessons
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSS для печати */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          body {
            margin: 0;
            padding: 10mm;
          }
        }
      `}</style>
    </div>
  );
};

export default TeacherHoursReportAdvanced;
