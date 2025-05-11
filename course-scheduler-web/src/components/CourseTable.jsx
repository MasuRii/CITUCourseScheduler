import React, { Fragment } from 'react';

/**
 * Renders a table displaying course information, potentially grouped.
 * @param {object} props - Component props.
 * @param {import('../utils/parseRawData').Course[] | Array<{groupValue: string, courses: import('../utils/parseRawData').Course[]}>} props.courses - Array of courses or array of groups.
 * @param {string} props.groupingKey - The key used for grouping ('none', 'offeringDept', etc.).
 * @param {(courseId: string | number) => void} props.onDeleteCourse - Function to call when deleting a course.
 * @param {(courseId: string | number) => void} props.onToggleLockCourse - Function to call when toggling the lock state of a course.
 * @param {Set<string | number>} props.conflictingLockedCourseIds - A Set containing the IDs of locked courses that have schedule conflicts.
 */
function CourseTable({ courses, groupingKey, onDeleteCourse, onToggleLockCourse, conflictingLockedCourseIds }) {
  const isGrouped = groupingKey !== 'none' && Array.isArray(courses) && courses.length > 0 &&
    Object.prototype.hasOwnProperty.call(courses[0], 'groupValue');

  const getRowClasses = (course, index, isGroupedRow = false) => {
    const baseClasses = ['course-table-row'];
    if (isGroupedRow) {
      baseClasses.push(index % 2 === 0 ? 'even-row' : 'odd-row');
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
    <div className="table-container">
      <table className="course-table">
        <thead className="course-table-header">
          <tr>
            <th className="header-cell">Subject</th>
            <th className="header-cell">Title</th>
            <th className="header-cell">Units</th>
            <th className="header-cell">Section</th>
            <th className="header-cell">Schedule</th>
            <th className="header-cell">Room</th>
            <th className="header-cell">Status</th>
            <th className="header-cell actions-header">Actions</th>
          </tr>
        </thead>
        <tbody className="course-table-body">
          {(!courses || (Array.isArray(courses) && courses.length === 0)) && (
            <tr key="no-data" className="no-data-row">
              <td className="data-cell" colSpan={8}>No courses to display.</td>
            </tr>
          )}

          {isGrouped && courses.map((group, groupIndex) => (
            <Fragment key={`group-${group.groupValue}-${groupIndex}`}>
              <tr key={`header-${group.groupValue}-${groupIndex}`} className="group-header-row">
                <td className="group-header-cell" colSpan={8}>
                  {group.groupValue} ({group.courses?.length || 0} {(!group.courses || group.courses.length === 1) ? 'course' : 'courses'})
                </td>
              </tr>
              {group.courses?.map((course, courseIndex) => (
                <tr key={`course-${course.id}-${courseIndex}`} className={getRowClasses(course, courseIndex, true)}>
                  <td className="data-cell">{course.subject}</td>
                  <td className="data-cell">{course.subjectTitle}</td>
                  <td className="data-cell">{course.creditedUnits || course.units}</td>
                  <td className="data-cell">{course.section}</td>
                  <td className="data-cell">{course.schedule}</td>
                  <td className="data-cell">{course.room}</td>
                  <td className="data-cell">
                    {course.isClosed ?
                      <span className="status-badge closed">Closed</span> :
                      <span className="status-badge open">Open</span>}
                  </td>
                  <td className="data-cell actions-cell">
                    <button
                      onClick={() => onToggleLockCourse(course.id)}
                      className={`lock-button ${course.isLocked ? 'locked' : 'unlocked'}`}
                      title={course.isLocked ? 'Unlock Course' : 'Lock Course'}
                    >
                      {course.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                    <button
                      onClick={() => onDeleteCourse(course.id)}
                      className="delete-button"
                      title="Delete Course"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}

          {!isGrouped && Array.isArray(courses) && courses.map((course, index) => (
            <tr key={`course-${course.id}-${index}`} className={getRowClasses(course, index, false)}>
              <td className="data-cell">{course.subject}</td>
              <td className="data-cell">{course.subjectTitle}</td>
              <td className="data-cell">{course.creditedUnits || course.units}</td>
              <td className="data-cell">{course.section}</td>
              <td className="data-cell">{course.schedule}</td>
              <td className="data-cell">{course.room}</td>
              <td className="data-cell">
                {course.isClosed ?
                  <span className="status-badge closed">Closed</span> :
                  <span className="status-badge open">Open</span>}
              </td>
              <td className="data-cell actions-cell">
                <button
                  onClick={() => onToggleLockCourse(course.id)}
                  className={`lock-button ${course.isLocked ? 'locked' : 'unlocked'}`}
                  title={course.isLocked ? 'Unlock Course' : 'Lock Course'}
                >
                  {course.isLocked ? 'Unlock' : 'Lock'}
                </button>
                <button
                  onClick={() => onDeleteCourse(course.id)}
                  className="delete-button"
                  title="Delete Course"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CourseTable;