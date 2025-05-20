# CITU Course Scheduler

A modern web application to help CIT-U students (and others) plan, filter, and optimize their class schedules.

---

## Features

- **Import Course Data:**  
  Paste tab-separated schedule data (e.g., from AIMS) to quickly load your available courses.

- **Course Table & Grouping:**  
  View all courses in a sortable, filterable table. Group by subject, department, or view all together.

- **Lock/Unlock Courses:**  
  Lock specific course sections to ensure they are included in your generated schedule.

- **Advanced Filters:**  
  - Exclude courses by day (e.g., no classes on Fridays)
  - Exclude by time range (e.g., no classes after 6pm)
  - Filter by section type (Online, Face-to-Face, Hybrid)
  - Filter by open/closed status

- **User Preferences:**  
  - Set maximum total units
  - Set maximum allowed gap between classes
  - Drag-and-drop to set your preferred time of day order (morning, afternoon, evening, any)

- **Schedule Generation:**  
  - **Fast Mode:** Quickly finds a good, conflict-free schedule
  - **Exhaustive Mode:** Finds the best possible schedule (may be slower for large lists)
  - Schedules are generated based on your locked courses and preferences

- **Timetable Visualization:**  
  See your locked courses in a clear, color-coded weekly timetable.

- **Persistent Settings:**  
  All your data and preferences are saved in your browser (localStorage).

- **Modern, Responsive UI:**  
  - Light and dark mode
  - Mobile-friendly
  - Accessible and keyboard-friendly

---

## Usage Guide

### 1. Copy Data from AIMS

Go to the AIMS portal and copy the table data for your courses.

![Guide to copying data from AIMS](./course-scheduler-web/src/assets/Guide1.PNG)

### 2. Paste Data into CITU Course Scheduler

Paste the copied data into the "Import Data" section and click **Import Data**.

![Guide to pasting data into CITUCourseBuilder](./course-scheduler-web/src/assets/Guide2.PNG)

### 3. Filter, Group, and Lock Courses

- Use the filters and grouping options to narrow down your course list.
- Lock any courses you must have in your schedule.

### 4. Set Preferences

- Set your maximum units, preferred time of day, and other preferences in the User Preferences section.

### 5. Generate Your Schedule

- Click **Generate Best Schedule** to let the app find the optimal, conflict-free schedule for you.
- View your locked courses in the Timetable View.

---

## Development

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Install & Run

```bash
cd course-scheduler-web
npm install
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## License

MIT

---

## Acknowledgments

- Built as a student project for CIT-U.
- Inspired by the need for better, more flexible course scheduling tools.

---

## Feedback & Contributions

Feedback, bug reports, and contributions are welcome! Please open an issue or pull request on GitHub.
