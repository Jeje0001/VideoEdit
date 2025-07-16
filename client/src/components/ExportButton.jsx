
import React from 'react';
import '../styles/ExportButton.css';
import { useVideoEditorContext } from '../context/VideoEditorContext';

const ExportButton = () => {
  const { handleExport, filename } = useVideoEditorContext();

  return (
    <div className="video-actions">
      <button onClick={handleExport}>⬇️ Export Video</button>
    </div>
  );
};

export default ExportButton;
