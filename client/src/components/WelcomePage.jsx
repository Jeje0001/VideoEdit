import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WelcomeHeader from '../components/WelcomeHeader';
import WelcomeButtons from '../components/WelcomeButtons';
import ProductivityTips from '../components/ProductivityTips';
import ProjectPickerModal from '../components/ProjectPickerModal';
import '../styles/WelcomePage.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;
console.log("🧪 ENV CHECK:", process.env.REACT_APP_BACKEND_URL);

const WelcomePage = () => {
  const fileInputRef = useRef();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [projectList, setProjectList] = useState([]);

  // === File Upload Handler ===
  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const newProject = {
          filename: data.filename,
          projectName: file.name,
          createdAt: new Date().toISOString(),
        };

        const existing = JSON.parse(localStorage.getItem("projects")) || [];
        const updatedProjects = [...existing, newProject];

        localStorage.setItem("projects", JSON.stringify(updatedProjects));
        localStorage.setItem("lastFilename", data.filename);

        navigate("/editor", { state: { resumeFilename: data.filename } });
      } else {
        alert("Upload failed: " + (data.message || "Unknown error."));
      }
    } catch (err) {
      console.error("🔥 Upload error:", err);
      alert("Error uploading video.");
    }
  };

  // === Project Picker Logic ===
  const handleContinueProject = () => {
    const savedProjects = JSON.parse(localStorage.getItem("projects")) || [];
    if (savedProjects.length === 0) {
      alert("No saved projects found.");
      return;
    }
    setProjectList(savedProjects);
    setShowModal(true);
  };

  const handleRename = (index) => {
    const newName = prompt("Enter a new project name:");
    if (!newName) return;

    const updated = [...projectList];
    updated[index].projectName = newName;

    setProjectList(updated);
    localStorage.setItem("projects", JSON.stringify(updated));
  };

  const handleDelete = (index) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

    const updated = [...projectList];
    updated.splice(index, 1);

    setProjectList(updated);
    localStorage.setItem("projects", JSON.stringify(updated));
  };

  // === Trigger Hidden File Input ===
  const triggerFilePicker = () => {
    fileInputRef.current.click();
  };

  // === JSX ===
  return (
    <div className="welcome-container">
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <div className="glass-box">
        <WelcomeHeader subtitle="Edit videos with natural language" />
        <WelcomeButtons
          onTriggerFilePicker={triggerFilePicker}
          onContinueProject={handleContinueProject}
        />
      </div>

      {showModal && (
        <ProjectPickerModal
          projects={projectList}
          onSelect={(project) => {
            localStorage.setItem("resumeFilename",project.filename)
            navigate("/editor", 
              // { state: { resumeFilename: project.filename } });
            )
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}

      <div className="tips-wrapper">
        <ProductivityTips />
      </div>
    </div>
  );
};

export default WelcomePage;
