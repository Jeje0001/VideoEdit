import React, { useEffect } from "react";
import "../styles/ProjectPickerModal.css"; // We'll create this later

const ProjectPickerModal = ({ projects, onSelect, onClose, onRename, onDelete }) => {
  useEffect(() => {
    // Allow ESC key to close modal
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Prevent background scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-overlay">
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Select a Project</h2>

        {projects.length === 0 ? (
          <p className="empty-state">No saved projects found.</p>
        ) : (
          <ul className="project-list">
            {projects.map((project, index) => (
              <li key={index} className="project-item">
                <button
                  className="project-main"
                  onClick={() => {
                    localStorage.setItem("resumeFilename", project.filename);
                    window.location.href = "/editor";
                  }}
                >                  
                <div className="project-name">{project.projectName || "Untitled Project"}</div>
                  <div className="project-meta filename">{project.filename}</div>
                  {project.createdAt && (
                    <div className="project-meta date">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </button>

                <div className="project-actions">
                  <button onClick={(e) => { e.stopPropagation(); onRename(index); }}>✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(index); }}>🗑️</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button className="close-button" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default ProjectPickerModal;
