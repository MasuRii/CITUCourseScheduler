import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Fragment, useState } from 'react';
import { toast } from 'react-toastify';
import { convertCoursesToRawData } from '../utils/convertToRawData';

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

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCopyToClipboard = () => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }

      const allCourses = isGrouped
        ? courses.flatMap(group => group.courses)
        : courses;

      const rawData = convertCoursesToRawData(allCourses);

      if (!rawData) {
        toast.warning('No course data to copy');
        return;
      }

      navigator.clipboard.writeText(rawData)
        .then(() => {
          toast.success('Course data copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          toast.error('Failed to copy course data');
        });
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      toast.error('Failed to copy course data');
    } finally {
      handleMenuClose();
    }
  };

  const handleDownloadAsText = () => {
    try {
      const allCourses = isGrouped
        ? courses.flatMap(group => group.courses)
        : courses;

      const rawData = convertCoursesToRawData(allCourses);

      if (!rawData) {
        toast.warning('No course data to download');
        return;
      }

      const blob = new Blob([rawData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'course_list_export.txt';
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success('Downloading course_list_export.txt...');
    } catch (err) {
      console.error('Error downloading course data:', err);
      toast.error('Failed to download course data');
    } finally {
      handleMenuClose();
    }
  };

  return (
    <div className="table-container">
      <div className="table-controls">
        <IconButton
          aria-label="export menu"
          aria-controls="export-menu"
          aria-haspopup="true"
          onClick={handleMenuClick}
          color="inherit"
        >
          <MenuIcon />
        </IconButton>
        <Menu
          id="export-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleCopyToClipboard}>Copy Raw Data to Clipboard</MenuItem>
          <MenuItem onClick={handleDownloadAsText}>Download Raw Data as .txt</MenuItem>
        </Menu>
      </div>
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
                      onClick={() => onToggleLockCourse({ id: course.id, subject: course.subject, section: course.section })}
                      className={`lock-button ${course.isLocked ? 'locked' : 'unlocked'}`}
                      title={course.isLocked ? 'Unlock Course' : 'Lock Course'}
                    >
                      {course.isLocked && conflictingLockedCourseIds && conflictingLockedCourseIds.has(course.id) && (
                        <span className="conflict-icon" title="Schedule conflict with another locked course" aria-label="Schedule conflict">⚠️</span>
                      )}
                      {course.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                    <button
                      onClick={() => onDeleteCourse({ id: course.id, subject: course.subject, section: course.section })}
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
                  onClick={() => onToggleLockCourse({ id: course.id, subject: course.subject, section: course.section })}
                  className={`lock-button ${course.isLocked ? 'locked' : 'unlocked'}`}
                  title={course.isLocked ? 'Unlock Course' : 'Lock Course'}
                >
                  {course.isLocked && conflictingLockedCourseIds && conflictingLockedCourseIds.has(course.id) && (
                    <span className="conflict-icon" title="Schedule conflict with another locked course" aria-label="Schedule conflict">⚠️</span>
                  )}
                  {course.isLocked ? 'Unlock' : 'Lock'}
                </button>
                <button
                  onClick={() => onDeleteCourse({ id: course.id, subject: course.subject, section: course.section })}
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