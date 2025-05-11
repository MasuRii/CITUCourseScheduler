/**
 * @typedef {object} Course
 * @property {string | number} id - Unique identifier from '#' column
 * @property {string} offeringDept
 * @property {string} subject
 * @property {string} subjectTitle
 * @property {number} creditedUnits
 * @property {string} section
 * @property {string} schedule - Raw schedule string
 * @property {string} room
 * @property {number} totalSlots
 * @property {number} enrolled
 * @property {number} assessed
 * @property {boolean} isClosed
 * @property {boolean} isLocked - Added for Task 5.11
 */

/**
 * Parses raw tab-separated course data into an array of Course objects.
 * Handles data where course info might be on a single line (12 columns)
 * or split across two lines (7 columns followed by 5 or 6 columns).
 * @param {string} rawText - The raw string data pasted by the user.
 * @returns {Course[]} An array of parsed course objects.
 */
export const parseRawCourseData = (rawText) => {
    if (!rawText || typeof rawText !== 'string') {
        return [];
    }

    const lines = rawText.trim().split('\n');
    const courses = [];
    const expectedColumnsSingleLine = 12;
    const expectedColumnsPart1 = 7;

    let i = 0;
    while (i < lines.length) {
        const line1 = lines[i]?.trim();
        i++;

        if (!line1) {
            continue;
        }

        const columns1 = line1.split('\t');
        let courseDataColumns = [];

        try {
            if (columns1.length === expectedColumnsSingleLine) {
                courseDataColumns = columns1;
            }
            else if (columns1.length === expectedColumnsPart1) {
                if (i < lines.length) {
                    const line2 = lines[i]?.trim();
                    if (line2) {
                        const columns2 = line2.split('\t');
                        // Accept either 5 or 6 columns for the second line (some lab sections have 6 columns)
                        if (columns2.length >= 5 && columns2.length <= 6) {
                            // If it's 6 columns, we need to extract the room from the schedule part
                            if (columns2.length === 6) {
                                // Create a combined schedule line
                                const combinedSchedule = `${columns1[6]} + ${columns2[0]}`;

                                // First 6 columns from line 1 (excluding schedule)
                                const firstPart = columns1.slice(0, 6);

                                // Modified columns from line 2 (using columns2[1] as room)
                                const secondPart = [
                                    combinedSchedule, // Combined schedule string
                                    columns2[1],     // Room
                                    columns2[2],     // Total slots
                                    columns2[3],     // Enrolled
                                    columns2[4]      // Assessed
                                ];

                                // If there's a 6th column (closed status), add it
                                if (columns2[5]) {
                                    secondPart.push(columns2[5]);
                                } else {
                                    secondPart.push('No'); // Default to 'No' if not provided
                                }

                                courseDataColumns = [...firstPart, ...secondPart];
                            } else {
                                courseDataColumns = [...columns1, ...columns2];
                            }
                            i++;
                        } else {
                            console.warn(`Skipping line ${i}: Found 7 columns, but the next line did not have the expected columns format. Line 1 content: "${line1}", Line 2 content: "${line2}"`);
                            continue;
                        }
                    } else {
                        console.warn(`Skipping line ${i}: Found 7 columns, but the next line was missing or empty. Line 1 content: "${line1}"`);
                        continue;
                    }
                } else {
                    console.warn(`Skipping line ${i}: Found 7 columns, but it was the last line in the input. Line 1 content: "${line1}"`);
                    continue;
                }
            }
            else {
                console.warn(`Skipping line ${i}: Expected ${expectedColumnsSingleLine} or ${expectedColumnsPart1} columns, but found ${columns1.length}. Line content: "${line1}"`);
                continue;
            }

            if (courseDataColumns.length >= expectedColumnsSingleLine) {
                const course = {
                    id: courseDataColumns[0].trim() || `generated-${Date.now()}-${i}`,
                    offeringDept: courseDataColumns[1].trim(),
                    subject: courseDataColumns[2].trim(),
                    subjectTitle: courseDataColumns[3].trim(),
                    creditedUnits: parseInt(courseDataColumns[4].trim(), 10) || 0,
                    section: courseDataColumns[5].trim(),
                    schedule: courseDataColumns[6].trim(),
                    room: courseDataColumns[7].trim(),
                    totalSlots: parseInt(courseDataColumns[8].trim(), 10) || 0,
                    enrolled: parseInt(courseDataColumns[9].trim(), 10) || 0,
                    assessed: parseInt(courseDataColumns[10].trim(), 10) || 0,
                    isClosed: courseDataColumns[11]?.trim().toLowerCase() === 'yes',
                    isLocked: false,
                };

                if (!course.subject || !course.schedule) {
                    console.warn(`Skipping entry starting around line ${i}: Missing essential data (Subject or Schedule). Combined data: "${courseDataColumns.join('\t')}"`);
                    continue;
                }

                courses.push(course);
            }

        } catch (error) {
            console.error(`Error processing entry starting around line ${i}: "${line1}"`, error);
        }
    }

    return courses;
};