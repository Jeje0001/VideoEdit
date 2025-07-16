import React from 'react';
import '../styles/WelcomeButtons.css';

const WelcomeButtons = ({ onTriggerFilePicker, onContinueProject }) => {
  const handleNewProjectClick = () => {
    if (typeof onTriggerFilePicker === 'function') {
      onTriggerFilePicker();
    }
  };

  const handleContinueClick = () => {
    if (typeof onContinueProject === 'function') {
      onContinueProject();
    }
  };

  return (
    <div className="welcome-buttons">
      <button className="primary-btn" onClick={handleNewProjectClick}>
        ➕ New Project
      </button>
      <button className="secondary-btn" onClick={handleContinueClick}>
        📂 Continue
      </button>
    </div>
  );
};

export default WelcomeButtons;
