// src/context/VideoEditorContext.js
import React, { createContext, useContext } from 'react';
import { useVideoEditor } from '../hooks/useVideoEditor';

const VideoEditorContext = createContext(null);

export const VideoEditorProvider = ({ children }) => {
  const videoEditor = useVideoEditor();
  return (
    <VideoEditorContext.Provider value={videoEditor}>
      {children}
    </VideoEditorContext.Provider>
  );
};

export const useVideoEditorContext = () => {
  const context = useContext(VideoEditorContext);
  if (!context) {
    throw new Error("useVideoEditorContext must be used inside a VideoEditorProvider");
  }
  return context;
};
