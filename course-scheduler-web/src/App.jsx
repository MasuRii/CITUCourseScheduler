import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import CourseTable from './components/CourseTable';
import RawDataInput from './components/RawDataInput';
import TimeFilter from './components/TimeFilter';
import TimetableView from './components/TimetableView';
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
  MAX_UNITS: 'courseBuilder_maxUnits',
  MAX_CLASS_GAP_HOURS: 'courseBuilder_maxClassGapHours',
  PREFERRED_TIME_OF_DAY: 'courseBuilder_preferredTimeOfDay',
  SCHEDULE_SEARCH_MODE: 'courseBuilder_scheduleSearchMode',
};

const ALLOWED_GROUPING_KEYS = ['none', 'offeringDept', 'subject'];
const SECTION_TYPE_SUFFIXES = ['AP3', 'AP4', 'AP5'];
const ALLOWED_STATUS_FILTERS = ['all', 'open', 'closed'];
const ALLOWED_PREFERRED_TIMES = ['any', 'morning', 'afternoon', 'evening'];
const DEFAULT_PREFERRED_TIMES_ORDER = ['morning', 'afternoon', 'evening', 'any'];
const ALLOWED_SEARCH_MODES = ['fast', 'exhaustive'];

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
    if (key === LOCAL_STORAGE_KEYS.MAX_UNITS) {
      return typeof parsed === 'string' ? parsed : defaultValue;
    }
    if (key === LOCAL_STORAGE_KEYS.MAX_CLASS_GAP_HOURS) {
      return typeof parsed === 'string' ? parsed : defaultValue;
    }
    if (key === LOCAL_STORAGE_KEYS.PREFERRED_TIME_OF_DAY) {
      return ALLOWED_PREFERRED_TIMES.includes(parsed) ? parsed : defaultValue;
    }
    if (key === LOCAL_STORAGE_KEYS.SCHEDULE_SEARCH_MODE) {
      return ALLOWED_SEARCH_MODES.includes(parsed) ? parsed : 'fast';
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
    if (key === LOCAL_STORAGE_KEYS.MAX_UNITS) return '';
    if (key === LOCAL_STORAGE_KEYS.MAX_CLASS_GAP_HOURS) return '';
    if (key === LOCAL_STORAGE_KEYS.PREFERRED_TIME_OF_DAY) return 'any';
    if (key === LOCAL_STORAGE_KEYS.SCHEDULE_SEARCH_MODE) return 'fast';
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

/**
 * Checks if a given schedule (array of course objects) is conflict-free.
 * @param {Course[]} scheduleToTest - Array of course objects.
 * @param {function} parseFn - The parseSchedule function.
 * @param {function} overlapFn - The checkTimeOverlap function.
 * @returns {boolean} True if the schedule is conflict-free, false otherwise.
 */
function isScheduleConflictFree(scheduleToTest, parseFn, overlapFn) {
  if (!scheduleToTest || scheduleToTest.length <= 1) {
    return true;
  }

  for (let i = 0; i < scheduleToTest.length; i++) {
    for (let j = i + 1; j < scheduleToTest.length; j++) {
      const course1 = scheduleToTest[i];
      const course2 = scheduleToTest[j];

      const schedule1Result = parseFn(course1.schedule);
      const schedule2Result = parseFn(course2.schedule);

      if (!schedule1Result || schedule1Result.isTBA || !schedule1Result.allTimeSlots || schedule1Result.allTimeSlots.length === 0 ||
        !schedule2Result || schedule2Result.isTBA || !schedule2Result.allTimeSlots || schedule2Result.allTimeSlots.length === 0) {
        continue;
      }

      for (const slot1 of schedule1Result.allTimeSlots) {
        for (const slot2 of schedule2Result.allTimeSlots) {
          const commonDays = slot1.days.filter(day => slot2.days.includes(day));

          if (commonDays.length > 0) {
            if (slot1.startTime && slot1.endTime && slot2.startTime && slot2.endTime) {
              if (overlapFn(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime)) {
                return false;
              }
            }
          }
        }
      }
    }
  }
  return true;
}

function getTimeOfDayBucket(time) {
  if (!time) return 'any';
  const [h] = time.split(':').map(Number);
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h >= 17) return 'evening';
  return 'any';
}

