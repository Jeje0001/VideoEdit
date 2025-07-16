import React from 'react';
import '../styles/WelcomeHeader.css';

const WelcomeHeader = ({ subtitle }) => {
  return (
    <div className="welcome-header">
      <h1 className="app-title">Promptify</h1>
      <p className="app-tagline">Edit videos with natural language</p>
    </div>
  );
};

export default WelcomeHeader;
