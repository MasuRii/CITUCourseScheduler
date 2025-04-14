
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
   * Parses a raw schedule string into structured data.
   * Handles formats like "TTH | 9:00AM-10:30AM | ROOM" or "TBA".
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
  
    const parts = upperScheduleString.split('|').map(part => part.trim());
  
    if (parts.length < 2) {
      console.warn(`Could not parse schedule: ${scheduleString} - Unexpected format.`);
      return null;
    }
  
    const daysPart = parts[0];
    const timePart = parts[1];
  
    let days = [];
    if (daysPart.includes('TH')) {
        days.push('TH');
        daysPart.replace('TH', '').split('').forEach(day => {
            if (['M', 'T', 'W', 'F', 'S'].includes(day)) {
                days.push(day);
            } else if (day === 'U') {
                days.push('SU');
            }
        });
    } else {
        daysPart.split('').forEach(day => {
            if (['M', 'T', 'W', 'F', 'S'].includes(day)) {
                days.push(day);
            } else if (day === 'U') {
                days.push('SU');
            }
        });
    }
    days = [...new Set(days)].sort();
  
  
    const timeRange = timePart.split('-').map(time => time.trim());
    if (timeRange.length !== 2) {
      console.warn(`Could not parse time range: ${timePart} in schedule: ${scheduleString}`);
      return null;
    }
  
    const startTime = convertAmPmTo24Hour(timeRange[0]);
    const endTime = convertAmPmTo24Hour(timeRange[1]);
  
    if (!startTime || !endTime) {
      console.warn(`Could not convert time to 24hr format: ${timePart} in schedule: ${scheduleString}`);
      return null;
    }
  
    return {
      days: days,
      startTime: startTime,
      endTime: endTime,
      isTBA: false,
    };
  }
  
  export { parseSchedule };