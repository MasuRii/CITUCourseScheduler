// src/components/RawDataInput.jsx
import React from 'react';
import PropTypes from 'prop-types';

function RawDataInput({ rawData, onRawDataChange, onLoadData }) {
  return (
    <div className="raw-data-input section-container">
      <h2>Load Schedule from AIMS</h2>
      <label htmlFor="rawData" style={{ display: 'block', marginBottom: '5px' }}>
        Paste tab-separated schedule data here:
      </label>
      <textarea
        id="rawData"
        rows="10"
        cols="80"
        value={rawData}
        onChange={(e) => onRawDataChange(e.target.value)} // Call prop handler
        placeholder="Go to -> https://cituweb.pinnacle.com.ph/aims/students/sections.php?mainID=102&menuDesc=Section%20Offering for the schedules."
        style={{ width: '100%', marginBottom: '10px', display: 'block', fontVariantLigatures: 'none' }}
      />
      <button onClick={onLoadData}> {/* Call prop handler */}
        Load Data
      </button>
    </div>
  );
}

// Define prop types for the component
RawDataInput.propTypes = {
  rawData: PropTypes.string.isRequired,
  onRawDataChange: PropTypes.func.isRequired,
  onLoadData: PropTypes.func.isRequired,
};

export default RawDataInput;