import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import LogoDark from './assets/logo_icon_dark.svg';
import LogoLight from './assets/logo_icon_light.svg';
import ConfirmDialog from './components/ConfirmDialog';
import CourseTable from './components/CourseTable';
import RawDataInput from './components/RawDataInput';
import TimeFilter from './components/TimeFilter';
import TimetableView from './components/TimetableView';
import { parseRawCourseData } from './utils/parseRawData';
import { parseSchedule } from './utils/parseSchedule';

const LOCAL_STORAGE_KEYS = {
  COURSES: 'courseBuilder_allCourses',
  EXCLUDED_DAYS: 'courseBuilder_excludedDays',
  EXCLUDED_RANGES: 'courseBuilder_excludedTimeRanges',
  THEME: 'courseBuilder_theme',
  THEME_PALETTE: 'courseBuilder_themePalette',
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
const ALLOWED_SEARCH_MODES = ['fast', 'exhaustive', 'partial'];
const SMALL_N_THRESHOLD_PARTIAL = 12;

const loadFromLocalStorage = (key, defaultValue) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;
    const parsed = JSON.parse(saved);

    if (key === LOCAL_STORAGE_KEYS.THEME) {
      return parsed === 'light' ? 'light' : 'dark';
    }
    if (key === LOCAL_STORAGE_KEYS.THEME_PALETTE) {
      if (parsed && typeof parsed === 'object' &&
        ('light' in parsed && ('original' === parsed.light || 'comfort' === parsed.light)) &&
        ('dark' in parsed && ('original' === parsed.dark || 'comfort' === parsed.dark))) {
        return parsed;
      } else {
        return defaultValue;
      }
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
      return ALLOWED_SEARCH_MODES.includes(parsed) ? parsed : 'partial';
    }
    return parsed;
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage:`, e);
    if (key === LOCAL_STORAGE_KEYS.GROUPING) return 'subject';
    if (key === LOCAL_STORAGE_KEYS.THEME) return 'dark';
    if (key === LOCAL_STORAGE_KEYS.THEME_PALETTE) return { light: 'original', dark: 'original' };
    if (key === LOCAL_STORAGE_KEYS.SECTION_TYPES) return [];
    if (key === LOCAL_STORAGE_KEYS.STATUS_FILTER) return 'open';
    if (key === LOCAL_STORAGE_KEYS.COURSES) return [];
    if (key === LOCAL_STORAGE_KEYS.EXCLUDED_DAYS) return [];
    if (key === LOCAL_STORAGE_KEYS.EXCLUDED_RANGES) return [{ id: Date.now(), start: '', end: '' }];
    if (key === LOCAL_STORAGE_KEYS.MAX_UNITS) return '';
    if (key === LOCAL_STORAGE_KEYS.MAX_CLASS_GAP_HOURS) return '';
    if (key === LOCAL_STORAGE_KEYS.PREFERRED_TIME_OF_DAY) return 'any';
    if (key === LOCAL_STORAGE_KEYS.SCHEDULE_SEARCH_MODE) return 'partial';
    return defaultValue;
  }
};

const getSectionTypeSuffix = (sectionString) => {
  if (typeof sectionString !== 'string') return null;
  const parts = sectionString.split('-');
  const lastPart = parts[parts.length - 1];
  return SECTION_TYPE_SUFFIXES.includes(lastPart) ? lastPart : null;
};

function checkTimeOverlap(start1, end1, start2, end2) {
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(start1) || !timeRegex.test(end1) || !timeRegex.test(start2) || !timeRegex.test(end2)) {
    return false;
  }
  return start1 < end2 && end1 > start2;
}

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

function exceedsMaxUnits(schedule, maxUnits) {
  if (!maxUnits) return false;
  const totalUnits = schedule.reduce((sum, course) => {
    const units = parseFloat(course.creditedUnits || course.units);
    return isNaN(units) ? sum : sum + units;
  }, 0);
  return totalUnits > parseFloat(maxUnits);
}

function exceedsMaxGap(schedule, maxGapHours) {
  if (!maxGapHours) return false;
  const daySlots = {};
  for (const course of schedule) {
    const parsed = parseSchedule(course.schedule);
    if (!parsed || parsed.isTBA || !parsed.allTimeSlots) continue;
    for (const slot of parsed.allTimeSlots) {
      for (const day of slot.days) {
        if (!daySlots[day]) daySlots[day] = [];
        daySlots[day].push({ start: slot.startTime, end: slot.endTime });
      }
    }
  }

  for (const slots of Object.values(daySlots)) {
    slots.sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < slots.length; i++) {
      const prevEnd = slots[i - 1].end;
      const currStart = slots[i].start;
      if (prevEnd && currStart) {
        const [ph, pm] = prevEnd.split(":").map(Number);
        const [ch, cm] = currStart.split(":").map(Number);
        const gap = (ch + cm / 60) - (ph + pm / 60);
        if (gap > parseFloat(maxGapHours)) {
          return true;
        }
      }
    }
  }
  return false;
}


function generateExhaustiveBestSchedule(coursesBySubject, preferredTimeOfDayOrder, maxUnits, maxGapHours) {
  const subjects = Object.keys(coursesBySubject);
  let bestSchedule = [];
  let bestScore = -1;
  let bestTimePrefScore = Infinity;

  function backtrack(idx, currentSchedule) {
    if (idx === subjects.length) {
      if (!isScheduleConflictFree(currentSchedule, parseSchedule, checkTimeOverlap)) return;
      if (exceedsMaxUnits(currentSchedule, maxUnits)) return;
      if (exceedsMaxGap(currentSchedule, maxGapHours)) return;

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

function getAllSubsets(arr) {
  const result = [[]];
  for (const item of arr) {
    const len = result.length;
    for (let i = 0; i < len; i++) {
      result.push([...result[i], item]);
    }
  }
  return result;
}


function generateBestPartialSchedule_Heuristic(
  courses,
  maxUnits,
  maxGapHours,
  preferredTimeOfDayOrder
) {
  let bestOverallSchedule = [];
  let bestOverallSubjectsCount = 0;
  let bestOverallUnits = 0;
  let bestOverallTimePref = Infinity;

  const numCourses = courses.length;
  const NUM_ATTEMPTS = Math.min(500, Math.max(50, numCourses * 2));

  for (let attempt = 0; attempt < NUM_ATTEMPTS; attempt++) {
    let currentSchedule = [];
    let currentSubjectsSet = new Set();
    let poolOfCandidatesForAttempt = [...courses];
    poolOfCandidatesForAttempt.sort(() => Math.random() - 0.5);

    while (true) {
      let bestCandidateToAddThisPass = null;
      let bestPriorityForThisPass = -1;
      let indexOfBestCandidateInPool = -1;

      for (let i = 0; i < poolOfCandidatesForAttempt.length; i++) {
        const candidate = poolOfCandidatesForAttempt[i];
        if (currentSubjectsSet.has(candidate.subject)) continue;

        const tempScheduleWithCandidateForConstraints = [...currentSchedule, candidate];
        if (exceedsMaxUnits(tempScheduleWithCandidateForConstraints, maxUnits)) continue;
        if (exceedsMaxGap(tempScheduleWithCandidateForConstraints, maxGapHours)) continue;

        let conflictsWithCurrent = false;
        const candidateScheduleResult = parseSchedule(candidate.schedule);
        if (candidateScheduleResult && !candidateScheduleResult.isTBA && candidateScheduleResult.allTimeSlots && candidateScheduleResult.allTimeSlots.length > 0) {
          for (const existingCourse of currentSchedule) {
            const existingScheduleResult = parseSchedule(existingCourse.schedule);
            if (!existingScheduleResult || existingScheduleResult.isTBA || !existingScheduleResult.allTimeSlots || existingScheduleResult.allTimeSlots.length === 0) continue;
            let pairConflict = false;
            for (const slot1 of candidateScheduleResult.allTimeSlots) {
              for (const slot2 of existingScheduleResult.allTimeSlots) {
                const commonDays = slot1.days.filter(day => slot2.days.includes(day));
                if (commonDays.length > 0) {
                  if (slot1.startTime && slot1.endTime && slot2.startTime && slot2.endTime) {
                    if (checkTimeOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime)) {
                      pairConflict = true; break;
                    }
                  }
                }
              }
              if (pairConflict) break;
            }
            if (pairConflict) { conflictsWithCurrent = true; break; }
          }
        }
        if (conflictsWithCurrent) continue;

        const units = parseFloat(candidate.creditedUnits || candidate.units) || 0;
        let priority = 0;
        if (!currentSubjectsSet.has(candidate.subject)) {
          priority = 20000 + units;
        } else {
          priority = 10000 + units;
        }
        priority += Math.random() * 0.1;


        if (priority > bestPriorityForThisPass) {
          bestCandidateToAddThisPass = candidate;
          bestPriorityForThisPass = priority;
          indexOfBestCandidateInPool = i;
        }
      }

      if (bestCandidateToAddThisPass) {
        currentSchedule.push(bestCandidateToAddThisPass);
        currentSubjectsSet.add(bestCandidateToAddThisPass.subject);
        poolOfCandidatesForAttempt.splice(indexOfBestCandidateInPool, 1);
      } else {
        break;
      }
    }

    if (currentSchedule.length > 0) {
      const numSubjects = currentSubjectsSet.size;
      const totalUnits = currentSchedule.reduce((sum, c) => sum + (parseFloat(c.creditedUnits || c.units) || 0), 0);
      const timePrefScore = scoreScheduleByTimePreference(currentSchedule, preferredTimeOfDayOrder);

      if (
        numSubjects > bestOverallSubjectsCount ||
        (numSubjects === bestOverallSubjectsCount && totalUnits > bestOverallUnits) ||
        (numSubjects === bestOverallSubjectsCount && totalUnits === bestOverallUnits && timePrefScore < bestOverallTimePref)
      ) {
        bestOverallSchedule = [...currentSchedule];
        bestOverallSubjectsCount = numSubjects;
        bestOverallUnits = totalUnits;
        bestOverallTimePref = timePrefScore;
      }
    }
  }
  return bestOverallSchedule;
}


function generateBestPartialSchedule(courses, maxUnits, maxGapHours, preferredTimeOfDayOrder) {
  if (!courses || courses.length === 0) return [];

  if (courses.length <= SMALL_N_THRESHOLD_PARTIAL) {
    let best = [];
    let bestSubjects = 0;
    let bestUnits = 0;
    let bestTimePref = Infinity;

    const allSubsets = getAllSubsets(courses);

    for (const subset of allSubsets) {
      if (subset.length === 0) continue;

      const subjects = subset.map(c => c.subject);
      if (new Set(subjects).size !== subjects.length) continue;

      if (!isScheduleConflictFree(subset, parseSchedule, checkTimeOverlap)) continue;
      if (exceedsMaxUnits(subset, maxUnits)) continue;
      if (exceedsMaxGap(subset, maxGapHours)) continue;

      const uniqueSubjects = new Set(subset.map(c => c.subject)).size;
      const totalUnits = subset.reduce((sum, c) => sum + (parseFloat(c.creditedUnits || c.units) || 0), 0);
      const timePrefScore = scoreScheduleByTimePreference(subset, preferredTimeOfDayOrder);

      if (
        uniqueSubjects > bestSubjects ||
        (uniqueSubjects === bestSubjects && totalUnits > bestUnits) ||
        (uniqueSubjects === bestSubjects && totalUnits === bestUnits && timePrefScore < bestTimePref)
      ) {
        best = [...subset];
        bestSubjects = uniqueSubjects;
        bestUnits = totalUnits;
        bestTimePref = timePrefScore;
      }
    }
    return best;
  } else {
    return generateBestPartialSchedule_Heuristic(
      courses,
      maxUnits,
      maxGapHours,
      preferredTimeOfDayOrder
    );
  }
}


function App() {
  const [allCourses, setAllCourses] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.COURSES, []));
  const [excludedDays, setExcludedDays] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.EXCLUDED_DAYS, []));
  const [excludedTimeRanges, setExcludedTimeRanges] = useState(() => {
    const savedRanges = loadFromLocalStorage(LOCAL_STORAGE_KEYS.EXCLUDED_RANGES, [{ id: Date.now(), start: '', end: '', }]);
    return Array.isArray(savedRanges) && savedRanges.length > 0 ? savedRanges : [{ id: Date.now(), start: '', end: '', }];
  });
  const [rawData, setRawData] = useState('');
  const [theme, setTheme] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.THEME, 'dark'));
  const [themePalette, setThemePalette] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEYS.THEME_PALETTE, { light: 'original', dark: 'original' }));
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
    const saved = loadFromLocalStorage(LOCAL_STORAGE_KEYS.SCHEDULE_SEARCH_MODE, 'partial');
    return ALLOWED_SEARCH_MODES.includes(saved) ? saved : 'partial';
  });

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  });

  const [generatedSchedules, setGeneratedSchedules] = useState([]);
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClearAllLocks = () => {
    setConfirmDialog({
      open: true,
      title: 'Clear All Locks',
      message: 'Are you sure you want to clear all locks? This will unlock all courses.',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      onConfirm: () => {
        setAllCourses(prev => prev.map(c => ({ ...c, isLocked: false })));
        setConfirmDialog(d => ({ ...d, open: false }));
        toast.success('All locks cleared!');
      },
      onCancel: () => setConfirmDialog(d => ({ ...d, open: false })),
    });
  };

  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.COURSES, JSON.stringify(allCourses)); }, [allCourses]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.EXCLUDED_DAYS, JSON.stringify(excludedDays)); }, [excludedDays]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.EXCLUDED_RANGES, JSON.stringify(excludedTimeRanges)); }, [excludedTimeRanges]);
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, JSON.stringify(theme));
    document.documentElement.setAttribute('data-theme', theme);
    const currentPalette = themePalette[theme];
    if (currentPalette) {
      document.documentElement.setAttribute('data-palette', currentPalette);
    } else {
      document.documentElement.setAttribute('data-palette', 'original');
    }
  }, [theme, themePalette]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.THEME_PALETTE, JSON.stringify(themePalette)); }, [themePalette]);
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
      toast.success(`Added ${coursesWithDefaults.length} courses!`);
    } catch (error) {
      console.error("Error parsing raw data:", error);
      toast.error(`Error loading data: ${error.message}`);
    }
  };

  const handleDeleteCourse = (courseIdentity) => {
    const { id, subject, section } = courseIdentity;
    setAllCourses(prev => prev.filter(c => !(c.id === id && c.subject === subject && c.section === section)));
  };

  const handleDeleteAllCourses = () => {
    setConfirmDialog({
      open: true,
      title: 'Delete All Courses',
      message: 'Delete ALL courses? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        setAllCourses([]); setRawData(''); setConfirmDialog(d => ({ ...d, open: false }));
      },
      onCancel: () => setConfirmDialog(d => ({ ...d, open: false })),
    });
  };

  const handleToggleLockCourse = (courseIdentity) => {
    const { id, subject, section } = courseIdentity;
    console.log('Toggling lock for course:', courseIdentity);
    const courseBeforeToggle = allCourses.find(c => c.id === id && c.subject === subject && c.section === section);
    console.log('Course before toggle:', courseBeforeToggle);

    if (!courseBeforeToggle) return;

    if (courseBeforeToggle.isLocked) {
      console.log('Unlocking already locked course');
      setAllCourses(prev => prev.map(c =>
        c.id === id && c.subject === subject && c.section === section
          ? { ...c, isLocked: false }
          : c
      ));
      return;
    }

    const lockedCourses = allCourses.filter(c => c.isLocked);
    console.log('Current locked courses:', lockedCourses);
    const courseToLock = courseBeforeToggle;
    const scheduleToLock = parseSchedule(courseToLock.schedule);
    console.log('Schedule of course to lock:', scheduleToLock);

    if (!scheduleToLock || scheduleToLock.isTBA || !scheduleToLock.startTime || !scheduleToLock.endTime) {
      console.log('Course has TBA or invalid schedule, skipping conflict check');
      setAllCourses(prev => prev.map(c =>
        c.id === id && c.subject === subject && c.section === section
          ? { ...c, isLocked: true }
          : c
      ));
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
      const attemptedCourseDetails = `${courseBeforeToggle.subject} ${courseBeforeToggle.section} (${courseBeforeToggle.schedule})`;
      const conflictingDetails = conflictingCourses.map(c => `${c.subject} ${c.section} (${c.schedule})`).join('; ');
      toast.error(`Lock failed: Attempted to lock ${attemptedCourseDetails}, but it conflicts with: ${conflictingDetails}`);
      setConfirmDialog({
        open: true,
        title: 'Schedule Conflict',
        message: `You attempted to lock ${attemptedCourseDetails}, but it conflicts with the following locked course(s):\n${conflictingDetails}.\nDo you still want to lock it?`,
        confirmText: 'Lock Anyway',
        cancelText: 'Cancel',
        onConfirm: () => {
          setAllCourses(prev => prev.map(c =>
            c.id === id && c.subject === subject && c.section === section
              ? { ...c, isLocked: true }
              : c
          ));
          setConfirmDialog(d => ({ ...d, open: false }));
        },
        onCancel: () => setConfirmDialog(d => ({ ...d, open: false })),
      });
      return;
    }

    console.log('Locking the course');
    setAllCourses(prev => {
      const updatedCourses = prev.map(c =>
        c.id === id && c.subject === subject && c.section === section
          ? { ...c, isLocked: true }
          : c
      );
      console.log('All courses after locking:', updatedCourses);
      return updatedCourses;
    });
  };

  const handleToggleTheme = () => { setTheme(prev => (prev === 'light' ? 'dark' : 'light')); };
  const handleTogglePalette = () => {
    setThemePalette(prev => {
      const currentTheme = theme;
      const currentPalette = prev[currentTheme];
      const newPalette = currentPalette === 'original' ? 'comfort' : 'original';
      return {
        ...prev,
        [currentTheme]: newPalette,
      };
    });
  };

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
    setMaxClassGapHours(value);
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

  const applyScheduleByIndex = (index) => {
    if (!generatedSchedules[index]) return;
    const scheduleIds = new Set(generatedSchedules[index]);
    setAllCourses(prev => prev.map(course => ({
      ...course,
      isLocked: scheduleIds.has(`${course.id}-${course.subject}-${course.section}`)
    })));
    setCurrentScheduleIndex(index);
  };

  const handleNextSchedule = () => {
    if (generatedSchedules.length === 0) return;
    const nextIndex = (currentScheduleIndex + 1) % generatedSchedules.length;
    applyScheduleByIndex(nextIndex);
  };

  const handlePrevSchedule = () => {
    if (generatedSchedules.length === 0) return;
    const prevIndex = (currentScheduleIndex - 1 + generatedSchedules.length) % generatedSchedules.length;
    applyScheduleByIndex(prevIndex);
  };

  const handleClearGeneratedSchedules = () => {
    triedScheduleCombinations.clear();
    setGeneratedScheduleCount(0);
    setGeneratedSchedules([]);
    setCurrentScheduleIndex(0);
    handleClearAllLocks();
  };


  const generateBestSchedule = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
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
        toast.info('Warning: Exhaustive search may be very slow for more than 12 subjects. Consider using Fast mode.');
      }

      if (scheduleSearchMode === 'exhaustive') {
        const { bestSchedule, bestScore } = generateExhaustiveBestSchedule(coursesBySubject, preferredTimeOfDayOrder, maxUnits, maxClassGapHours);
        if (bestSchedule.length > 0) {
          const isActuallyConflictFree = isScheduleConflictFree(bestSchedule, parseSchedule, checkTimeOverlap);
          if (!isActuallyConflictFree) {
            toast.error("The best schedule found still had conflicts. Please try again or adjust filters. No schedule applied.");
            return;
          }
          const uniqueCourseKey = (course) => `${course.id}-${course.subject}-${course.section}`;
          const bestScheduleKeys = new Set(bestSchedule.map(uniqueCourseKey));
          setAllCourses(prev => prev.map(course => ({
            ...course,
            isLocked: bestScheduleKeys.has(uniqueCourseKey(course))
          })));
          setGeneratedScheduleCount(prev => prev + 1);
          setGeneratedSchedules(prev => {
            const newScheduleKeysArray = bestSchedule.map(uniqueCourseKey);
            const existingIdx = prev.findIndex(sched => sched.length === newScheduleKeysArray.length && sched.every((id, i) => id === newScheduleKeysArray[i]));

            if (existingIdx === -1) { // New schedule
              setCurrentScheduleIndex(prev.length);
              return [...prev, newScheduleKeysArray];
            } else { // Existing schedule
              setCurrentScheduleIndex(existingIdx);
              return prev;
            }
          });
          toast.success(`Generated schedule #${generatedScheduleCount + 1} with ${bestSchedule.length} courses (${bestScore - bestSchedule.length * 100} units)`);
        } else {
          toast.error("Couldn't generate a valid schedule with current filters");
        }
        return;
      }

      if (scheduleSearchMode === 'partial') {
        const bestPartial = generateBestPartialSchedule(filteredCourses, maxUnits, maxClassGapHours, preferredTimeOfDayOrder);
        if (bestPartial.length > 0) {
          const uniqueCourseKey = (course) => `${course.id}-${course.subject}-${course.section}`;
          const bestScheduleKeys = new Set(bestPartial.map(uniqueCourseKey));
          setAllCourses(prev => prev.map(course => ({
            ...course,
            isLocked: bestScheduleKeys.has(uniqueCourseKey(course))
          })));
          setGeneratedScheduleCount(prev => prev + 1);
          setGeneratedSchedules(prev => {
            const newScheduleKeysArray = bestPartial.map(uniqueCourseKey);
            const existingIdx = prev.findIndex(sched => sched.length === newScheduleKeysArray.length && sched.every((id, i) => id === newScheduleKeysArray[i]));

            if (existingIdx === -1) { // New schedule
              setCurrentScheduleIndex(prev.length);
              return [...prev, newScheduleKeysArray];
            } else { // Existing schedule
              setCurrentScheduleIndex(existingIdx);
              return prev;
            }
          });
          toast.success(`Generated schedule #${generatedScheduleCount + 1} with ${bestPartial.length} courses (${bestPartial.reduce((sum, c) => sum + (parseFloat(c.creditedUnits || c.units) || 0), 0)} units, ${new Set(bestPartial.map(c => c.subject)).size} subjects)`);
        } else {
          toast.error("Couldn't generate a valid partial schedule with current filters");
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
        if (exceedsMaxUnits(currentSchedule, maxUnits)) {
          continue;
        }
        if (exceedsMaxGap(currentSchedule, maxClassGapHours)) {
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
          toast.error("The best schedule found still had conflicts. Please try again or adjust filters. No schedule applied.");
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
        setGeneratedSchedules(prev => {
          const newScheduleKeysArray = bestSchedule.map(uniqueCourseKey);
          const existingIdx = prev.findIndex(sched => sched.length === newScheduleKeysArray.length && sched.every((id, i) => id === newScheduleKeysArray[i]));

          if (existingIdx === -1) { // New schedule
            setCurrentScheduleIndex(prev.length);
            return [...prev, newScheduleKeysArray];
          } else { // Existing schedule
            setCurrentScheduleIndex(existingIdx);
            return prev;
          }
        });
        toast.success(`Generated schedule #${generatedScheduleCount + 1} with ${bestSchedule.length} courses (${bestScore - bestSchedule.length * 100} units)`);
      } else {
        toast.error("Couldn't generate a valid schedule with current filters");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (generatedSchedules.length === 0) {
      setCurrentScheduleIndex(0);
    } else if (currentScheduleIndex > generatedSchedules.length - 1) {
      setCurrentScheduleIndex(generatedSchedules.length - 1);
    }
  }, [generatedSchedules, currentScheduleIndex]);


  return (
    <>
      <ToastContainer position="top-center" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      <header className="app-header">
        <div className="App">
          <div className="app-title" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src={theme === 'light' ? LogoLight : LogoDark}
              alt="CIT-U Logo"
              style={{ width: 40, height: 40, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            />
            <h1 style={{ margin: 0 }}>CIT-U Course Builder</h1>
          </div>
        </div>
      </header>
      <div className="App">
        <div className="header-controls">
          <div className="app-controls">
            <button className="theme-toggle-button" onClick={handleToggleTheme}>
              {theme === 'light' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                  </svg>
                  Switch to Dark Mode
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2"></path>
                    <path d="M12 20v2"></path>
                    <path d="m4.93 4.93 1.41 1.41"></path>
                    <path d="m17.66 17.66 1.41 1.41"></path>
                    <path d="M2 12h2"></path>
                    <path d="M20 12h2"></path>
                    <path d="m6.34 17.66-1.41 1.41"></path>
                    <path d="m19.07 4.93-1.41 1.41"></path>
                  </svg>
                  Switch to Light Mode
                </>
              )}
            </button>
            <button className="palette-toggle-button" onClick={handleTogglePalette}>
              <PaletteOutlinedIcon fontSize="small" />
              {themePalette[theme] === 'original' ? 'Switch to Comfort Palette' : 'Switch to Original Palette'}
            </button>
          </div>
          <div className="auto-schedule-controls">
            <button
              className="generate-schedule-button"
              onClick={generateBestSchedule}
              disabled={allCourses.length === 0 || isGenerating}
            >
              {isGenerating ? (
                <>
                  Generating...
                  <span className="spinner" style={{ marginLeft: 8, display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                  Generate Schedule
                </>
              )}
            </button>
            {generatedSchedules.length > 1 && (
              <>
                <button onClick={handlePrevSchedule} aria-label="Previous Schedule">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"></path>
                  </svg>
                  Previous
                </button>
                <span style={{ margin: '0 8px', display: 'flex', alignItems: 'center', padding: '0 8px', background: 'var(--accent-light)', borderRadius: 'var(--border-radius-md)', color: 'var(--accent)', fontWeight: 'var(--font-weight-medium)' }}>
                  Schedule {currentScheduleIndex + 1} of {generatedSchedules.length}
                </span>
                <button onClick={handleNextSchedule} aria-label="Next Schedule">
                  Next
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"></path>
                  </svg>
                </button>
              </>
            )}
            {generatedSchedules.length > 0 && (
              <button onClick={handleClearGeneratedSchedules} className="danger-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Reset Schedule
              </button>
            )}
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
                  {showTimetable ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                        <line x1="2" x2="22" y1="2" y2="22"></line>
                      </svg>
                      Hide Timetable
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                      </svg>
                      Show Timetable
                    </>
                  )}
                </button>
              </div>
              {showTimetable && (
                <TimetableView lockedCourses={lockedCourses} conflictingLockedCourseIds={conflictingLockedCourseIds} />
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
          <div className="preferences-filters-grid">
            <div className="first-column-preferences">
              <div className="preference-item" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="searchModeSelect" className="filter-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                  Schedule Search Mode
                  <Tooltip
                    title={
                      <span style={{ whiteSpace: 'pre-line' }}>
                        {'Schedule Search Modes:\n'}
                        {'- Recommended (Flexible, Best Fit): Maximizes the number of subjects and units in your schedule, even if not all subjects fit. Best for most users.\n'}
                        {'- Full Coverage (All Subjects, Strict): Only generates a schedule if all subjects can fit within your constraints. Use if you must take every subject.\n'}
                        {'- Quick (Fast, May Miss Best): Finds a schedule quickly, but may not be the best possible combination.'}
                      </span>
                    }
                    arrow
                    placement="right"
                  >
                    <InfoOutlinedIcon style={{ color: '#1976d2', cursor: 'pointer', fontSize: 20 }} />
                  </Tooltip>
                </label>
                <select
                  id="searchModeSelect"
                  value={scheduleSearchMode}
                  onChange={e => setScheduleSearchMode(e.target.value)}
                  className="preference-select"
                >
                  <option value="partial">Recommended (Flexible, Best Fit)</option>
                  <option value="exhaustive">Full Coverage (All Subjects, Strict)</option>
                  <option value="fast">Quick (Fast, May Miss Best)</option>
                </select>
              </div>
              <div className="preference-item">
                <label htmlFor="maxUnitsInput" className="filter-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                  Maximum Units
                  <Tooltip
                    title={
                      <span style={{ whiteSpace: 'pre-line' }}>
                        {'Set the maximum total number of units you want in your schedule.\n'}
                        {'Leave blank for no limit.'}
                      </span>
                    }
                    arrow
                    placement="right"
                  >
                    <InfoOutlinedIcon style={{ color: '#1976d2', cursor: 'pointer', fontSize: 20 }} />
                  </Tooltip>
                </label>
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
                <label htmlFor="maxGapInput" className="filter-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                  Maximum Break Between Classes
                  <Tooltip
                    title={
                      <span style={{ whiteSpace: 'pre-line' }}>
                        {'Sets the maximum allowed break time between consecutive classes on the same day. Options range from 0 minutes (back-to-back) up to 5 hours, in 30-minute increments.'}
                      </span>
                    }
                    arrow
                    placement="right"
                  >
                    <InfoOutlinedIcon style={{ color: '#1976d2', cursor: 'pointer', fontSize: 20 }} />
                  </Tooltip>
                </label>
                <select
                  id="maxGapInput"
                  value={maxClassGapHours}
                  onChange={handleMaxClassGapHoursChange}
                  className="preference-input"
                >
                  <option value="">Any</option>
                  {[...Array(11).keys()].map(i => {
                    const hours = Math.floor(i / 2);
                    const minutes = (i % 2) * 30;
                    const value = i * 0.5;
                    const label = value === 0 ? '0 minutes (back-to-back)' : `${hours ? hours + ' hour' + (hours > 1 ? 's' : '') : ''}${hours && minutes ? ' ' : ''}${minutes ? minutes + ' minutes' : ''}`.trim();
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </select>
              </div>
            </div>
            <div className="preference-item preferred-time-preference-item">
              <label className="filter-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                Preferred Time of Day (Order)
                <Tooltip
                  title={
                    <span style={{ whiteSpace: 'pre-line' }}>
                      {'Drag to reorder your preferred times of day.\n'}
                      {'The scheduler will try to prioritize classes in your top choices.\n'}
                      {'For example, if "Morning" is first, it will try to schedule more morning classes.'}
                    </span>
                  }
                  arrow
                  placement="right"
                >
                  <InfoOutlinedIcon style={{ color: '#1976d2', cursor: 'pointer', fontSize: 20 }} />
                </Tooltip>
              </label>
              <div className="preferred-time-order-container">
                <div className="preferred-time-order-note">Drag to reorder your preferred times of day.</div>
                <ul className="preferred-time-order-list">
                  {preferredTimeOfDayOrder.length === 0 && (
                    <li className="preferred-time-order-empty">No preference set (all times treated equally)</li>
                  )}
                  {preferredTimeOfDayOrder.map((time, idx) => (
                    <li
                      key={time}
                      className="preferred-time-order-item"
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', idx);
                      }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                        if (fromIdx === idx) return;
                        setPreferredTimeOfDayOrder(prev => {
                          const newOrder = [...prev];
                          const [moved] = newOrder.splice(fromIdx, 1);
                          newOrder.splice(idx, 0, moved);
                          return newOrder;
                        });
                      }}
                    >
                      <span className="preferred-time-label">{
                        time === 'morning' ? 'Morning (before 12 PM)' :
                          time === 'afternoon' ? 'Afternoon (12 PM - 5 PM)' :
                            time === 'evening' ? 'Evening (after 5 PM)' :
                              'Any'
                      }</span>
                      <button type="button" className="preferred-time-remove" onClick={() => handleRemoveTimePref(idx)}>✕</button>
                    </li>
                  ))}
                </ul>
                <div className="preferred-time-order-actions">
                  {[...DEFAULT_PREFERRED_TIMES_ORDER].filter(t => !preferredTimeOfDayOrder.includes(t)).map(time => (
                    <button key={time} type="button" className="preferred-time-add" onClick={() => handleAddTimePref(time)}>
                      Add {time.charAt(0).toUpperCase() + time.slice(1)}
                    </button>
                  ))}
                  <button type="button" className="preferred-time-reset" onClick={handleResetTimePrefs}>Reset</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="section-container">
          <h2>Course Filters</h2>
          <div className="preferences-filters-grid">
            <TimeFilter
              excludedDays={excludedDays}
              excludedTimeRanges={excludedTimeRanges}
              onDayChange={handleDayChange}
              onTimeRangeChange={handleTimeRangeChange}
              onAddTimeRange={handleAddTimeRange}
              onRemoveTimeRange={handleRemoveTimeRange}
            />
            <div className="filter-section">
              <label className="filter-label">Class Types:</label>
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
        </div>

        <CourseTable
          courses={processedCourses}
          allCoursesCount={allCourses.length}
          groupingKey={groupingKey}
          onGroupingChange={handleGroupingChange}
          selectedStatusFilter={selectedStatusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          onDeleteCourse={handleDeleteCourse}
          onToggleLockCourse={handleToggleLockCourse}
          conflictingLockedCourseIds={conflictingLockedCourseIds}
          onClearAllLocks={handleClearAllLocks}
          onDeleteAllCourses={handleDeleteAllCourses}
          totalUnitsDisplay={totalUnits}
          uniqueSubjectsDisplay={uniqueSubjects}
          lockedCoursesCountDisplay={lockedCoursesCount}
        />

        <div className="section-container">
          <h2>Import Data</h2>
          <p>
            Need help? Check out the <a href="https://github.com/MasuRii/CITUCourseBuilder/blob/main/UsageGuide.md" target="_blank" rel="noopener noreferrer">Usage Guide</a> for instructions on how to get your course data.
          </p>
          <RawDataInput
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            onSubmit={handleLoadRawData}
          />
        </div>
      </div>
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
      />
    </>
  );
}

export default App;