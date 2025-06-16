import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { Fragment, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import '../App.css';
import { convertCoursesToRawData } from '../utils/convertToRawData';

function CourseTable({
  courses,
  allCoursesCount,
  groupingKey,
  onGroupingChange,
  selectedStatusFilter,
  onStatusFilterChange,
  onDeleteCourse,
  onToggleLockCourse,
  conflictingLockedCourseIds,
  onClearAllLocks,
  onDeleteAllCourses,
  totalUnitsDisplay,
  uniqueSubjectsDisplay,
  lockedCoursesCountDisplay,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

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

  const handleCopyToClipboard = () => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }
      const allCoursesToExport = isGrouped
        ? courses.flatMap(group => group.courses)
        : courses;
      const rawData = convertCoursesToRawData(allCoursesToExport);
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
      const allCoursesToExport = isGrouped
        ? courses.flatMap(group => group.courses)
        : courses;
      const rawData = convertCoursesToRawData(allCoursesToExport);
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

  const displayedCount = useMemo(() => {
    if (!Array.isArray(courses)) return 0;
    if (groupingKey === 'none') {
      return courses.length;
    }
    return courses.reduce((sum, group) => {
      return sum + (group && group.courses ? group.courses.length : 0);
    }, 0);
  }, [courses, groupingKey]);

  return (
    <div className="section-container">
      <div className="table-header-controls">
        <h2>Course List</h2>
        <div className="grouping-controls">
          <label>Group by:</label>
          <select value={groupingKey} onChange={onGroupingChange}>
            <option value="none">None</option>
            <option value="subject">Subject</option>
            <option value="offeringDept">Department</option>
          </select>
        </div>
        <div className="status-filter-controls" style={{ marginLeft: 16 }}>
          <span style={{ fontSize: "0.95em", color: "#888", marginRight: 8 }}>Filter:</span>
          <button
            className={`status-filter-button ${selectedStatusFilter === "all" ? "selected" : ""}`}
            onClick={() => onStatusFilterChange("all")}>
            All Courses
          </button>
          <button
            className={`status-filter-button ${selectedStatusFilter === "open" ? "selected" : ""}`}
            onClick={() => onStatusFilterChange("open")}>
            Open Only
          </button>
          <button
            className={`status-filter-button ${
              selectedStatusFilter === "closed" ? "selected" : ""
            }`}
            onClick={() => onStatusFilterChange("closed")}>
            Closed Only
          </button>
          <Tooltip
            title="This filter affects the courses shown below and those available for schedule generation."
            arrow
            placement="top">
            <InfoOutlinedIcon
              style={{
                color: "#1976d2",
                marginLeft: 6,
                fontSize: 18,
                verticalAlign: "middle",
                cursor: "pointer",
              }}
            />
          </Tooltip>
        </div>
        {totalUnitsDisplay > 0 && (
          <div className="total-units-display">
            {totalUnitsDisplay} units ({uniqueSubjectsDisplay} subjects) -{" "}
            {lockedCoursesCountDisplay} courses
          </div>
        )}
        <div className="table-controls">
          <IconButton
            aria-label="export menu"
            aria-controls="export-menu"
            aria-haspopup="true"
            onClick={handleMenuClick}
            color="inherit">
            <MenuIcon />
          </IconButton>
          <Menu id="export-menu" anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            <MenuItem onClick={handleCopyToClipboard}>Copy Raw Data to Clipboard</MenuItem>
            <MenuItem onClick={handleDownloadAsText}>Download Raw Data as .txt</MenuItem>
          </Menu>
        </div>
      </div>

      {conflictingLockedCourseIds && conflictingLockedCourseIds.size > 0 && (
        <div className="conflict-helper-text">
          Note: Courses highlighted with a red border have schedule conflicts with other locked
          courses.
        </div>
      )}

      <div className="course-table-scroll-wrapper">
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
                <td className="data-cell" colSpan={8}>
                  No courses to display.
                </td>
              </tr>
            )}
            {isGrouped &&
              courses.map((group, groupIndex) => (
                <Fragment key={`group-${group.groupValue}-${groupIndex}`}>
                  <tr key={`header-${group.groupValue}-${groupIndex}`} className="group-header-row">
                    <td className="group-header-cell" colSpan={8}>
                      {group.groupValue} ({group.courses?.length || 0}{" "}
                      {!group.courses || group.courses.length === 1 ? "course" : "courses"})
                    </td>
                  </tr>
                  {group.courses?.map((course, courseIndex) => (
                    <tr
                      key={`course-${course.id}-${courseIndex}`}
                      className={getRowClasses(course, courseIndex, true)}>
                      <td className="data-cell">{course.subject}</td>
                      <td className="data-cell">{course.subjectTitle}</td>
                      <td className="data-cell">{course.creditedUnits || course.units}</td>
                      <td className="data-cell">{course.section}</td>
                      <td className="data-cell">{course.schedule}</td>
                      <td className="data-cell">{course.room}</td>
                      <td className="data-cell">
                        {course.isClosed ? (
                          <span className="status-badge closed">Closed</span>
                        ) : course.availableSlots <= 0 ? (
                          <span className="status-badge warning">
                            Slots full: {course.availableSlots}/{course.totalSlots}
                          </span>
                        ) : (
                          <span className="status-badge open">
                            Available: {course.availableSlots}/{course.totalSlots}
                          </span>
                        )}
                      </td>

                      <td className="data-cell actions-cell">
                        <button
                          onClick={() =>
                            onToggleLockCourse({
                              id: course.id,
                              subject: course.subject,
                              section: course.section,
                            })
                          }
                          className={`lock-button ${course.isLocked ? "locked" : "unlocked"}`}
                          title={
                            course.availableSlots <= 0
                              ? "Cannot lock - no available slots"
                              : course.isLocked
                              ? "Unlock Course"
                              : "Lock Course"
                          }
                          disabled={course.availableSlots <= 0}>
                          {course.isLocked &&
                            conflictingLockedCourseIds &&
                            conflictingLockedCourseIds.has(course.id) && (
                              <span
                                className="conflict-icon"
                                title="Schedule conflict with another locked course"
                                aria-label="Schedule conflict">
                                ⚠️
                              </span>
                            )}
                          {course.isLocked ? "Unlock" : "Lock"}
                        </button>

                        <button
                          onClick={() =>
                            onDeleteCourse({
                              id: course.id,
                              subject: course.subject,
                              section: course.section,
                            })
                          }
                          className="delete-button"
                          title="Delete Course">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            {!isGrouped &&
              Array.isArray(courses) &&
              courses.map((course, index) => (
                <tr
                  key={`course-${course.id}-${index}`}
                  className={getRowClasses(course, index, false)}>
                  <td className="data-cell">{course.subject}</td>
                  <td className="data-cell">{course.subjectTitle}</td>
                  <td className="data-cell">{course.creditedUnits || course.units}</td>
                  <td className="data-cell">{course.section}</td>
                  <td className="data-cell">{course.schedule}</td>
                  <td className="data-cell">{course.room}</td>
                  <td className="data-cell">
                    {course.isClosed ? (
                      <span className="status-badge closed">Closed</span>
                    ) : course.availableSlots <= 0 ? (
                      <span className="status-badge warning">
                        Slots full: {course.availableSlots}/{course.totalSlots}
                      </span>
                    ) : (
                      <span className="status-badge open">
                        Available: {course.availableSlots}/{course.totalSlots}
                      </span>
                    )}
                  </td>
                  <td className="data-cell actions-cell">
                    <button
                      onClick={() =>
                        onToggleLockCourse({
                          id: course.id,
                          subject: course.subject,
                          section: course.section,
                        })
                      }
                      className={`lock-button ${course.isLocked ? "locked" : "unlocked"}`}
                      title={
                        course.availableSlots <= 0
                          ? "Cannot lock - no slots available"
                          : course.isLocked
                          ? "Unlock Course"
                          : "Lock Course"
                      }
                      disabled={course.availableSlots <= 0}>
                      {course.isLocked &&
                        conflictingLockedCourseIds &&
                        conflictingLockedCourseIds.has(course.id) && (
                          <span
                            className="conflict-icon"
                            title="Schedule conflict with another locked course"
                            aria-label="Schedule conflict">
                            ⚠️
                          </span>
                        )}
                      {course.isLocked ? "Unlock" : "Lock"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="table-action-controls">
        <button onClick={onClearAllLocks}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Clear All Locks
        </button>
        <button className="danger-button" onClick={onDeleteAllCourses}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
          </svg>
          Delete All Courses
        </button>
      </div>
      <div>
        <span>Showing {displayedCount} courses</span>
        {displayedCount !== allCoursesCount && (
          <span> (filtered from {allCoursesCount} total)</span>
        )}
      </div>
    </div>
  );
}

export default CourseTable;