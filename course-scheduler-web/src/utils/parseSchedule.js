/**
 * Converts a time string in AM/PM format to 24-hour format.
 * Example: "9:00AM" -> "09:00", "1:30PM" -> "13:30"
 * @param {string} timeStr - The time string (e.g., "9:00AM", "12:00PM").
 * @returns {string|null} The time in HH:mm format or null if invalid.
 */
function convertAmPmTo24Hour(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const lowerTimeStr = timeStr.toLowerCase();
  const match = lowerTimeStr.match(/(\d{1,2}):(\d{2})(am|pm)/);

  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3];

  if (hours === 12) {
    hours = period === 'am' ? 0 : 12;
  } else if (period === 'pm') {
    hours += 12;
  }

  const hoursStr = hours.toString().padStart(2, '0');

  return `${hoursStr}:${minutes}`;
}

/**
 * Normalizes day codes to standard single character format
 * @param {string} day - The day code (e.g., "M", "TH", "SAT")
 * @returns {string|null} The normalized day code or null if invalid
 */
function normalizeDayCode(day) {
  const dayMap = {
    'M': 'M',
    'T': 'T',
    'W': 'W',
    'TH': 'TH',
    'F': 'F',
    'S': 'S',
    'SAT': 'S',    // Map SAT to S
    'SU': 'SU',
    'U': 'SU',
    'SUN': 'SU'    // Map SUN to SU
  };

  return dayMap[day] || null;
}

/**
 * Parses a raw schedule string into structured data.
 * Handles formats like:
 * - "TTH | 9:00AM-10:30AM | ROOM" 
 * - "TBA"
 * - "M/T/W/TH/F | 12:00PM-1:00PM/12:00PM-2:00PM | ROOM"
 * - "TTH | 9:00AM-10:30AM | ROOM | LEC + M/W/F | 9:00AM-12:00PM | ROOM | LAB"
 * 
 * @param {string} scheduleString - The raw schedule string.
 * @returns {object|null} An object with { days: string[], startTime: string, endTime: string, isTBA: boolean } or null if parsing fails.
 *                        Times are in 24-hour format (HH:mm). Days are single chars (M, T, W, TH, F, S, SU).
 */
function parseSchedule(scheduleString) {
  if (!scheduleString || typeof scheduleString !== 'string') {
    return null;
  }

  const upperScheduleString = scheduleString.toUpperCase().trim();

  if (upperScheduleString === 'TBA') {
    return { days: [], startTime: null, endTime: null, isTBA: true };
  }

  // Handle combined schedules (LEC + LAB)
  if (upperScheduleString.includes('+')) {
    const schedules = upperScheduleString.split('+').map(s => s.trim());
    
    // Process both lecture and lab parts
    const lecturePart = parseSchedulePart(schedules[0]);
    if (!lecturePart) {
      return null;
    }
    
    // If there's a second part (lab), include its days as well
    if (schedules.length > 1) {
      const labPart = parseSchedulePart(schedules[1]);
      if (labPart) {
        // Combine days from both lecture and lab
        return {
          days: [...new Set([...lecturePart.days, ...labPart.days])].sort(),
          startTime: lecturePart.startTime,
          endTime: lecturePart.endTime,
          isTBA: lecturePart.isTBA,
        };
      }
    }

    return lecturePart;
  }

  return parseSchedulePart(upperScheduleString);
}

/**
 * Helper function to parse a single schedule part
 */
function parseSchedulePart(schedulePart) {
  const parts = schedulePart.split('|').map(part => part.trim());

  if (parts.length < 2) {
    console.warn(`Could not parse schedule part: ${schedulePart} - Unexpected format.`);
    return null;
  }

  const daysPart = parts[0];
  const timePart = parts[1];

  // Parse days (M/T/W/TH/F/S/SU)
  let days = [];

  // Split by slashes if present
  const daysSplit = daysPart.split('/');
  if (daysSplit.length > 1) {
    // Handle day format like "M/T/W/TH/F" or "T/TH/SAT"
    daysSplit.forEach(day => {
      const trimmedDay = day.trim();
      const normalizedDay = normalizeDayCode(trimmedDay);
      if (normalizedDay) {
        days.push(normalizedDay);
      }
    });
  } else {
    // Try to match special patterns first
    if (daysPart.includes('SAT')) {
      days.push('S'); // Saturday
      processRemainingDays(daysPart.replace(/SAT/g, ''), days);
    } else if (daysPart.includes('TH')) {
      days.push('TH');
      processRemainingDays(daysPart.replace(/TH/g, ''), days);
    } else {
      // Process each character in the day string
      processRemainingDays(daysPart, days);
    }
  }

  // Remove duplicates and sort
  days = [...new Set(days)].sort();

  // Parse time ranges, handling multiple formats
  // Case 1: Single time range like "9:00AM-10:30AM"
  // Case 2: Multiple time ranges like "12:00PM-1:00PM/12:00PM-2:00PM"

  // First check if we have multiple time ranges
  if (timePart.includes('/')) {
    // Take the first time range for simplicity
    const firstTimeRange = timePart.split('/')[0].trim();
    const timeRangeParts = firstTimeRange.split('-').map(time => time.trim());

    if (timeRangeParts.length !== 2) {
      console.warn(`Could not parse complex time range: ${timePart} in schedule: ${schedulePart}`);
      return null;
    }

    const startTime = convertAmPmTo24Hour(timeRangeParts[0]);
    const endTime = convertAmPmTo24Hour(timeRangeParts[1]);

    if (!startTime || !endTime) {
      console.warn(`Could not convert complex time to 24hr format: ${timePart} in schedule: ${schedulePart}`);
      return null;
    }

    return {
      days: days,
      startTime: startTime,
      endTime: endTime,
      isTBA: false,
    };
  }

  // Standard case: Simple time range
  const timeRange = timePart.split('-').map(time => time.trim());
  if (timeRange.length !== 2) {
    console.warn(`Could not parse time range: ${timePart} in schedule: ${schedulePart}`);
    return null;
  }

  const startTime = convertAmPmTo24Hour(timeRange[0]);
  const endTime = convertAmPmTo24Hour(timeRange[1]);

  if (!startTime || !endTime) {
    console.warn(`Could not convert time to 24hr format: ${timePart} in schedule: ${schedulePart}`);
    return null;
  }

  return {
    days: days,
    startTime: startTime,
    endTime: endTime,
    isTBA: false,
  };
}

/**
 * Helper function to process individual characters in a day string
 */
function processRemainingDays(dayString, daysArray) {
  dayString.split('').forEach(day => {
    const normalizedDay = normalizeDayCode(day);
    if (normalizedDay) {
      daysArray.push(normalizedDay);
    }
  });
}

export { parseSchedule };

