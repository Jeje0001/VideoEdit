import './App.css';
import EditorPage from './pages/EditorPage';
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import WelcomePage from './components/WelcomePage';
import { VideoEditorProvider } from './context/VideoEditorContext';
function App() {
  useEffect(() => {
    let userId = localStorage.getItem("user_id");

    if (!userId) {
      userId = "user_" + Math.random().toString(36).substring(2, 12);
      localStorage.setItem("user_id", userId);
      console.log("🎉 First-time user! New ID:", userId);
    } else {
      console.log("👋 Returning user:", userId);
    }
  }, []);

  return (
    <VideoEditorProvider>

    <Routes>

      <Route path="/" element={<WelcomePage />} />
      <Route path="/editor" element={<EditorPage />} />

    </Routes>
    </VideoEditorProvider>
  );
}

export default App;
