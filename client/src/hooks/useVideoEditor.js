// ===============================
// hooks/useVideoEditor.js
// ===============================
import { useRef, useState } from 'react';
import {
  parsePrompt,
  sanitizeActions,
  resolveBackendEndpoint,
  buildRequestBody,
} from '../utils/promptProcessor';
import { saveProject } from '../utils/storage';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export const useVideoEditor = () => {
  const [videoUrl, setVideoUrl] = useState(null);
  const [filename, setFilename] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editedParts, setEditedParts] = useState([]);
  const [currentFilename, setCurrentFilename] = useState(null);
  const undoStack = useRef([]);
  console.log("🔁 Resuming video:", filename);

  const handleVideoUpload = (url, name) => {
    setVideoUrl(url);
    setFilename(name);
    setCurrentFilename(name);
    saveProject(name);
  };
  const handleUndo = () => {
  if (undoStack.current.length === 0) {
    alert("Nothing to undo.");
    return;
  }

  const last = undoStack.current.pop();
  if (!last.prevFilename || !last.prevVideoUrl) {
    alert("Previous version not found.");
    return;
  }

  setFilename(last.prevFilename);
  setCurrentFilename(last.prevFilename);
  setVideoUrl(last.prevVideoUrl);
};
const updateLastProject = (newFilename) => {
  const projects = JSON.parse(localStorage.getItem("projects")) || [];
  const last = localStorage.getItem("lastFilename");

  const updated = projects.map((proj) =>
    proj.filename === last ? { ...proj, filename: newFilename } : proj
  );

  localStorage.setItem("projects", JSON.stringify(updated));
  localStorage.setItem("lastFilename", newFilename);
};


