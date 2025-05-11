import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import CourseTable from './components/CourseTable';
import RawDataInput from './components/RawDataInput';
import TimeFilter from './components/TimeFilter';
import { parseRawCourseData } from './utils/parseRawData';
import { parseSchedule } from './utils/parseSchedule';

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
  SECTION_TYPES: 'courseBuilder_selectedSectionTypes',
  STATUS_FILTER: 'courseBuilder_selectedStatusFilter',
};

const ALLOWED_GROUPING_KEYS = ['none', 'offeringDept', 'subject'];
const SECTION_TYPE_SUFFIXES = ['AP3', 'AP4', 'AP5'];
const ALLOWED_STATUS_FILTERS = ['all', 'open', 'closed'];

const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M21,5c0-1.1-0.9-2-2-2H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5z M12,18l-4-4h8L12,18z M12,14l-4-4h8 L12,14z M12,10L8,6h8L12,10z" />
  </svg>
);

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
    if (key === LOCAL_STORAGE_KEYS.SECTION_TYPES) {
      return Array.isArray(parsed) ? parsed.filter(type => SECTION_TYPE_SUFFIXES.includes(type)) : defaultValue;
    }
    if (key === LOCAL_STORAGE_KEYS.STATUS_FILTER) {
      return ALLOWED_STATUS_FILTERS.includes(parsed) ? parsed : defaultValue;
    }
    if (key === LOCAL_STORAGE_KEYS.COURSES) {
      return Array.isArray(parsed) ? parsed : defaultValue;
    }
    if (key === LOCAL_STORAGE_KEYS.EXCLUDED_DAYS) {
      return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : defaultValue;
    }
    if (key === LOCAL_STORAGE_KEYS.EXCLUDED_RANGES) {
      return Array.isArray(parsed) && parsed.every(item => typeof item === 'object' && item !== null && 'id' in item && 'start' in item && 'end' in item) ? parsed : defaultValue;
    }

    return parsed;
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage:`, e);
    if (key === LOCAL_STORAGE_KEYS.GROUPING) return 'subject';
    if (key === LOCAL_STORAGE_KEYS.THEME) return 'dark';
    if (key === LOCAL_STORAGE_KEYS.SECTION_TYPES) return [];
    if (key === LOCAL_STORAGE_KEYS.STATUS_FILTER) return 'open';
    if (key === LOCAL_STORAGE_KEYS.COURSES) return [];
    if (key === LOCAL_STORAGE_KEYS.EXCLUDED_DAYS) return [];
    if (key === LOCAL_STORAGE_KEYS.EXCLUDED_RANGES) return [{ id: Date.now(), start: '', end: '' }];
    return defaultValue;
  }
};

const getSectionTypeSuffix = (sectionString) => {
  if (typeof sectionString !== 'string') return null;
  const parts = sectionString.split('-');
  const lastPart = parts[parts.length - 1];
  return SECTION_TYPE_SUFFIXES.includes(lastPart) ? lastPart : null;
};

/**
 * Checks if two time intervals overlap.
 * Assumes times are in "HH:mm" format.
 * @param {string} start1 Start time of the first interval
 * @param {string} end1 End time of the first interval
 * @param {string} start2 Start time of the second interval
 * @param {string} end2 End time of the second interval
 * @returns {boolean} True if the intervals overlap, false otherwise.
 */
function checkTimeOverlap(start1, end1, start2, end2) {
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(start1) || !timeRegex.test(end1) || !timeRegex.test(start2) || !timeRegex.test(end2)) {
    return false;
  }
  return start1 < end2 && end1 > start2;
}


function App() {
  const [allCourses, setAllCourses] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.COURSES, []));
  const [excludedDays, setExcludedDays] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.EXCLUDED_DAYS, []));
  const [excludedTimeRanges, setExcludedTimeRanges] = useState(() => {
    const savedRanges = loadFromLocalStorage(LOCAL_STORAGE_KEYS.EXCLUDED_RANGES, [{ id: Date.now(), start: '', end: '' }]);
    return Array.isArray(savedRanges) && savedRanges.length > 0 ? savedRanges : [{ id: Date.now(), start: '', end: '' }];
  });
  const [rawData, setRawData] = useState('');
  const [theme, setTheme] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.THEME, 'dark'));
  const [groupingKey, setGroupingKey] = useState(() =>
    loadFromLocalStorage(LOCAL_STORAGE_KEYS.GROUPING, 'subject')
  );
  const [selectedSectionTypes, setSelectedSectionTypes] = useState(() =>
    loadFromLocalStorage(LOCAL_STORAGE_KEYS.SECTION_TYPES, [])
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(() =>
    loadFromLocalStorage(LOCAL_STORAGE_KEYS.STATUS_FILTER, 'open')
  );
  const [processedCourses, setProcessedCourses] = useState([]);
  const [conflictingLockedCourseIds, setConflictingLockedCourseIds] = useState(new Set());

  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.COURSES, JSON.stringify(allCourses)); }, [allCourses]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.EXCLUDED_DAYS, JSON.stringify(excludedDays)); }, [excludedDays]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.EXCLUDED_RANGES, JSON.stringify(excludedTimeRanges)); }, [excludedTimeRanges]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, JSON.stringify(theme)); document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.GROUPING, JSON.stringify(groupingKey)); }, [groupingKey]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.SECTION_TYPES, JSON.stringify(selectedSectionTypes)); }, [selectedSectionTypes]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.STATUS_FILTER, JSON.stringify(selectedStatusFilter)); }, [selectedStatusFilter]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  useEffect(() => {
    const filtered = allCourses.filter(course => {
      if (course.isLocked) return true;

      if (selectedStatusFilter === 'open') { if (course.isClosed === true) return false; }
      else if (selectedStatusFilter === 'closed') { if (course.isClosed === false) return false; }

      if (selectedSectionTypes.length > 0) {
        const courseSectionType = getSectionTypeSuffix(course.section);
        if (!courseSectionType || !selectedSectionTypes.includes(courseSectionType)) return false;
      }

      const parsedSchedule = parseSchedule(course.schedule);
      if (!parsedSchedule || parsedSchedule.isTBA) return true;

      const runsOnAnExcludedDay = parsedSchedule.days.some(day => excludedDays.includes(day));
      if (runsOnAnExcludedDay) return false;

      const overlapsWithAnyExcludedTime = excludedTimeRanges.some(range => {
        if (range.start && range.end) {
          const excludedStart = range.start;
          const excludedEnd = range.end;
          const courseStart = parsedSchedule.startTime;
          const courseEnd = parsedSchedule.endTime;
          if (courseStart && courseEnd) {
            return checkTimeOverlap(courseStart, courseEnd, excludedStart, excludedEnd);
          }
        }
        return false;
      });
      if (overlapsWithAnyExcludedTime) return false;

      return true;
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
  }, [allCourses, excludedDays, excludedTimeRanges, groupingKey, selectedSectionTypes, selectedStatusFilter]);


  useEffect(() => {
    const lockedCourses = allCourses.filter(course => course.isLocked);
    const conflicts = new Set();

    for (let i = 0; i < lockedCourses.length; i++) {
      for (let j = i + 1; j < lockedCourses.length; j++) {
        const course1 = lockedCourses[i];
        const course2 = lockedCourses[j];

        const schedule1 = parseSchedule(course1.schedule);
        const schedule2 = parseSchedule(course2.schedule);

        if (!schedule1 || schedule1.isTBA || !schedule1.startTime || !schedule1.endTime ||
          !schedule2 || schedule2.isTBA || !schedule2.startTime || !schedule2.endTime) {
          continue;
        }

        const commonDays = schedule1.days.filter(day => schedule2.days.includes(day));

        if (commonDays.length > 0) {
          if (checkTimeOverlap(schedule1.startTime, schedule1.endTime, schedule2.startTime, schedule2.endTime)) {
            conflicts.add(course1.id);
            conflicts.add(course2.id);
          }
        }
      }
    }

    setConflictingLockedCourseIds(conflicts);

  }, [allCourses]);


  const handleDayChange = (dayCode, isChecked) => { setExcludedDays(prev => isChecked ? [...prev, dayCode] : prev.filter(d => d !== dayCode)); };
  const handleTimeRangeChange = (id, field, value) => { setExcludedTimeRanges(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r)); };
  const handleAddTimeRange = () => { setExcludedTimeRanges(prev => [...prev, { id: Date.now(), start: '', end: '' }]); };
  const handleRemoveTimeRange = (id) => { if (excludedTimeRanges.length <= 1) return; setExcludedTimeRanges(prev => prev.filter(r => r.id !== id)); };
  const handleLoadRawData = () => {
    try {
      const p = parseRawCourseData(rawData);
      const coursesWithDefaults = p.map((course, index) => ({
        ...course,
        id: course.id ?? `${Date.now()}-${index}`,
        isLocked: course.isLocked ?? false,
        isClosed: course.isClosed ?? (course.totalSlots > 0 && course.enrolled >= course.totalSlots),
      }));

      setAllCourses(prevCourses => [...prevCourses, ...coursesWithDefaults]);

      alert(`Added ${coursesWithDefaults.length} courses!`);
    } catch (error) {
      console.error("Error parsing raw data:", error);
      alert(`Error loading data: ${error.message}`);
    }
  };
  const handleDeleteCourse = (id) => { setAllCourses(prev => prev.filter(c => c.id !== id)); };
  const handleDeleteAllCourses = () => { if (!window.confirm("Delete ALL courses? This cannot be undone.")) return; setAllCourses([]); setRawData(''); };
  const handleToggleLockCourse = (id) => { setAllCourses(prev => prev.map(c => c.id === id ? { ...c, isLocked: !c.isLocked } : c)); };
  const handleToggleTheme = () => { setTheme(prev => (prev === 'light' ? 'dark' : 'light')); };
  const handleGroupingChange = (event) => { setGroupingKey(event.target.value); };
  const handleSectionTypeChange = (typeId, isSelected) => { setSelectedSectionTypes(prev => isSelected ? [...new Set([...prev, typeId])] : prev.filter(id => id !== typeId)); };
  const handleStatusFilterChange = (statusValue) => { setSelectedStatusFilter(statusValue); };


  const displayedCount = useMemo(() => {
    if (!Array.isArray(processedCourses)) return 0;
    if (groupingKey === 'none') {
      return processedCourses.length;
    }
    return processedCourses.reduce((sum, group) => {
      return sum + (group && group.courses ? group.courses.length : 0);
    }, 0);
  }, [processedCourses, groupingKey]);

  const lockedCoursesCount = useMemo(() => {
    return allCourses.filter(c => c.isLocked).length;
  }, [allCourses]);

  const totalUnits = useMemo(() => {
    const lockedCourses = allCourses.filter(course => course.isLocked);
    return lockedCourses.reduce((sum, course) => {
      const units = parseFloat(course.units);
      return isNaN(units) ? sum : sum + units;
    }, 0);
  }, [allCourses]);

  const uniqueSubjects = useMemo(() => {
    const lockedCourses = allCourses.filter(course => course.isLocked);
    const uniqueSet = new Set();
    lockedCourses.forEach(course => {
      if (course.subject) uniqueSet.add(course.subject);
    });
    return uniqueSet.size;
  }, [allCourses]);

  return (
    <>
      <header className="app-header">
        <div className="App">
          <div className="app-title">
            <Logo />
            <h1>CIT-U Course Scheduler</h1>
          </div>
        </div>
      </header>

      <div className="App">
        <div className="header-controls">
          <div className="app-controls">
            <button className="theme-toggle-button" onClick={handleToggleTheme}>
              {theme === 'light' ? '🌙 Switch to Dark Mode' : '☀️ Switch to Light Mode'}
            </button>
          </div>

          <div className="status-filter-controls">
            <button
              className={`status-filter-button ${selectedStatusFilter === 'all' ? 'selected' : ''}`}
              onClick={() => handleStatusFilterChange('all')}
            >
              All Courses
            </button>
            <button
              className={`status-filter-button ${selectedStatusFilter === 'open' ? 'selected' : ''}`}
              onClick={() => handleStatusFilterChange('open')}
            >
              Open Only
            </button>
            <button
              className={`status-filter-button ${selectedStatusFilter === 'closed' ? 'selected' : ''}`}
              onClick={() => handleStatusFilterChange('closed')}
            >
              Closed Only
            </button>
          </div>
        </div>

        <div className="section-container">
          <h2>Course Filters</h2>
          <TimeFilter
            excludedDays={excludedDays}
            excludedTimeRanges={excludedTimeRanges}
            onDayChange={handleDayChange}
            onTimeRangeChange={handleTimeRangeChange}
            onAddTimeRange={handleAddTimeRange}
            onRemoveTimeRange={handleRemoveTimeRange}
          />

          <div className="section-type-filters">
            {SECTION_TYPE_SUFFIXES.map(typeId => (
              <label key={typeId} className="section-type-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSectionTypes.includes(typeId)}
                  onChange={(e) => handleSectionTypeChange(typeId, e.target.checked)}
                />
                {typeId}
              </label>
            ))}
          </div>
        </div>

        <div className="section-container">
          <div className="table-header-controls">
            <h2>Course List</h2>
            <div className="grouping-controls">
              <label>Group by:</label>
              <select value={groupingKey} onChange={handleGroupingChange}>
                <option value="none">None</option>
                <option value="subject">Subject</option>
                <option value="offeringDept">Department</option>
              </select>
            </div>
            {totalUnits > 0 && (
              <div className="total-units-display">
                {totalUnits} units ({uniqueSubjects} subjects) - {lockedCoursesCount} courses
              </div>
            )}
          </div>

          <CourseTable
            courses={processedCourses}
            groupingKey={groupingKey}
            onDeleteCourse={handleDeleteCourse}
            onToggleLockCourse={handleToggleLockCourse}
            conflictingLockedCourseIds={conflictingLockedCourseIds}
          />

          <div className="table-action-controls">
            <button className="danger-button" onClick={handleDeleteAllCourses}>Delete All Courses</button>
          </div>

          <div>
            <span>Showing {displayedCount} courses</span>
            {displayedCount !== allCourses.length && (
              <span> (filtered from {allCourses.length} total)</span>
            )}
          </div>
        </div>

        <div className="section-container">
          <h2>Import Data</h2>
          <RawDataInput
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            onSubmit={handleLoadRawData}
          />
        </div>
      </div>
    </>
  );
}

export default App;