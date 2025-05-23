# CITU Course Builder

A modern web application to help CIT-U students (and others) plan, filter, and optimize their class schedules.

---

## Features

- **Import Course Data:**
  - Paste tab-separated schedule data (e.g., from AIMS) to quickly load your available courses.
  - Smart parser for common schedule formats.

- **Course Table & Grouping:**
  - View all courses in a sortable, filterable table.
  - Group by subject, department, or view all together.
  - Delete individual courses or clear all.

- **Lock/Unlock Courses:**
  - Lock specific course sections to ensure they are included in your generated schedule.
  - Visual conflict highlighting for locked courses with overlapping times.
  - Clear all locks with a single click.

- **Advanced Filters:**
  - Exclude courses by day (e.g., no classes on Fridays)
  - Exclude by time range (e.g., no classes after 6pm)
  - Filter by section type (Online, Face-to-Face, Hybrid)
  - Filter by open/closed status

- **User Preferences:**
  - Set maximum total units
  - Set maximum allowed gap between classes
  - Drag-and-drop to set your preferred time of day order (morning, afternoon, evening, any)
  - All preferences are saved automatically

- **Schedule Generation:**
  - **Recommended (Flexible, Best Fit):** Maximizes the number of subjects and units, even if not all subjects fit
  - **Full Coverage (All Subjects, Strict):** Only generates a schedule if all subjects can fit within your constraints
  - **Quick (Fast, May Miss Best):** Finds a schedule quickly, but may not be the best possible combination
  - Schedules are generated based on your locked courses and preferences

- **Timetable Visualization:**
  - See your locked courses in a clear, color-coded weekly timetable
  - Toggle between summary and full timetable view

- **Persistent Settings:**
  - All your data and preferences are saved in your browser (localStorage)

- **Modern, Responsive UI/UX:**
  - Light and dark mode with instant switching
  - Mobile-friendly and accessible

---

## Development

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Install & Run

```bash
cd course-scheduler-web
npm install
npm run dev
```

The app will be available at [http://localhost:12000](http://localhost:12000).

---

## Feedback & Contributions

Feedback, bug reports, and contributions are welcome! Please open an issue or pull request on GitHub.
