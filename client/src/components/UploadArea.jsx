import React, { useState } from 'react';
import '../styles/UploadArea.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

const UploadArea = ({ setVideoUrl, setFilename }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setVideoUrl(URL.createObjectURL(file)); // preview locally
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file before uploading.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.filename) {
        alert("Upload successful!");
        setVideoUrl(`${BASE_URL}${data.url}`);
        setFilename(data.filename);
      } else {
        alert("Upload failed: " + (data.message || "Unknown error."));
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("An error occurred during upload.");
    }

    setUploading(false);
  };

  let buttonLabel = "Upload";
  if (uploading) {
    buttonLabel = "Uploading...";
  }

  return (
    <div className="upload-area">
      <h2>Upload Your Video</h2>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={uploading}>
        {buttonLabel}
      </button>
    </div>
  );
};

export default UploadArea;
