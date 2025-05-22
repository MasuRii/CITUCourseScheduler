import React from 'react';
import { parseSchedule } from '../utils/parseSchedule';

const TIME_SLOTS = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
    '22:00'
];

const DAYS = ['M', 'T', 'W', 'TH', 'F', 'S', 'SU'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Converts a 24-hour format time string to 12-hour format with AM/PM
 * @param {string} timeStr - Time string in "HH:MM" 24-hour format
 * @returns {string} - Time in 12-hour format (e.g. "1:30 PM")
 */
const formatTo12Hour = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

/**
 * Component to display a visual timetable for locked courses
 * 
 * @param {Object} props Component props
 * @param {Array} props.lockedCourses Array of locked course objects
 * @param {Set} props.conflictingLockedCourseIds Set of conflicting locked course IDs
 */
function TimetableView({ lockedCourses, conflictingLockedCourseIds = new Set() }) {
    if (!lockedCourses || lockedCourses.length === 0) {
        return <div className="timetable-empty">No locked courses to display in timetable.</div>;
    }

    const totalUnits = lockedCourses.reduce((sum, course) => {
        const units = parseFloat(course.creditedUnits || course.units);
        return isNaN(units) ? sum : sum + units;
    }, 0);

    const uniqueSubjects = new Set(lockedCourses.map(course => course.subject)).size;

    const coursesByTimeAndDay = {};

    lockedCourses.forEach(course => {
        const scheduleResult = parseSchedule(course.schedule);
        if (!scheduleResult || scheduleResult.isTBA || !scheduleResult.allTimeSlots || scheduleResult.allTimeSlots.length === 0) {
            return;
        }

        scheduleResult.allTimeSlots.forEach(slot => {
            const { days, startTime, endTime, room } = slot;
            if (!startTime || !endTime) return;

            days.forEach(day => {
                for (let i = 0; i < TIME_SLOTS.length; i++) {
                    const timeGridSlot = TIME_SLOTS[i];

                    if (timeGridSlot >= startTime && timeGridSlot < endTime) {
                        if (!coursesByTimeAndDay[timeGridSlot]) {
                            coursesByTimeAndDay[timeGridSlot] = {};
                        }
                        if (!coursesByTimeAndDay[timeGridSlot][day]) {
                            coursesByTimeAndDay[timeGridSlot][day] = [];
                        }

                        const isStartOfCourseSlot = timeGridSlot === startTime;

                        let courseAlreadyInCellForThisSlot = coursesByTimeAndDay[timeGridSlot][day].find(
                            c => c.id === course.id && c.slotStartTime === startTime
                        );

                        if (!courseAlreadyInCellForThisSlot) {
                            coursesByTimeAndDay[timeGridSlot][day].push({
                                ...course,
                                slotStartTime: startTime,
                                slotEndTime: endTime,
                                isStartOfCourseSlot: isStartOfCourseSlot,
                                slotRoom: room || course.room
                            });
                        }
                    }
                }
            });
        });
    });

    const renderCourseCell = (coursesInGridCell) => {
        if (!coursesInGridCell || coursesInGridCell.length === 0) return null;

        const startCourses = coursesInGridCell.filter(c => c.isStartOfCourseSlot);
        if (startCourses.length === 0) {
            return <div className="timetable-course-continuation"></div>;
        }

        return startCourses.map((course, index) => {
            const isConflicting = conflictingLockedCourseIds.has(course.id);
            return (
                <div
                    key={`${course.id}-${course.slotStartTime}-${index}`}
                    className={`timetable-course${isConflicting ? ' conflict-highlight' : ''}`}
                    tabIndex={0}
                    aria-label={`Locked course: ${course.subject} section ${course.section} in room ${course.slotRoom}, from ${course.slotStartTime} to ${course.slotEndTime}${isConflicting ? ' (conflict)' : ''}`}
                    style={isConflicting ? { borderLeft: '4px solid #a5283a', background: '#a5283a22' } : {}}
                >
                    <div className="timetable-course-subject">{course.subject}</div>
                    <div className="timetable-course-section">{course.section}</div>
                    <div className="timetable-course-room">{course.slotRoom}</div>
                    {isConflicting && (
                        <span title="Schedule conflict with another locked course" aria-label="Schedule conflict" style={{ color: '#a5283a', marginLeft: 4, fontSize: 16, verticalAlign: 'middle' }}>⚠️</span>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="timetable-container">
            <table
                className="timetable"
                role="table"
                aria-label="Weekly timetable of locked courses"
            >
                <caption className="visually-hidden">
                    Weekly timetable showing locked courses by day and time slot.
                </caption>
                <thead>
                    <tr role="row">
                        <th
                            className="time-header"
                            role="columnheader"
                            aria-label="Time"
                            scope="col"
                        >
                            Time
                        </th>
                        {DAYS.map((day, index) => (
                            <th
                                key={day}
                                className="day-header"
                                role="columnheader"
                                aria-label={DAY_NAMES[index]}
                                scope="col"
                            >
                                <div className="day-code">{day}</div>
                                <div className="day-name">{DAY_NAMES[index]}</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {TIME_SLOTS.map((timeSlot) => (
                        <tr key={timeSlot} className="time-row" role="row">
                            <td
                                className="time-cell"
                                role="rowheader"
                                aria-label={formatTo12Hour(timeSlot)}
                                scope="row"
                            >
                                {formatTo12Hour(timeSlot)}
                            </td>
                            {DAYS.map(day => (
                                <td
                                    key={`${day}-${timeSlot}`}
                                    className="day-cell"
                                    role="cell"
                                    tabIndex={0}
                                    aria-label={`Courses on ${DAY_NAMES[DAYS.indexOf(day)]} at ${formatTo12Hour(timeSlot)}`}
                                >
                                    {coursesByTimeAndDay[timeSlot]?.[day]
                                        ? renderCourseCell(coursesByTimeAndDay[timeSlot][day])
                                        : null}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="timetable-summary">
                <div className="timetable-totals">
                    <span><strong>Total Units:</strong> {totalUnits}</span>
                    <span><strong>Subjects:</strong> {uniqueSubjects}</span>
                    <span><strong>Courses:</strong> {lockedCourses.length}</span>
                </div>
            </div>
        </div>
    );
}

export default TimetableView; 