import React from 'react';
import DatePicker from 'react-datepicker';

import 'react-datepicker/dist/react-datepicker.css';

const availableDays = ['M', 'T', 'W', 'TH', 'F', 'S'];
const availableSectionTypes = [
  { id: 'AP3', label: 'Online (AP3)' },
  { id: 'AP4', label: 'Face-to-Face (AP4)' },
  { id: 'AP5', label: 'Hybrid (AP5)' },
];
const statusFilterOptions = [
  { value: 'all', label: 'Show All' },
  { value: 'open', label: 'Open Only' },
  { value: 'closed', label: 'Closed Only' },
];


/**
 * @typedef {object} TimeRange
 * @property {number|string} id - Unique identifier for the range.
 * @property {string} start - Start time in HH:mm format (internal state).
 * @property {string} end - End time in HH:mm format (internal state).
 */


const timeStringToDate = (timeString) => {
  if (!timeString || typeof timeString !== 'string' || !timeString.includes(':')) {
    return null;
  }
  try {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return date;
  } catch (e) {
    console.error("Error converting time string to Date:", e);
    return null;
  }
};

const dateToTimeString = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const createTimeDate = (hours, minutes) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const minSelectableTime = createTimeDate(7, 30);
const maxSelectableTime = createTimeDate(21, 0);


/**
 * Component for selecting various filters.
 */
function TimeFilter({
  excludedDays,
  onDayChange,
  excludedTimeRanges,
  onTimeRangeChange,
  onAddTimeRange,
  onRemoveTimeRange,
  selectedSectionTypes,
  onSectionTypeChange,
  selectedStatusFilter,
  onStatusFilterChange,
}) {

  const ranges = Array.isArray(excludedTimeRanges) ? excludedTimeRanges : [];
  const currentSelectedTypes = Array.isArray(selectedSectionTypes) ? selectedSectionTypes : [];

  const handleTimeChange = (id, field, date) => {
    const timeString = dateToTimeString(date);
    onTimeRangeChange(id, field, timeString);
  };

  return (
    <div className="time-filter">
      <div className="filter-section">
        <label className="filter-label">Exclude Days:</label>
        <div className="day-checkboxes">
          {availableDays.map((day) => (
            <label key={day} className="day-label">
              <input
                type="checkbox"
                checked={excludedDays.includes(day)}
                onChange={(e) => onDayChange(day, e.target.checked)}
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">Exclude Time Ranges:</label>
        {ranges.map((range, index) => (
          <div key={range.id} className="time-range-row">
            <span className="time-range-index">Range {index + 1}:</span>
            <div className="time-picker-wrapper">
              <label className="time-input-label">
                From:
                <DatePicker
                  selected={timeStringToDate(range.start)}
                  onChange={(date) => handleTimeChange(range.id, 'start', date)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={30}
                  minTime={minSelectableTime}
                  maxTime={maxSelectableTime}
                  timeCaption="Time"
                  dateFormat="h:mm aa"
                  className="time-input react-datepicker-input"
                  placeholderText="Start time"
                  autoComplete="off"
                />
              </label>
            </div>
            <div className="time-picker-wrapper">
              <label className="time-input-label">
                To:
                <DatePicker
                  selected={timeStringToDate(range.end)}
                  onChange={(date) => handleTimeChange(range.id, 'end', date)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={30}
                  minTime={minSelectableTime}
                  maxTime={maxSelectableTime}
                  timeCaption="Time"
                  dateFormat="h:mm aa"
                  className="time-input react-datepicker-input"
                  placeholderText="End time"
                  autoComplete="off"
                />
              </label>
            </div>
            {ranges.length > 1 && (
              <button
                type="button"
                className="remove-range-button"
                onClick={() => onRemoveTimeRange(range.id)}
                aria-label={`Remove time range ${index + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={onAddTimeRange} className="add-range-button">
          + Add Excluded Time Range
        </button>
      </div>

      <div className="filter-section">
        <label className="filter-label">Filter by Section Type:</label>
        <div className="section-type-checkboxes">
          {availableSectionTypes.map((type) => (
            <label key={type.id} className="section-type-label">
              <input
                type="checkbox"
                checked={currentSelectedTypes.includes(type.id)}
                onChange={(e) => onSectionTypeChange(type.id, e.target.checked)}
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">Filter by Status:</label>
        <div className="status-radio-buttons">
          {statusFilterOptions.map((option) => (
            <label key={option.value} className="status-label">
              <input
                type="radio"
                name="statusFilter"
                value={option.value}
                checked={selectedStatusFilter === option.value}
                onChange={(e) => onStatusFilterChange(e.target.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

    </div>
  );
}

export default TimeFilter;