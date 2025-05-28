/**
 * Converts an array of course objects back to the original tab-separated raw format
 * @param {import('./parseRawData').Course[]} courses - Array of course objects
 * @returns {string} Tab-separated string matching the original import format
 */
export const convertCoursesToRawData = (courses) => {
  if (!Array.isArray(courses) || courses.length === 0) {
    return '';
  }

  return courses.map(course => {
    const fields = [
      course.id || '',
      course.offeringDept || '',
      course.subject || '',
      course.subjectTitle || '',
      course.creditedUnits?.toString() || '0',
      course.section || '',
      course.schedule || '',
      course.room || '',
      course.totalSlots?.toString() || '0',
      course.enrolled?.toString() || '0',
      course.assessed?.toString() || '0',
      course.isClosed ? 'yes' : 'no'
    ];
    
    return fields.join('\t');
  }).join('\n');
};