import React, { useState, useEffect, useMemo } from 'react';
import CourseTable from './components/CourseTable';
import TimeFilter from './components/TimeFilter';
import RawDataInput from './components/RawDataInput';
import { parseSchedule } from './utils/parseSchedule';
import { parseRawCourseData } from './utils/parseRawData';
import './App.css';

/**
 * @typedef {import('./components/TimeFilter').TimeRange} TimeRange
 * @typedef {import('./utils/parseRawData').Course} Course // Use Course type from parser
 */

const LOCAL_STORAGE_KEYS = {
  COURSES: 'courseBuilder_allCourses',
  EXCLUDED_DAYS: 'courseBuilder_excludedDays',
  EXCLUDED_RANGES: 'courseBuilder_excludedTimeRanges',
  THEME: 'courseBuilder_theme',
  GROUPING: 'courseBuilder_groupingKey',
};

const ALLOWED_GROUPING_KEYS = ['none', 'offeringDept', 'subject'];

const loadFromLocalStorage = (key, defaultValue) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) { return defaultValue; }
    const parsed = JSON.parse(saved);

    if (key === LOCAL_STORAGE_KEYS.THEME) {
        return parsed === 'light' ? 'light' : 'dark';
    }
    if (key === LOCAL_STORAGE_KEYS.GROUPING) {
        return ALLOWED_GROUPING_KEYS.includes(parsed) ? parsed : 'subject';
    }
    return parsed;
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage:`, e);
    if (key === LOCAL_STORAGE_KEYS.GROUPING) return 'subject';
    if (key === LOCAL_STORAGE_KEYS.THEME) return 'dark';
    return defaultValue;
  }
};


function App() {
  const [allCourses, setAllCourses] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.COURSES, []));
  const [excludedDays, setExcludedDays] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.EXCLUDED_DAYS, []));
  const [excludedTimeRanges, setExcludedTimeRanges] = useState(() => {
    const savedRanges = loadFromLocalStorage(LOCAL_STORAGE_KEYS.EXCLUDED_RANGES, null);
    return Array.isArray(savedRanges) && savedRanges.length > 0 ? savedRanges : [{ id: Date.now(), start: '', end: '' }];
  });
  const [rawData, setRawData] = useState('');
  const [theme, setTheme] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.THEME, 'dark'));
  const [groupingKey, setGroupingKey] = useState(() =>
    loadFromLocalStorage(LOCAL_STORAGE_KEYS.GROUPING, 'subject')
  );
  const [processedCourses, setProcessedCourses] = useState([]);

  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.COURSES, JSON.stringify(allCourses)); }, [allCourses]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.EXCLUDED_DAYS, JSON.stringify(excludedDays)); }, [excludedDays]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.EXCLUDED_RANGES, JSON.stringify(excludedTimeRanges)); }, [excludedTimeRanges]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, JSON.stringify(theme)); document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.GROUPING, JSON.stringify(groupingKey)); }, [groupingKey]);

  useEffect(() => {
    const filtered = allCourses.filter(course => {
      if (course.isLocked) return true;
      const parsedSchedule = parseSchedule(course.schedule);
      if (!parsedSchedule || parsedSchedule.isTBA) return true;
      const runsOnAnExcludedDay = parsedSchedule.days.some(day => excludedDays.includes(day));
      if (runsOnAnExcludedDay) return false;
      const overlapsWithAnyExcludedTime = excludedTimeRanges.some(range => {
        if (range.start && range.end) {
          const excludedStart = range.start; const excludedEnd = range.end;
          const courseStart = parsedSchedule.startTime; const courseEnd = parsedSchedule.endTime;
          if (courseStart && courseEnd) return courseStart < excludedEnd && courseEnd > excludedStart;
        }
        return false;
      });
      return !overlapsWithAnyExcludedTime;
    });

    if (groupingKey === 'none') {
      setProcessedCourses(filtered);
    } else {
      const groups = filtered.reduce((acc, course) => {
        const groupValue = course[groupingKey] || 'Unknown';
        if (!acc[groupValue]) { acc[groupValue] = []; }
        acc[groupValue].push(course);
        return acc;
      }, {});
      const groupedArray = Object.entries(groups)
        .map(([groupValue, courses]) => ({
          groupValue,
          courses: courses.sort((a, b) => {
              const subjectCompare = a.subject.localeCompare(b.subject);
              if (subjectCompare !== 0) return subjectCompare;
              return a.section.localeCompare(b.section);
          }),
        }))
        .sort((a, b) => a.groupValue.localeCompare(b.groupValue));
      setProcessedCourses(groupedArray);
    }
  }, [allCourses, excludedDays, excludedTimeRanges, groupingKey]);

  const handleDayChange = (dayCode, isChecked) => { setExcludedDays(prev => isChecked ? [...prev, dayCode] : prev.filter(d => d !== dayCode)); };
  const handleTimeRangeChange = (id, field, value) => { setExcludedTimeRanges(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r)); };
  const handleAddTimeRange = () => { setExcludedTimeRanges(prev => [...prev, { id: Date.now(), start: '', end: '' }]); };
  const handleRemoveTimeRange = (id) => { if (excludedTimeRanges.length <= 1) return; setExcludedTimeRanges(prev => prev.filter(r => r.id !== id)); };
  const handleLoadRawData = () => { const p = parseRawCourseData(rawData); setAllCourses(p); alert(`Loaded ${p.length} courses!`); };
  const handleDeleteCourse = (id) => { setAllCourses(prev => prev.filter(c => c.id !== id)); };
  const handleDeleteAllCourses = () => { if (!window.confirm("Delete ALL courses?")) return; setAllCourses([]); setRawData(''); };
  const handleToggleLockCourse = (id) => { setAllCourses(prev => prev.map(c => c.id === id ? { ...c, isLocked: !c.isLocked } : c)); };
  const handleToggleTheme = () => { setTheme(prev => (prev === 'light' ? 'dark' : 'light')); };
  const handleGroupingChange = (event) => { setGroupingKey(event.target.value); };

  const displayedCount = useMemo(() => {
    if (!Array.isArray(processedCourses)) return 0;
    if (groupingKey === 'none') {
      return processedCourses.length;
    } else {
      return processedCourses.reduce((sum, group) => {
        if (group && Array.isArray(group.courses)) {
          return sum + group.courses.length;
        }
        console.warn("Unexpected item structure in processedCourses during count:", group);
        return sum;
      }, 0);
    }
  }, [processedCourses, groupingKey]);

  return (
    <div className="App" data-theme={theme}>
      <div className="header-controls">
          <h1>CITU AIMS Course Scheduler</h1>
          <button onClick={handleToggleTheme} className="theme-toggle-button">
              Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
      </div>

      <RawDataInput rawData={rawData} onRawDataChange={setRawData} onLoadData={handleLoadRawData} />
      <hr />
      <div className="filter-section section-container">
        <h2>Filter by Time</h2>
        <TimeFilter excludedDays={excludedDays} onDayChange={handleDayChange} excludedTimeRanges={excludedTimeRanges} onTimeRangeChange={handleTimeRangeChange} onAddTimeRange={handleAddTimeRange} onRemoveTimeRange={handleRemoveTimeRange} />
      </div>
      <hr />
      <div className="table-container section-container">
        <div className="table-header-controls">
            <h2>Available Courses ({displayedCount} showing / {allCourses.length} total)</h2>
            <div className="grouping-controls">
                <label htmlFor="grouping-select">Group by: </label>
                <select id="grouping-select" value={groupingKey} onChange={handleGroupingChange}>
                    <option value="none">None</option>
                    <option value="offeringDept">Offering Dept.</option>
                    <option value="subject">Subject</option>
                </select>
            </div>
            {allCourses.length > 0 && ( <button onClick={handleDeleteAllCourses} className="delete-all-button danger-button"> Delete All Courses </button> )}
        </div>
        <CourseTable
            courses={processedCourses}
            groupingKey={groupingKey}
            onDeleteCourse={handleDeleteCourse}
            onToggleLock={handleToggleLockCourse}
        />
      </div>
    </div>
  );
}

export default App;