import React, { Fragment } from 'react';

/**
 * Renders a table displaying course information, potentially grouped.
 * @param {object} props - Component props.
 * @param {import('../utils/parseRawData').Course[] | Array<{groupValue: string, courses: import('../utils/parseRawData').Course[]}>} props.courses - Array of courses or array of groups.
 * @param {string} props.groupingKey - The key used for grouping ('none', 'offeringDept', etc.).
 * @param {(courseId: string | number) => void} props.onDeleteCourse - Function to call when deleting a course.
 * @param {(courseId: string | number) => void} props.onToggleLock - Function to call when toggling the lock state of a course.
 * @param {Set<string | number>} props.conflictingLockedCourseIds - A Set containing the IDs of locked courses that have schedule conflicts.
 */
function CourseTable({ courses, groupingKey, onDeleteCourse, onToggleLock, conflictingLockedCourseIds }) {

  const isGrouped = groupingKey !== 'none' && Array.isArray(courses) && courses.length > 0 && courses[0].hasOwnProperty('groupValue');

  const numberOfColumns = 13;

  const getRowClasses = (course, index, isGroupedRow = false) => {
    const baseClasses = ['course-table-row'];
    if (isGroupedRow) {
      baseClasses.push(index % 2 === 0 ? 'even-row-grouped' : 'odd-row-grouped');
    } else {
      baseClasses.push(index % 2 === 0 ? 'even-row' : 'odd-row');
    }
    if (course.isLocked) {
      baseClasses.push('locked-row');
      if (conflictingLockedCourseIds && conflictingLockedCourseIds.has(course.id)) {
        baseClasses.push('conflict-highlight');
      }
    }
    return baseClasses.join(' ');
  };

  return (
    <table className="course-table">
      <thead className="course-table-header">
        <tr>
          <th className="header-cell">#</th>
          <th className="header-cell">Offering Dept.</th>
          <th className="header-cell">Subject</th>
          <th className="header-cell">Subject Title</th>
          <th className="header-cell">Credited Units</th>
          <th className="header-cell">Section</th>
          <th className="header-cell">Schedule</th>
          <th className="header-cell">Room</th>
          <th className="header-cell">Total Slots</th>
          <th className="header-cell">Enrolled</th>
          <th className="header-cell">Assessed</th>
          <th className="header-cell">Is Closed</th>
          <th className="header-cell actions-header">Actions</th>
        </tr>
      </thead>
      <tbody className="course-table-body">
        {(!courses || (Array.isArray(courses) && courses.length === 0)) && (
          <tr className="no-data-row">
            <td className="data-cell" colSpan={numberOfColumns}>No courses to display.</td>
          </tr>
        )}

        {isGrouped && courses.map((group, groupIndex) => (
          <Fragment key={`group-${group.groupValue}-${groupIndex}`}>
            <tr className="group-header-row">
              <td className="group-header-cell" colSpan={numberOfColumns}>
                {group.groupValue} ({group.courses.length} {group.courses.length === 1 ? 'course' : 'courses'})
              </td>
            </tr>
            {group.courses.map((course, courseIndex) => (
              <tr key={course.id} className={getRowClasses(course, courseIndex, true)}>
                <td className="data-cell">{course.id}</td>
                <td className="data-cell">{course.offeringDept}</td>
                <td className="data-cell">{course.subject}</td>
                <td className="data-cell">{course.subjectTitle}</td>
                <td className="data-cell">{course.creditedUnits}</td>
                <td className="data-cell">{course.section}</td>
                <td className="data-cell">{course.schedule}</td>
                <td className="data-cell">{course.room}</td>
                <td className="data-cell">{course.totalSlots}</td>
                <td className="data-cell">{course.enrolled}</td>
                <td className="data-cell">{course.assessed}</td>
                <td className="data-cell">{course.isClosed ? 'Yes' : 'No'}</td>
                <td className="data-cell actions-cell">
                  <button onClick={() => onToggleLock(course.id)} className={`lock-button ${course.isLocked ? 'locked' : 'unlocked'}`} title={course.isLocked ? 'Unlock Course' : 'Lock Course'} style={{ padding: '2px 5px', fontSize: '0.8em', cursor: 'pointer', minWidth: '50px' }}>
                    {course.isLocked ? 'Unlock' : 'Lock'}
                  </button>
                  <button onClick={() => onDeleteCourse(course.id)} className="delete-button" title="Delete Course" style={{ padding: '2px 5px', fontSize: '0.8em', cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </Fragment>
        ))}

        {!isGrouped && Array.isArray(courses) && courses.map((course, index) => (
          <tr key={course.id} className={getRowClasses(course, index, false)}>
            <td className="data-cell">{course.id}</td>
            <td className="data-cell">{course.offeringDept}</td>
            <td className="data-cell">{course.subject}</td>
            <td className="data-cell">{course.subjectTitle}</td>
            <td className="data-cell">{course.creditedUnits}</td>
            <td className="data-cell">{course.section}</td>
            <td className="data-cell">{course.schedule}</td>
            <td className="data-cell">{course.room}</td>
            <td className="data-cell">{course.totalSlots}</td>
            <td className="data-cell">{course.enrolled}</td>
            <td className="data-cell">{course.assessed}</td>
            <td className="data-cell">{course.isClosed ? 'Yes' : 'No'}</td>
            <td className="data-cell actions-cell" style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => onToggleLock(course.id)} className={`lock-button ${course.isLocked ? 'locked' : 'unlocked'}`} title={course.isLocked ? 'Unlock Course' : 'Lock Course'} style={{ padding: '2px 5px', fontSize: '0.8em', cursor: 'pointer', minWidth: '50px' }}>
                {course.isLocked ? 'Unlock' : 'Lock'}
              </button>
              <button onClick={() => onDeleteCourse(course.id)} className="delete-button" title="Delete Course" style={{ padding: '2px 5px', fontSize: '0.8em', cursor: 'pointer' }}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default CourseTable;