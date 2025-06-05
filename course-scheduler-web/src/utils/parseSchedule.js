/**
 * Converts a time string in AM/PM format to 24-hour format.
 * Example: "9:00AM" -> "09:00", "1:30PM" -> "13:30"
 * @param {string} timeStr - The time string (e.g., "9:00AM", "12:00PM").
 * @returns {string|null} The time in HH:mm format or null if invalid.
 */
function convertAmPmTo24Hour(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;

  const lowerTimeStr = timeStr.toLowerCase();
  const match = lowerTimeStr.match(/([0-9]{1,2}):([0-9]{2}) *(am|pm)/);

  if (!match) {
    console.warn(
      `convertAmPmTo24Hour: Regex failed to match time string: '${timeStr}' (lowercase: '${lowerTimeStr}') with regex /([0-9]{1,2}):([0-9]{2}) *(am|pm)/`
    );
    return null;
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3];

  if (hours === 12) {
    hours = period === "am" ? 0 : 12;
  } else if (period === "pm") {
    hours += 12;
  }

  const hoursStr = hours.toString().padStart(2, "0");

  return `${hoursStr}:${minutes}`;
}

/**
 * Normalizes day codes to standard single character format
 * @param {string} day - The day code (e.g., "M", "TH", "SAT")
 * @returns {string|null} The normalized day code or null if invalid
 */
function normalizeDayCode(day) {
  const dayMap = {
    M: "M",
    T: "T",
    W: "W",
    TH: "TH",
    F: "F",
    S: "S",
    SAT: "S", // Map SAT to S
    SU: "SU",
    U: "SU",
    SUN: "SU", // Map SUN to SU
  };

  return dayMap[day] || null;
}

/**
 * Parses a single time range string (e.g., "9:00AM-10:30AM")
 * @param {string} timeRangeStr
 * @returns {{startTime: string, endTime: string} | null}
 */
function parseSingleTimeRange(timeRangeStr) {
  const timeRangeParts = timeRangeStr.split("-").map((time) => time.trim());
  if (timeRangeParts.length !== 2) {
    console.warn(`Could not parse time range: ${timeRangeStr}`);
    return null;
  }
  const startTime = convertAmPmTo24Hour(timeRangeParts[0]);
  const endTime = convertAmPmTo24Hour(timeRangeParts[1]);

  if (!startTime || !endTime) {
    console.warn(
      `Could not convert time to 24hr format in range: ${timeRangeStr}`
    );
    return null;
  }
  return { startTime, endTime };
}

/**
 * Parses a day string segment (e.g., "MWF", "TTH", "SAT") into an array of normalized day codes.
 * @param {string} daySegmentStr - The day segment string.
 * @returns {string[]} Array of normalized day codes (e.g., ["M", "W", "F"]).
 */
function parseDaySegment(daySegmentStr) {
  const days = [];
  const normalizedDayStr = daySegmentStr.toUpperCase().trim();

  // Handle "TH", "SAT", "SUN" as whole tokens first to avoid splitting "TH" into "T", "H"
  let remainingDayStr = normalizedDayStr;

  // Order matters: TH before T, SAT before S, SUN before S/U
  const specialDayMappings = [
    { token: "TH", code: "TH" },
    { token: "SAT", code: "S" },
    { token: "SUN", code: "SU" },
  ];

  specialDayMappings.forEach((mapping) => {
    if (remainingDayStr.includes(mapping.token)) {
      days.push(mapping.code);
      remainingDayStr = remainingDayStr.replace(
        new RegExp(mapping.token, "g"),
        ""
      );
    }
  });

  // Process remaining individual characters
  for (const char of remainingDayStr) {
    const normalized = normalizeDayCode(char); // normalizeDayCode handles M, T, W, F, S, U
    if (normalized && !days.includes(normalized)) {
      // Avoid duplicates if TH, S, SU already added
      // Special check: if 'T' is processed and 'TH' was already added, skip 'T'.
      if (normalized === "T" && days.includes("TH")) continue;
      // Special check: if 'S' is processed and 'SU' was already added, skip 'S' (SAT becomes S, SUN becomes SU)
      if (normalized === "S" && days.includes("SU")) continue;
      days.push(normalized);
    }
  }
  return [...new Set(days)].sort(); // Ensure uniqueness and sort
}

