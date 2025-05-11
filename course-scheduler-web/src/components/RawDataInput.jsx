import PropTypes from 'prop-types';
import React from 'react';

function RawDataInput({ value, onChange, onSubmit }) {
  return (
    <div className="raw-data-input">
      <p className="input-description">
        Paste tab-separated schedule data from AIMS into the field below to import courses.
      </p>
      <textarea
        value={value}
        onChange={onChange}
        placeholder="Go to AIMS -> Section Offering and copy-paste the table data here"
      />
      <button onClick={onSubmit} className="submit-button">
        Import Data
      </button>
    </div>
  );
}

RawDataInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default RawDataInput;