import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saveProjectToLocalStorage } from '../utils/ProjectUtils.js';
import '../styles/Sidebar.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const Sidebar = ({ handleExport, onVideoUpload }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleNewProject = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("📂 Selected file:", file);

    if (file.size > 250 * 1024 * 1024) {
      return alert("File too large. Max size is 250MB.");
    }

    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("✅ Upload success:", data);

      if (data.success && data.filename && data.url) {
        saveProjectToLocalStorage({
          filename: data.filename,
          projectName: file.name,
          createdAt: new Date().toISOString(),
        });

        const fullUrl = `${BASE_URL}${data.url}`;
        onVideoUpload(fullUrl, data.filename); // ✅ Update player with new video

        navigate("/editor", {
          state: { resumeFilename: data.filename },
        });
      } else {
        alert("Upload failed. Try again.");
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert("An error occurred during upload.");
    }
  };

  return (
    <div className="sidebar">
      <Link to="/" className="promptify-logo">
        Promptify
      </Link>

      <input
        type="file"
        accept="video/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="sidebar-buttons">
        <button onClick={handleNewProject}>➕ New Project</button>
        {/* <button onClick={handleExport}>📤 Export Final Video</button> */}
        <button
          className="feedback-button"
          onClick={() =>
            window.open(
              'https://docs.google.com/forms/d/e/1FAIpQLSeJ5Mlh9-nXFd4u8gNvJI1tH-BhkijRfr7Nmxxhnj2c2LkxPQ/viewform?usp=dialog',
              '_blank'
            )
          }
        >
          💬 Feedback
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