/**
 * Parses a raw schedule string into structured data.
 * Handles formats like:
 * - "TTH | 9:00AM-10:30AM | ROOM"
 * - "TBA"
 * - "M/T/W/TH/F | 12:00PM-1:00PM/12:00PM-2:00PM | ROOM" (Days apply to first time, subsequent times might be for the last day or unassigned)
 * - "F/SAT | 10:30AM-11:30AM/7:00PM-9:00PM | ROOM" (F -> 10:30-11:30, SAT -> 7:00-9:00)
 * - "TTH | 9:00AM-10:30AM | ROOM | LEC + M/W/F | 9:00AM-12:00PM | ROOM | LAB"
 * - "W/SAT | 9:00AM-10:30AM | Room#online/ACAD309 | LEC" (W -> online, SAT -> ACAD309)
 *
 * @param {string} scheduleString - The raw schedule string.
 * @returns {object|null} An object with { days: string[], startTime: string, endTime: string, isTBA: boolean } or null if parsing fails.
 *                        Times are in 24-hour format (HH:mm). Days are single chars (M, T, W, TH, F, S, SU).
 */
function parseSchedule(scheduleString) {
  if (!scheduleString || typeof scheduleString !== "string") {
    return null;
  }

  const upperScheduleString = scheduleString.toUpperCase().trim();

  if (upperScheduleString === "TBA") {
    return { days: [], startTime: null, endTime: null, isTBA: true };
  }

  const combinedParts = upperScheduleString.split("+").map((s) => s.trim());
  let finalTimeSlots = [];
  let allRepresentativeDays = new Set();

  for (const partStr of combinedParts) {
    const slotsFromPart = parseSchedulePart(partStr);
    if (slotsFromPart && slotsFromPart.length > 0) {
      finalTimeSlots.push(...slotsFromPart);
      slotsFromPart.forEach((slot) =>
        slot.days.forEach((day) => allRepresentativeDays.add(day))
      );
    } else if (combinedParts.length === 1 && !slotsFromPart) {
      // if single part fails to parse, return null for the whole schedule
      console.warn(
        `Failed to parse schedule part: ${partStr} in ${scheduleString}`
      );
      return null;
    }
  }

  if (finalTimeSlots.length === 0) {
    // If after attempting to parse all parts, no slots were generated, treat as unparsable or TBA-like
    // This could happen if all parts were empty or unparseable, but not "TBA"
    console.warn(`No valid time slots found for schedule: ${scheduleString}`);
    // To be consistent, if not explicitly TBA and fails parsing, return null or a specific error state.
    // For now, let's return null if not explicitly TBA but parsing yields nothing.
    // If the original string wasn't "TBA" but resulted in no slots, it's a parsing failure.
    return null;
  }

  return {
    allTimeSlots: finalTimeSlots,
    representativeDays: [...allRepresentativeDays].sort(),
    isTBA: false,
    rawScheduleString: scheduleString,
  };
}

/**
 * Helper function to parse a single schedule part (e.g., "DAYS | TIMES | ROOM")
 * Returns an array of TimeSlot objects.
 * @param {string} schedulePartStr - The string for a single schedule component (e.g., "F/SAT | 10:30AM-11:30AM/7:00PM-9:00PM")
 * @returns {TimeSlot[] | null} An array of TimeSlot objects or null if critical parsing error.
 */
