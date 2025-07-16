import React from 'react';
import '../styles/TranscriptViewer.css'; // optional for styling

const TranscriptViewer = ({ transcript }) => {
  if (!transcript?.length) return <p className="text-center text-gray-400">No transcript found.</p>;

  return (
    <div className="transcript-container">
      {transcript.map((seg, index) => (
        <div key={index} className="transcript-line">
          <span className="timestamp">[{seg.start} - {seg.end}]</span>
          <span className="text"> {seg.text} </span>
        </div>
      ))}
    </div>
  );
};

export default TranscriptViewer;