function scoreScheduleByTimePreference(schedule, prefOrder) {
  if (!Array.isArray(prefOrder) || prefOrder.length === 0) return 0;
  let score = 0;
  for (const course of schedule) {
    const parsed = parseSchedule(course.schedule);
    if (!parsed || parsed.isTBA || !parsed.allTimeSlots || parsed.allTimeSlots.length === 0) continue;
    let bestIdx = prefOrder.length;
    for (const slot of parsed.allTimeSlots) {
      const bucket = getTimeOfDayBucket(slot.startTime);
      const idx = prefOrder.indexOf(bucket);
      if (idx !== -1 && idx < bestIdx) bestIdx = idx;
    }
    score += bestIdx;
  }
  return score;
}

function generateExhaustiveBestSchedule(coursesBySubject, preferredTimeOfDayOrder) {
  const subjects = Object.keys(coursesBySubject);
  let bestSchedule = [];
  let bestScore = -1;
  let bestTimePrefScore = Infinity;

  function backtrack(idx, currentSchedule) {
    if (idx === subjects.length) {
      if (!isScheduleConflictFree(currentSchedule, parseSchedule, checkTimeOverlap)) return;
      const totalCourses = currentSchedule.length;
      const totalUnits = currentSchedule.reduce((sum, course) => {
        const units = parseFloat(course.creditedUnits || course.units);
        return isNaN(units) ? sum : sum + units;
      }, 0);
      const score = totalCourses * 100 + totalUnits;
      const timePrefScore = scoreScheduleByTimePreference(currentSchedule, preferredTimeOfDayOrder);
      if (
        score > bestScore ||
        (score === bestScore && timePrefScore < bestTimePrefScore)
      ) {
        bestScore = score;
        bestTimePrefScore = timePrefScore;
        bestSchedule = [...currentSchedule];
      }
      return;
    }
    const subject = subjects[idx];
    for (const course of coursesBySubject[subject]) {
      let hasConflict = false;
      const courseScheduleResult = parseSchedule(course.schedule);
      if (courseScheduleResult && !courseScheduleResult.isTBA && courseScheduleResult.allTimeSlots && courseScheduleResult.allTimeSlots.length > 0) {
        for (const existingCourse of currentSchedule) {
          const existingScheduleResult = parseSchedule(existingCourse.schedule);
          if (!existingScheduleResult || existingScheduleResult.isTBA || !existingScheduleResult.allTimeSlots || existingScheduleResult.allTimeSlots.length === 0) continue;
          for (const newSlot of courseScheduleResult.allTimeSlots) {
            for (const existingSlot of existingScheduleResult.allTimeSlots) {
              const commonDays = newSlot.days.filter(day => existingSlot.days.includes(day));
              if (commonDays.length > 0) {
                if (newSlot.startTime && newSlot.endTime && existingSlot.startTime && existingSlot.endTime) {
                  if (checkTimeOverlap(newSlot.startTime, newSlot.endTime, existingSlot.startTime, existingSlot.endTime)) {
                    hasConflict = true;
                    break;
                  }
                }
              }
            }
            if (hasConflict) break;
          }
          if (hasConflict) break;
        }
      }
      if (!hasConflict) {
        currentSchedule.push(course);
        backtrack(idx + 1, currentSchedule);
        currentSchedule.pop();
      }
    }
  }
  backtrack(0, []);
  return { bestSchedule, bestScore, bestTimePrefScore };
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
  const [maxUnits, setMaxUnits] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.MAX_UNITS, ''));
  const [maxClassGapHours, setMaxClassGapHours] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.MAX_CLASS_GAP_HOURS, ''));
  const [preferredTimeOfDayOrder, setPreferredTimeOfDayOrder] = useState(() => {
    const saved = loadFromLocalStorage(LOCAL_STORAGE_KEYS.PREFERRED_TIME_OF_DAY, null);
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return [...DEFAULT_PREFERRED_TIMES_ORDER];
  });
  const [processedCourses, setProcessedCourses] = useState([]);
  const [conflictingLockedCourseIds, setConflictingLockedCourseIds] = useState(new Set());
  const [showTimetable, setShowTimetable] = useState(false);
  const [generatedScheduleCount, setGeneratedScheduleCount] = useState(0);
  const triedScheduleCombinations = useRef(new Set()).current;
  const [scheduleSearchMode, setScheduleSearchMode] = useState(() => {
    const saved = loadFromLocalStorage(LOCAL_STORAGE_KEYS.SCHEDULE_SEARCH_MODE, 'fast');
    return ALLOWED_SEARCH_MODES.includes(saved) ? saved : 'fast';
  });

  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.COURSES, JSON.stringify(allCourses)); }, [allCourses]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.EXCLUDED_DAYS, JSON.stringify(excludedDays)); }, [excludedDays]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.EXCLUDED_RANGES, JSON.stringify(excludedTimeRanges)); }, [excludedTimeRanges]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, JSON.stringify(theme)); document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.GROUPING, JSON.stringify(groupingKey)); }, [groupingKey]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.SECTION_TYPES, JSON.stringify(selectedSectionTypes)); }, [selectedSectionTypes]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.STATUS_FILTER, JSON.stringify(selectedStatusFilter)); }, [selectedStatusFilter]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.MAX_UNITS, JSON.stringify(maxUnits)); }, [maxUnits]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.MAX_CLASS_GAP_HOURS, JSON.stringify(maxClassGapHours)); }, [maxClassGapHours]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.PREFERRED_TIME_OF_DAY, JSON.stringify(preferredTimeOfDayOrder)); }, [preferredTimeOfDayOrder]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.SCHEDULE_SEARCH_MODE, JSON.stringify(scheduleSearchMode)); }, [scheduleSearchMode]);

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

      const parsedScheduleResult = parseSchedule(course.schedule);
      if (!parsedScheduleResult || parsedScheduleResult.isTBA) return true;

      if (!parsedScheduleResult.allTimeSlots || parsedScheduleResult.allTimeSlots.length === 0) {
        return true;
      }

      const anySlotIsExcluded = parsedScheduleResult.allTimeSlots.some(slot => {
        const slotIsOnExcludedDay = slot.days.some(day => excludedDays.includes(day));
        if (slotIsOnExcludedDay) {
          return true;
        }

        const slotOverlapsAnExcludedTimeRange = excludedTimeRanges.some(excludedRange => {
          if (excludedRange.start && excludedRange.end && slot.startTime && slot.endTime) {
            return checkTimeOverlap(slot.startTime, slot.endTime, excludedRange.start, excludedRange.end);
          }
          return false;
        });

        if (slotOverlapsAnExcludedTimeRange) {
          return true;
        }

        return false;
      });

      if (anySlotIsExcluded) {
        return false;
      }

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
    const currentLockedCourses = allCourses.filter(course => course.isLocked);
    console.log(
      '[useEffect/conflicts] Checking conflicts for lockedCourses (count:', currentLockedCourses.length, '). Courses:',
      currentLockedCourses.map(c => ({ id: c.id, subject: c.subject, section: c.section, schedule: c.schedule, isLocked: c.isLocked }))
    );

    const conflicts = new Set();

    for (let i = 0; i < currentLockedCourses.length; i++) {
      for (let j = i + 1; j < currentLockedCourses.length; j++) {
        const course1 = currentLockedCourses[i];
        const course2 = currentLockedCourses[j];

        const schedule1Result = parseSchedule(course1.schedule);
        const schedule2Result = parseSchedule(course2.schedule);

        if (!schedule1Result || schedule1Result.isTBA || schedule1Result.allTimeSlots.length === 0 ||
          !schedule2Result || schedule2Result.isTBA || schedule2Result.allTimeSlots.length === 0) {
          continue;
        }

        for (const slot1 of schedule1Result.allTimeSlots) {
          for (const slot2 of schedule2Result.allTimeSlots) {
            const commonDays = slot1.days.filter(day => slot2.days.includes(day));

            if (commonDays.length > 0) {
              if (slot1.startTime && slot1.endTime && slot2.startTime && slot2.endTime) {
                const hasTimeOverlap = checkTimeOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime);
                if (hasTimeOverlap) {
                  conflicts.add(course1.id);
                  conflicts.add(course2.id);
                  break;
                }
              }
            }
          }
          if (conflicts.has(course1.id) && conflicts.has(course2.id)) break;
        }
      }
    }
    console.log('[useEffect/conflicts] Detected conflict IDs:', Array.from(conflicts));
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
  const handleClearAllLocks = () => { if (!window.confirm("Clear ALL locks? This will unlock all courses.")) return; setAllCourses(prev => prev.map(c => ({ ...c, isLocked: false }))); };
  const handleToggleLockCourse = (id) => {
    console.log('Toggling lock for course ID:', id);
    const courseBeforeToggle = allCourses.find(c => c.id === id);
    console.log('Course before toggle:', courseBeforeToggle);

    if (courseBeforeToggle.isLocked) {
      console.log('Unlocking already locked course');
      setAllCourses(prev => prev.map(c => c.id === id ? { ...c, isLocked: false } : c));
      return;
    }

    const lockedCourses = allCourses.filter(c => c.isLocked);
    console.log('Current locked courses:', lockedCourses);

    const courseToLock = courseBeforeToggle;
    const scheduleToLock = parseSchedule(courseToLock.schedule);
    console.log('Schedule of course to lock:', scheduleToLock);

    if (!scheduleToLock || scheduleToLock.isTBA || !scheduleToLock.startTime || !scheduleToLock.endTime) {
      console.log('Course has TBA or invalid schedule, skipping conflict check');
      setAllCourses(prev => prev.map(c => c.id === id ? { ...c, isLocked: true } : c));
      return;
    }

    const conflictingCourses = [];
    for (const lockedCourse of lockedCourses) {
      console.log(`Checking for conflict with locked course: ${lockedCourse.subject} ${lockedCourse.section}`);

      const lockedSchedule = parseSchedule(lockedCourse.schedule);
      console.log('Schedule of locked course:', lockedSchedule);

      if (!lockedSchedule || lockedSchedule.isTBA || !lockedSchedule.startTime || !lockedSchedule.endTime) {
        console.log('Locked course has TBA or invalid schedule, skipping');
        continue;
      }

      const commonDays = scheduleToLock.days.filter(day => lockedSchedule.days.includes(day));
      console.log('Common days:', commonDays);

      if (commonDays.length > 0) {
        const hasTimeOverlap = checkTimeOverlap(scheduleToLock.startTime, scheduleToLock.endTime, lockedSchedule.startTime, lockedSchedule.endTime);
        console.log(`Time overlap check: ${scheduleToLock.startTime}-${scheduleToLock.endTime} and ${lockedSchedule.startTime}-${lockedSchedule.endTime}: ${hasTimeOverlap}`);

        if (hasTimeOverlap) {
          console.log(`Conflict detected with course: ${lockedCourse.subject} ${lockedCourse.section}`);
          conflictingCourses.push(lockedCourse);
        }
      }
    }

    if (conflictingCourses.length > 0) {
      console.log('Conflicting courses:', conflictingCourses);
      const courseNames = conflictingCourses.map(c => `${c.subject} ${c.section}`).join(', ');
      const confirmMessage = `This course conflicts with ${conflictingCourses.length} locked course(s): ${courseNames}. Do you still want to lock it?`;

      console.log('Showing confirmation dialog:', confirmMessage);
      if (!window.confirm(confirmMessage)) {
        console.log('User canceled locking the course');
        return;
      }
      console.log('User confirmed locking the course despite conflicts');
    }

    console.log('Locking the course');
    setAllCourses(prev => {
      const updatedCourses = prev.map(c => c.id === id ? { ...c, isLocked: true } : c);
      console.log('All courses after locking:', updatedCourses);
      return updatedCourses;
    });
  };
  const handleToggleTheme = () => { setTheme(prev => (prev === 'light' ? 'dark' : 'light')); };
  const handleGroupingChange = (event) => { setGroupingKey(event.target.value); };
  const handleSectionTypeChange = (typeId, isSelected) => { setSelectedSectionTypes(prev => isSelected ? [...new Set([...prev, typeId])] : prev.filter(id => id !== typeId)); };
  const handleStatusFilterChange = (statusValue) => { setSelectedStatusFilter(statusValue); };

  const handleMaxUnitsChange = (e) => {
    const value = e.target.value;
    if (value === '' || (/^[0-9]*$/.test(value) && parseInt(value, 10) >= 0)) {
      setMaxUnits(value);
    }
  };
  const handleMaxClassGapHoursChange = (e) => {
    let value = e.target.value;
    if (value === '') {
      setMaxClassGapHours('');
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 3) {
      setMaxClassGapHours(value);
    } else if (value.endsWith('.') && parseFloat(value.slice(0, -1)) >= 0 && parseFloat(value.slice(0, -1)) <= 3) {
      setMaxClassGapHours(value);
    }
  };
  const handleMoveTimePref = (index, direction) => {
    setPreferredTimeOfDayOrder(prev => {
      const newOrder = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newOrder.length) return newOrder;
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      return newOrder;
    });
  };
  const handleRemoveTimePref = (index) => {
    setPreferredTimeOfDayOrder(prev => prev.filter((_, i) => i !== index));
  };
  const handleResetTimePrefs = () => {
    setPreferredTimeOfDayOrder([...DEFAULT_PREFERRED_TIMES_ORDER]);
  };
  const handleAddTimePref = (time) => {
    setPreferredTimeOfDayOrder(prev => prev.includes(time) ? prev : [...prev, time]);
  };

  const displayedCount = useMemo(() => {
    if (!Array.isArray(processedCourses)) return 0;
    if (groupingKey === 'none') {
      return processedCourses.length;
    }
    return processedCourses.reduce((sum, group) => {
      return sum + (group && group.courses ? group.courses.length : 0);
    }, 0);
  }, [processedCourses, groupingKey]);

  const lockedCourses = useMemo(() => {
    return allCourses.filter(course => course.isLocked);
  }, [allCourses]);

  const lockedCoursesCount = useMemo(() => {
    return lockedCourses.length;
  }, [lockedCourses]);

  const totalUnits = useMemo(() => {
    return lockedCourses.reduce((sum, course) => {
      const units = parseFloat(course.creditedUnits || course.units);
      return isNaN(units) ? sum : sum + units;
    }, 0);
  }, [lockedCourses]);

  const uniqueSubjects = useMemo(() => {
    const uniqueSet = new Set();
    lockedCourses.forEach(course => {
      if (course.subject) uniqueSet.add(course.subject);
    });
    return uniqueSet.size;
  }, [lockedCourses]);

  const toggleTimetable = () => {
    setShowTimetable(prev => !prev);
  };

  /**
   * Generates an optimized schedule based on available courses and user filters
   */
  const generateBestSchedule = () => {
    const unlockedCourses = allCourses.map(c => ({ ...c, isLocked: false }));

    const filteredCourses = unlockedCourses.filter(course => {
      if (selectedStatusFilter === 'open' && course.isClosed === true) return false;
      if (selectedStatusFilter === 'closed' && course.isClosed === false) return false;

      if (selectedSectionTypes.length > 0) {
        const courseSectionType = getSectionTypeSuffix(course.section);
        if (!courseSectionType || !selectedSectionTypes.includes(courseSectionType)) return false;
      }

      const parsedScheduleResult = parseSchedule(course.schedule);
      if (!parsedScheduleResult || parsedScheduleResult.isTBA || !parsedScheduleResult.allTimeSlots || parsedScheduleResult.allTimeSlots.length === 0) {
        return true;
      }

      const anySlotIsExcluded = parsedScheduleResult.allTimeSlots.some(slot => {
        const slotIsOnExcludedDay = slot.days.some(day => excludedDays.includes(day));
        if (slotIsOnExcludedDay) return true;

        const slotOverlapsAnExcludedTimeRange = excludedTimeRanges.some(excludedRange => {
          if (excludedRange.start && excludedRange.end && slot.startTime && slot.endTime) {
            return checkTimeOverlap(slot.startTime, slot.endTime, excludedRange.start, excludedRange.end);
          }
          return false;
        });
        if (slotOverlapsAnExcludedTimeRange) return true;
        return false;
      });

      if (anySlotIsExcluded) {
        return false;
      }

      return true;
    });

    const coursesBySubject = filteredCourses.reduce((acc, course) => {
      if (!acc[course.subject]) {
        acc[course.subject] = [];
      }
      acc[course.subject].push(course);
      return acc;
    }, {});

    if (scheduleSearchMode === 'exhaustive' && Object.keys(coursesBySubject).length > 12) {
      alert('Warning: Exhaustive search may be very slow for more than 12 subjects. Consider using Fast mode.');
    }

    if (scheduleSearchMode === 'exhaustive') {
      const { bestSchedule, bestScore } = generateExhaustiveBestSchedule(coursesBySubject, preferredTimeOfDayOrder);
      if (bestSchedule.length > 0) {
        const isActuallyConflictFree = isScheduleConflictFree(bestSchedule, parseSchedule, checkTimeOverlap);
        if (!isActuallyConflictFree) {
          alert("The best schedule found still had conflicts. Please try again or adjust filters. No schedule applied.");
          return;
        }
        const uniqueCourseKey = (course) => `${course.id}-${course.subject}-${course.section}`;
        const bestScheduleKeys = new Set(bestSchedule.map(uniqueCourseKey));
        setAllCourses(prev => prev.map(course => ({
          ...course,
          isLocked: bestScheduleKeys.has(uniqueCourseKey(course))
        })));
        setGeneratedScheduleCount(prev => prev + 1);
        alert(`Generated optimal schedule #${generatedScheduleCount + 1} with ${bestSchedule.length} courses (${bestScore - bestSchedule.length * 100} units)`);
      } else {
        alert("Couldn't generate a valid schedule with current filters (exhaustive mode)");
      }
      return;
    }

    const generateCombinationKey = (courses) => {
      return courses.map(c => c.id).sort().join(',');
    };

    let bestSchedule = [];
    let bestScore = -1;
    let bestTimePrefScore = Infinity;
    let maxAttempts = 1000;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      let currentSchedule = [];

      Object.values(coursesBySubject).forEach(subjectCourses => {
        const shuffledCourses = [...subjectCourses].sort(() => Math.random() - 0.5);

        for (const course of shuffledCourses) {
          const courseScheduleResult = parseSchedule(course.schedule);
          if (!courseScheduleResult || courseScheduleResult.isTBA || !courseScheduleResult.allTimeSlots || courseScheduleResult.allTimeSlots.length === 0) {
            currentSchedule.push(course);
            break;
          }

          let hasConflictWithCurrentSelection = false;
          for (const existingCourse of currentSchedule) {
            const existingScheduleResult = parseSchedule(existingCourse.schedule);
            if (!existingScheduleResult || existingScheduleResult.isTBA || !existingScheduleResult.allTimeSlots || existingScheduleResult.allTimeSlots.length === 0) {
              continue;
            }

            for (const newSlot of courseScheduleResult.allTimeSlots) {
              for (const existingSlot of existingScheduleResult.allTimeSlots) {
                const commonDays = newSlot.days.filter(day => existingSlot.days.includes(day));
                if (commonDays.length > 0) {
                  if (newSlot.startTime && newSlot.endTime && existingSlot.startTime && existingSlot.endTime) {
                    if (checkTimeOverlap(newSlot.startTime, newSlot.endTime, existingSlot.startTime, existingSlot.endTime)) {
                      hasConflictWithCurrentSelection = true;
                      break;
                    }
                  }
                }
              }
              if (hasConflictWithCurrentSelection) break;
            }
            if (hasConflictWithCurrentSelection) break;
          }

          if (!hasConflictWithCurrentSelection) {
            currentSchedule.push(course);
            break;
          }
        }
      });

      if (!isScheduleConflictFree(currentSchedule, parseSchedule, checkTimeOverlap)) {
        continue;
      }

      const scheduleKey = generateCombinationKey(currentSchedule);

      if (triedScheduleCombinations.has(scheduleKey)) {
        continue;
      }

      triedScheduleCombinations.add(scheduleKey);

      const totalCourses = currentSchedule.length;
      const totalUnits = currentSchedule.reduce((sum, course) => {
        const units = parseFloat(course.creditedUnits || course.units);
        return isNaN(units) ? sum : sum + units;
      }, 0);

      const score = totalCourses * 100 + totalUnits;
      const timePrefScore = scoreScheduleByTimePreference(currentSchedule, preferredTimeOfDayOrder);

      if (
        score > bestScore ||
        (score === bestScore && timePrefScore < bestTimePrefScore)
      ) {
        bestScore = score;
        bestTimePrefScore = timePrefScore;
        bestSchedule = currentSchedule;
      }

      if (bestSchedule.length === Object.keys(coursesBySubject).length) {
        break;
      }
    }

    if (bestSchedule.length > 0) {
      const isActuallyConflictFree = isScheduleConflictFree(bestSchedule, parseSchedule, checkTimeOverlap);
      console.log(
        '[generateBestSchedule] Final bestSchedule (length:', bestSchedule.length, ') before applying. Is conflict-free according to isScheduleConflictFree():', isActuallyConflictFree,
        'Courses:', bestSchedule.map(c => ({ id: c.id, subject: c.subject, section: c.section, schedule: c.schedule }))
      );

      if (!isActuallyConflictFree) {
        alert("The best schedule found still had conflicts. Please try again or adjust filters. No schedule applied.");
        console.error(
          "[generateBestSchedule] CRITICAL SAFEGUARD: Conflict found in final bestSchedule despite earlier checks. Aborting application.",
          bestSchedule.map(c => ({ id: c.id, subject: c.subject, section: c.section, schedule: c.schedule }))
        );
        return;
      }

      const uniqueCourseKey = (course) => `${course.id}-${course.subject}-${course.section}`;
      const bestScheduleKeys = new Set(bestSchedule.map(uniqueCourseKey));

      setAllCourses(prev => prev.map(course => ({
        ...course,
        isLocked: bestScheduleKeys.has(uniqueCourseKey(course))
      })));

      setGeneratedScheduleCount(prev => prev + 1);
      alert(`Generated schedule #${generatedScheduleCount + 1} with ${bestSchedule.length} courses (${bestScore - bestSchedule.length * 100} units)`);
    } else {
      alert("Couldn't generate a valid schedule with current filters");
    }
  };

  const handleClearGeneratedSchedules = () => {
    triedScheduleCombinations.clear();
    setGeneratedScheduleCount(0);
    handleClearAllLocks();
  };

  return (
    <>
      <header className="app-header">
        <div className="App">
          <div className="app-title">
            <h1>CIT-U Course Builder</h1>
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

          <div className="auto-schedule-controls">
            <button
              className="generate-schedule-button"
              onClick={generateBestSchedule}
              disabled={allCourses.length === 0}
            >
              {generatedScheduleCount === 0 ? 'Generate Best Schedule' : `Generate Next Best Schedule (#${generatedScheduleCount + 1})`}
            </button>
            {generatedScheduleCount > 0 && (
              <button onClick={handleClearGeneratedSchedules}>
                Reset Schedule Generator
              </button>
            )}
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

        {lockedCoursesCount > 0 && (
          <div className="timetable-section">
            <div className="section-container">
              <div className="table-header-controls">
                <h2>Timetable View</h2>
                <button
                  className="toggle-timetable-button"
                  onClick={toggleTimetable}
                >
                  {showTimetable ? 'Hide Timetable' : 'Show Timetable'}
                </button>
              </div>

              {showTimetable && (
                <TimetableView lockedCourses={lockedCourses} />
              )}

              {!showTimetable && lockedCoursesCount > 0 && (
                <div className="timetable-summary">
                  <div className="timetable-totals">
                    <span><strong>Total Units:</strong> {totalUnits}</span>
                    <span><strong>Subjects:</strong> {uniqueSubjects}</span>
                    <span><strong>Locked Courses:</strong> {lockedCoursesCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="section-container user-preferences-section">
          <h2>User Preferences</h2>
          <div className="preference-item">
            <label htmlFor="maxUnitsInput" className="filter-label">Maximum Units:</label>
            <input
              type="number"
              id="maxUnitsInput"
              value={maxUnits}
              onChange={handleMaxUnitsChange}
              placeholder="e.g., 18"
              min="0"
              className="preference-input"
            />
          </div>
          <div className="preference-item">
            <label htmlFor="maxGapInput" className="filter-label">Max Gap Between Classes (hours):</label>
            <input
              type="number"
              id="maxGapInput"
              value={maxClassGapHours}
              onChange={handleMaxClassGapHoursChange}
              placeholder="e.g., 1 (0 to 3)"
              min="0"
              max="3"
              step="0.5"
              className="preference-input"
            />
            <small className="input-description">Enter desired max hours (0-3). 0 means back-to-back. Leave blank for no preference.</small>
          </div>
          <div className="preference-item">
            <label className="filter-label">Preferred Time of Day (Order):</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 300 }}>
              {preferredTimeOfDayOrder.length === 0 && (
                <div style={{ color: '#888', fontStyle: 'italic' }}>No preference set (all times treated equally)</div>
              )}
              {preferredTimeOfDayOrder.map((time, idx) => (
                <div key={time} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ minWidth: 90, textTransform: 'capitalize' }}>{
                    time === 'morning' ? 'Morning (before 12 PM)' :
                      time === 'afternoon' ? 'Afternoon (12 PM - 5 PM)' :
                        time === 'evening' ? 'Evening (after 5 PM)' :
                          'Any'
                  }</span>
                  <button type="button" onClick={() => handleMoveTimePref(idx, 'up')} disabled={idx === 0} style={{ padding: '2px 6px' }}>↑</button>
                  <button type="button" onClick={() => handleMoveTimePref(idx, 'down')} disabled={idx === preferredTimeOfDayOrder.length - 1} style={{ padding: '2px 6px' }}>↓</button>
                  <button type="button" onClick={() => handleRemoveTimePref(idx)} style={{ padding: '2px 6px', color: 'red' }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[...DEFAULT_PREFERRED_TIMES_ORDER].filter(t => !preferredTimeOfDayOrder.includes(t)).map(time => (
                  <button key={time} type="button" onClick={() => handleAddTimePref(time)} style={{ padding: '2px 8px', fontSize: '0.95em' }}>
                    Add {time.charAt(0).toUpperCase() + time.slice(1)}
                  </button>
                ))}
                <button type="button" onClick={handleResetTimePrefs} style={{ marginLeft: 'auto', fontSize: '0.95em' }}>Reset</button>
              </div>
            </div>
          </div>
          <div className="preference-item">
            <label htmlFor="searchModeSelect" className="filter-label">Schedule Search Mode:</label>
            <select
              id="searchModeSelect"
              value={scheduleSearchMode}
              onChange={e => setScheduleSearchMode(e.target.value)}
              className="preference-select"
            >
              <option value="fast">Fast (Not Always Optimal)</option>
              <option value="exhaustive">Exhaustive (Always Optimal, Slower)</option>
            </select>
            <small className="input-description">
              Fast: Finds a good schedule quickly. Exhaustive: Finds the best possible schedule, but may be slow for large course lists.
            </small>
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

          <div className="filter-section">
            <label className="filter-label">Section Types:</label>
            <div className="section-type-filters">
              {SECTION_TYPE_SUFFIXES.map(typeId => {
                let description = "";
                if (typeId === "AP3") description = "Online Class";
                if (typeId === "AP4") description = "Face-to-Face";
                if (typeId === "AP5") description = "Hybrid (F2F & Online)";

                return (
                  <label key={typeId} className="section-type-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSectionTypes.includes(typeId)}
                      onChange={(e) => handleSectionTypeChange(typeId, e.target.checked)}
                    />
                    <span>{typeId} - {description}</span>
                  </label>
                );
              })}
            </div>
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

          {conflictingLockedCourseIds.size > 0 && (
            <div className="conflict-helper-text">
              Note: Courses highlighted with a red border have schedule conflicts with other locked courses.
            </div>
          )}

          <CourseTable
            courses={processedCourses}
            groupingKey={groupingKey}
            onDeleteCourse={handleDeleteCourse}
            onToggleLockCourse={handleToggleLockCourse}
            conflictingLockedCourseIds={conflictingLockedCourseIds}
          />

          <div className="table-action-controls">
            <button onClick={handleClearAllLocks}>Clear All Locks</button>
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
          <p>
            Need help? Check out the <a href="https://github.com/MasuRii/CITUCourseBuilder/blob/main/README.md#usage-guide" target="_blank" rel="noopener noreferrer">Usage Guide</a> for instructions on how to import data.
          </p>
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