function parseSchedulePart(schedulePartStr) {
  const rawParts = schedulePartStr.split("|").map((part) => part.trim());

  if (rawParts.length < 2) {
    console.warn(
      `Could not parse schedule part: ${schedulePartStr} - Expected at least 2 parts (Days | Times).`
    );
    return null;
  }

  const daysComponent = rawParts[0]; // e.g., "F/SAT" or "MWF"
  const timesComponent = rawParts[1]; // e.g., "10:30AM-11:30AM/7:00PM-9:00PM" or "9:00AM-10:00AM"

  // Get room component if available (could be "Room#FIELD" or "Room#online/ACAD309")
  const roomComponent = rawParts.length >= 3 ? rawParts[2] : "";

  // Parse room information - extract rooms for each day if multiple are provided
  let roomsArray = [];
  if (roomComponent && roomComponent.toLowerCase().startsWith("room#")) {
    const roomsSection = roomComponent.substring(5); // Remove "Room#" prefix
    roomsArray = roomsSection.split("/").map((room) => room.trim());
  } else if (roomComponent) {
    roomsArray = [roomComponent.trim()];
  }

  const daySegmentsStrs = daysComponent.split("/").map((s) => s.trim()); // ["F", "SAT"]
  const timeSegmentsStrs = timesComponent.split("/").map((s) => s.trim()); // ["10:30AM-11:30AM", "7:00PM-9:00PM"]

  const parsedDaySegments = daySegmentsStrs.map(parseDaySegment); // [["F"], ["S"]]
  const parsedTimeSegments = timeSegmentsStrs.map(parseSingleTimeRange); // [{start, end}, {start, end}]

  const resultingTimeSlots = [];

  if (
    parsedDaySegments.some((ds) => ds.length === 0) ||
    parsedTimeSegments.some((ts) => ts === null)
  ) {
    console.warn(`Failed to parse day or time segments in: ${schedulePartStr}`);
    // If any segment is unparseable, the whole part might be invalid.
    // Depending on strictness, could return null or try to salvage. Let's be strict.
    return null;
  }

  const nDaySegments = parsedDaySegments.length;
  const nTimeSegments = parsedTimeSegments.length;
  const nRooms = roomsArray.length;

  // Reverse room array to match CITU's expected room-day mapping
  const reversedRooms = [...roomsArray].reverse();

  if (nDaySegments === nTimeSegments) {
    // One-to-one mapping: F -> Time1, SAT -> Time2
    for (let i = 0; i < nDaySegments; i++) {
      if (parsedDaySegments[i].length > 0 && parsedTimeSegments[i]) {
        const roomForDaySegment =
          i < nRooms ? reversedRooms[i] : nRooms > 0 ? reversedRooms[0] : "";
        resultingTimeSlots.push({
          days: parsedDaySegments[i],
          startTime: parsedTimeSegments[i].startTime,
          endTime: parsedTimeSegments[i].endTime,
          room: roomForDaySegment,
        });
      }
    }
  } else if (nDaySegments > nTimeSegments && nTimeSegments > 0) {
    // More days than times: assign first time to first day, last time to all remaining days
    for (let i = 0; i < nDaySegments; i++) {
      const timeIdx = i < nTimeSegments ? i : nTimeSegments - 1;
      if (parsedDaySegments[i].length > 0 && parsedTimeSegments[timeIdx]) {
        const roomForDaySegment =
          i < nRooms ? reversedRooms[i] : nRooms > 0 ? reversedRooms[0] : "";
        resultingTimeSlots.push({
          days: parsedDaySegments[i],
          startTime: parsedTimeSegments[timeIdx].startTime,
          endTime: parsedTimeSegments[timeIdx].endTime,
          room: roomForDaySegment,
        });
      }
    }
  } else if (nTimeSegments > nDaySegments && nDaySegments > 0) {
    // More times than days: assign first day to first time, last day to all remaining times
    for (let i = 0; i < nTimeSegments; i++) {
      const dayIdx = i < nDaySegments ? i : nDaySegments - 1;
      if (parsedDaySegments[dayIdx].length > 0 && parsedTimeSegments[i]) {
        const roomForTimeSegment =
          i < nRooms ? reversedRooms[i] : nRooms > 0 ? reversedRooms[0] : "";
        resultingTimeSlots.push({
          days: parsedDaySegments[dayIdx],
          startTime: parsedTimeSegments[i].startTime,
          endTime: parsedTimeSegments[i].endTime,
          room: roomForTimeSegment,
        });
      }
    }
  } else if (nDaySegments === 1 && nTimeSegments > 1) {
    // Single day group applies to all time slots: F | Time1/Time2  => F Time1, F Time2
    const days = parsedDaySegments[0];
    if (days.length > 0) {
      parsedTimeSegments.forEach((timeSlot, index) => {
        if (timeSlot) {
          const roomForTimeSlot =
            index < nRooms
              ? reversedRooms[index]
              : nRooms > 0
              ? reversedRooms[0]
              : "";
          resultingTimeSlots.push({
            days: days,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            room: roomForTimeSlot,
          });
        }
      });
    }
  } else if (nTimeSegments === 1 && nDaySegments > 1) {
    // Multiple day groups apply to a single time slot: F/SAT | Time1 => F Time1, SAT Time1
    const timeSlot = parsedTimeSegments[0];
    if (timeSlot) {
      parsedDaySegments.forEach((daysArray, index) => {
        if (daysArray.length > 0) {
          const roomForDayGroup =
            index < nRooms
              ? reversedRooms[index]
              : nRooms > 0
              ? reversedRooms[0]
              : "";
          resultingTimeSlots.push({
            days: daysArray,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            room: roomForDayGroup,
          });
        }
      });
    }
  } else {
    // Ambiguous or mismatched, e.g. "M/T | 9-10/10-11/11-12"
    // Default to pairing up to the minimum length and log warning
    console.warn(
      `Ambiguous day/time segment pairing in "${schedulePartStr}". Pairing up to shorter length.`
    );
    const minLen = Math.min(nDaySegments, nTimeSegments);
    for (let i = 0; i < minLen; i++) {
      if (parsedDaySegments[i].length > 0 && parsedTimeSegments[i]) {
        const roomForSegment =
          i < nRooms ? reversedRooms[i] : nRooms > 0 ? reversedRooms[0] : "";
        resultingTimeSlots.push({
          days: parsedDaySegments[i],
          startTime: parsedTimeSegments[i].startTime,
          endTime: parsedTimeSegments[i].endTime,
          room: roomForSegment,
        });
      }
    }
    if (resultingTimeSlots.length === 0) return null; // If even this fallback fails
  }

  return resultingTimeSlots.length > 0 ? resultingTimeSlots : null;
}

export { parseSchedule };
