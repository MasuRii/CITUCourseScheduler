// File: src/data/courses.js

/**
 * Represents a single course offering.
 * @typedef {object} Course
 * @property {number | string} id - Unique identifier or index for the course row.
 * @property {string} offeringDept - The department offering the course.
 * @property {string} subject - The subject code (e.g., 'CS 101').
 * @property {string} subjectTitle - The full title of the subject (e.g., 'Introduction to Computer Science').
 * @property {number} creditedUnits - Number of units the course is worth.
 * @property {string} section - The specific section identifier (e.g., 'A', 'S17').
 * @property {string} schedule - The raw schedule string (e.g., "TTH | 9:00AM-10:30AM | CLASRM 101").
 * @property {string} room - The assigned room (can be parsed from schedule if preferred).
 * @property {number} totalSlots - Total available slots.
 * @property {number} enrolled - Number of students currently enrolled.
 * @property {number} assessed - Number of students assessed (if different from enrolled).
 * @property {boolean} isClosed - Indicates if the section is closed for enrollment.
 */

/** @type {Course[]} */
const mockCourses = [
    {
      id: 1,
      offeringDept: 'ICS',
      subject: 'CMSC 11',
      subjectTitle: 'Introduction to Computer Science',
      creditedUnits: 3,
      section: 'A',
      schedule: 'TTH | 9:00AM-10:30AM | CLASRM 101',
      room: 'CLASRM 101',
      totalSlots: 40,
      enrolled: 38,
      assessed: 38,
      isClosed: false,
    },
    {
      id: 2,
      offeringDept: 'ICS',
      subject: 'CMSC 123',
      subjectTitle: 'Data Structures',
      creditedUnits: 3,
      section: 'B',
      schedule: 'WF | 1:00PM-2:30PM | CLASRM 102',
      room: 'CLASRM 102',
      totalSlots: 30,
      enrolled: 30,
      assessed: 30,
      isClosed: true,
    },
    {
      id: 3,
      offeringDept: 'MATH',
      subject: 'MATH 21',
      subjectTitle: 'Elementary Analysis I',
      creditedUnits: 3,
      section: 'S17',
      schedule: 'MWF | 10:00AM-11:00AM | MATH BLDG 205',
      room: 'MATH BLDG 205',
      totalSlots: 50,
      enrolled: 45,
      assessed: 45,
      isClosed: false,
    },
    // Add more course objects here based on your actual data
  ];
  
  export default mockCourses;