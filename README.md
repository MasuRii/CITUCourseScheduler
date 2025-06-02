<p align="center">
  <a href="https://github.com/MasuRii/CITUCourseBuilder">
    <img src="course-scheduler-web/src/assets/logo_icon_light.svg" alt="CITU Course Builder Logo" width="100" height="100">
  </a>
</p>

<h1 align="center">CITU Course Builder</h1>

<p align="center">
  <i>Plan, Filter, and Optimize Your Class Schedules with Ease!</i>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/MasuRii/CITUCourseBuilder)](https://github.com/MasuRii/CITUCourseBuilder/issues)
[![GitHub stars](https://img.shields.io/github/stars/MasuRii/CITUCourseBuilder)](https://github.com/MasuRii/CITUCourseBuilder/stargazers)

A modern web application designed to assist Cebu Institute of Technology - University (CIT-U) students in efficiently planning, filtering, and optimizing their academic class schedules. It simplifies the complex process of creating conflict-free timetables with advanced features like theme/palette management and robust export options.

<p align="center">
  <img src="course-scheduler-web/src/assets/CIT-U Course Builder_App.png" alt="CIT-U Course Builder Application Screenshot" width="700">
</p>
<!-- Note: The above screenshot is very tall (original dimensions 1920x5761). 
     For a better README viewing experience, you might consider:
     1. Creating a more focused screenshot or a series of smaller ones.
     2. Creating an animated GIF showcasing the application's features.
     3. Placing this image within a <details> tag to make it initially collapsed, e.g.:
        <details>
          <summary>Click to view Full Application Screenshot</summary>
          <details>
            <summary>Click to view Full Application Screenshot</summary>
            <p align="center">
              <img src="course-scheduler-web/src/assets/CIT-U Course Builder_App.png" alt="CIT-U Course Builder Application Screenshot" width="700">
            </p>
          </details>
        </details>
-->

---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [About The Project](#about-the-project)
- [Key Features](#key-features)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## About The Project

Navigating course enlistment and manually creating a feasible class schedule can be a time-consuming and frustrating experience for students. The CITU Course Builder aims to alleviate this by providing an intuitive, powerful, and responsive tool. Users can import their available courses, set various preferences and filters, and let the application generate optimal, conflict-free schedules. With local data persistence, students can pick up their planning where they left off. Recent enhancements include robust export functionalities for both course lists and timetable views.

---

## Key Features

*   **📚 Smart Data Import:**
    *   Paste tab-separated course data (e.g., from AIMS).
    *   Intelligent parser handles common schedule formats, including multi-line AIMS entries.
*   **📊 Dynamic Course Management:**
    *   View courses in a sortable, filterable table.
    *   Group by subject, department, or view all.
    *   Manage individual courses or clear all data.
*   **🔒 Course Prioritization (Locking):**
    *   Lock essential course sections.
    *   Immediate visual conflict highlighting for overlapping locked courses.
    *   Confirmation prompts for conflict-inducing locks.
*   **⚙️ Advanced Filtering:**
    *   Exclude courses by specific days or time ranges.
    *   Filter by section type (Online, Face-to-Face, Hybrid).
    *   Filter by course status (Open/Closed/All).
*   **🛠️ Customizable User Preferences:**
    *   Set maximum total units.
    *   Define maximum allowed break time between classes.
    *   Drag-and-drop preferred time of day order (Morning, Afternoon, Evening, Any).
    *   All preferences and filters are saved automatically to `localStorage`.
*   **🧠 Intelligent Schedule Generation:**
    *   Multiple search modes:
        *   **Recommended (Flexible, Best Fit):** Maximizes subjects and units.
        *   **Full Coverage (All Subjects, Strict):** Ensures all subjects fit.
        *   **Quick (Fast, May Miss Best):** Rapidly finds a viable schedule.
    *   Generated schedules respect all locked courses, filters, and preferences.
*   **🗓️ Clear Timetable Visualization:**
    *   View locked courses in a weekly timetable (7 AM - 10 PM).
    *   Responsive design adapts to various screen sizes.
    *   Toggle between full timetable and summary view.
*   **📤 Comprehensive Export Options:**
    *   **Course List:** Copy to clipboard or download as `.txt` (tab-separated format for re-import).
    *   **Timetable View:** Export as a PNG image or a PDF document.
*   **🎨 Modern & Responsive UI/UX:**
    *   Light and Dark mode themes with instant switching and automatic palette pairing
    *   'Original' and 'Comfort' color palettes with improved text contrast and element visibility
    *   Palette persistence between sessions for consistent theming
    *   Built with accessibility and mobile-friendliness in mind

---

## Built With

This project leverages a modern frontend stack:

*   [React](https://reactjs.org/) - A JavaScript library for building user interfaces.
*   [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling.
*   [Material-UI (MUI)](https://mui.com/) - React UI framework for faster and easier web development.
*   [React Toastify](https://fkhadra.github.io/react-toastify/) - For notifications.
*   [React Datepicker](https://reactdatepicker.com/) - For time selection.
*   [html-to-image](https://github.com/bubkoo/html-to-image) - For capturing HTML to image (PNG export).
*   [jsPDF](https://github.com/parallax/jsPDF) - For generating PDFs (Timetable PDF export).
*   CSS with CSS Variables - For theming and styling.
*   Browser `localStorage` - For client-side data persistence.

---

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure you have Node.js and npm (or yarn) installed on your system.
*   Node.js (v14+ recommended)
*   npm
    ```sh
    npm install npm@latest -g
    ```
    or yarn
    ```sh
    npm install --global yarn
    ```

### Installation

1.  Clone the repo:
    ```bash
    git clone https://github.com/MasuRii/CITUCourseBuilder.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd CITUCourseBuilder/course-scheduler-web
    ```
3.  Install NPM packages:
    ```bash
    npm install
    ```
    or if using yarn:
    ```bash
    yarn install
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```
    or if using yarn:
    ```bash
    yarn dev
    ```
The application will typically be available at `http://localhost:12000`.

---

## Usage

Once the application is running:

1.  **Import Data:** Navigate to your institution's portal (e.g., AIMS for CIT-U students), copy the table of available courses. Paste this tab-separated data into the "Raw Data Input" text area in the CITU Course Builder and click "Import Data."
2.  **Manage Courses:** View your imported courses in the table. You can sort, group, and delete courses.
3.  **Set Preferences & Filters:** Configure your maximum units, preferred class gap, preferred time of day, and apply filters like day/time exclusions, section types, or course status.
4.  **Lock Courses:** Lock any specific course sections you absolutely need in your schedule. Conflicts with other locked courses will be highlighted.
5.  **Generate Schedule:** Choose a schedule generation mode ("Recommended," "Full Coverage," or "Quick") and click "Generate Best Schedule." The application will attempt to find an optimal, conflict-free schedule based on your settings.
6.  **View Timetable:** Locked courses (either manually locked or from a generated schedule) will appear in the weekly timetable.
7.  **Export:** Use the hamburger menus in the course list and timetable sections to:
    * Export course data as `.txt` or to clipboard (tab-separated format for re-import)
    * Export timetable view as high-fidelity PNG or PDF files
8.  **Customize Theme:** Switch between Light/Dark modes and choose between 'Original'/'Comfort' color palettes. The system remembers your palette choices between sessions.

All your settings, imported courses, and locked courses are automatically saved in your browser's local storage, so you can close the tab and resume later.

---

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

Please make sure to update tests as appropriate.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