const handlePromptSubmit = async (promptText) => {
  const userId = localStorage.getItem("user_id");
  if (!filename) return alert("Please upload a video first.");
  setLoading(true);

  try {
    // === 1. Parse Prompt ===
    const parseData = await parsePrompt(promptText, BASE_URL);
    let actions = sanitizeActions(parseData.actions, promptText);

    if (!actions.length) {
      alert("Could not understand your request.");
      return;
    }

    // === 2. Handle Undo ===
    if (actions[0].action === "undo") {
      if (undoStack.current.length === 0) {
        alert("Nothing to undo.");
        return;
      }

      const last = undoStack.current.pop();
      if (!last.prevFilename || !last.prevVideoUrl) {
        alert("Previous version not found.");
        return;
      }

      setFilename(last.prevFilename);
      setCurrentFilename(last.prevFilename);
      setVideoUrl(last.prevVideoUrl);
      return;
    }

    // === 3. Only allow 1 action for now ===
    if (actions.length > 1) {
      alert("Please perform one action at a time. Chained prompts not yet supported.");
      return;
    }

    // === 4. Apply Each Action ===
    for (const action of actions) {
      const endpoint = resolveBackendEndpoint(action);
      if (!endpoint) {
        alert(`Unsupported action: ${action.action}`);
        continue;
      }

      const body = buildRequestBody(action, filename, userId, videoUrl);

      // Push undo snapshot
      undoStack.current.push({
        action: action.action,
        prevFilename: filename,
        prevVideoUrl: videoUrl,
      });

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const editData = await res.json();
      console.log("📥 Response from server:", editData);

      if (!editData.success) {
        alert("Edit failed: " + editData.message);
        continue;
      }

      // === 5. Handle result ===
      
      if (editData.url && action.action !== "extract_audio") {
        const fullUrl = `${BASE_URL}${editData.url}?t=${Date.now()}`;  // <-- add timestamp
        console.log("🎥 Switching to new video:", fullUrl, "for action:", action.action); // <-- ADD THIS LINE
        setVideoUrl(fullUrl);

        const updatedName = editData.url.split('/').pop();
        setFilename(updatedName);
        setCurrentFilename(updatedName);
        updateLastProject(updatedName);

        const storedProjects = JSON.parse(localStorage.getItem("projects")) || [];
        const updatedProjects = storedProjects.map(p => {
          if (p.filename === currentFilename) {
            return { ...p, filename: updatedName, lastEdited: new Date().toISOString() };
          }
          return p;
        });
        localStorage.setItem("projects", JSON.stringify(updatedProjects));
        saveProject(updatedName);

        if (["cut", "remove_segment"].includes(action.action)) {
          setEditedParts(prev => [...prev, fullUrl]);
        }
      }

      // === 6. Handle Export Download ===
      if (action.action === "export") {
        const anchor = document.createElement('a');
        anchor.href = `${BASE_URL}${editData.url}`;
        anchor.download = '';
        anchor.click();
      }

      // === 7. Handle Audio Extraction ===
      if (action.action === "extract_audio") {
        const rawFilename = editData.url.split('/').pop();
        const downloadUrl = `${BASE_URL}/download/audio/${rawFilename}`;

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', rawFilename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
     if (action.action === "remove_silence") {
        const response = await fetch(`${BASE_URL}/api/cut-silence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: currentFilename,
            user_id: "test_user"
          })
        });

        const data = await response.json();
        if (data.success) {
          const fullUrl = `${BASE_URL}/uploads/videos/${data.filename}`;
          setVideoUrl(fullUrl);
          setFilename(data.filename);
          setCurrentFilename(data.filename);
          updateLastProject(data.filename);
          saveProject(data.filename);  
        } else {
          alert("❌ Failed to remove silence: " + data.message);
        }
        return;
      }
      if (action.action === "remove_filler") {
          const response = await fetch(`${BASE_URL}/api/remove-filler`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: currentFilename,
              user_id: userId || "test_user"
            })
          });

          const data = await response.json();
          if (data.success) {
            const fullUrl = `${BASE_URL}/uploads/videos/${data.filename}?t=${Date.now()}`;
            setVideoUrl(fullUrl);
            setFilename(data.filename);
            setCurrentFilename(data.filename);
            updateLastProject(data.filename);
            saveProject(data.filename);
          } else {
            alert("❌ Failed to remove filler words: " + data.message);
          }

          return;
        }
        if (action.action === "mute_segment") {
              const response = await fetch(`${BASE_URL}/api/mute-segment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  filename: currentFilename,
                  user_id: userId || "test_user",
                  start: action.start,
                  end: action.end
                }),
              });

              const data = await response.json();
              if (data.success) {
                const fullUrl = `${BASE_URL}/uploads/videos/${data.filename}?t=${Date.now()}`;
                setVideoUrl(fullUrl);
                setFilename(data.filename);
                setCurrentFilename(data.filename);
                updateLastProject(data.filename);
                saveProject(data.filename);
              } else {
                alert("❌ Failed to mute audio: " + data.message);
              }

              return;
            }


}
  } catch (err) {
    console.error("❌ Prompt error:", err);
    alert("An error occurred while processing your prompt.");
  } finally {
    setLoading(false);
  }
};


  const handleExport = async () => {
    const userId = localStorage.getItem("user_id");
    if (!filename && editedParts.length === 0) {
      alert("Nothing to export yet.");
      return;
    }

    setLoading(true);
    try {
      const isConcat = editedParts.length > 0;
      const body = isConcat
        ? {
            parts: editedParts.map(url => url.split('/').pop()),
            newName: 'final_video_export',
            user_id: userId,
          }
        : {
            filename,
            targetFormat: 'mp4',
            newName: 'final_video_export',
            user_id: userId,
          };
          console.log("🚀 Export request body:", body);
          console.log("🧪 Is concat:", isConcat);


      const res = await fetch(`${BASE_URL}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) {
        alert("Export failed: " + data.message);
        return;
      }

      const link = document.createElement('a');
      link.href = `${BASE_URL}${data.url}`;
      link.download = 'final_video_export.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
      alert("An error occurred while exporting.");
    } finally {
      setLoading(false);
    }
  };

  return {
    videoUrl,
    filename,
    loading,
    currentFilename,
    handleVideoUpload,
    handlePromptSubmit,
    handleExport,
    handleUndo
  };
};
