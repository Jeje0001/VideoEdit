import React, { useEffect, useState } from 'react';
import '../styles/EditorPage.css';
import Sidebar from '../components/Sidebar';
import PromptBox from '../components/PromptBox';
import { useLocation } from 'react-router-dom';
import { useVideoEditorContext } from '../context/VideoEditorContext';
import ChatBox from '../components/ChatBox';
import { useChatManager } from '../logic/ChatManager'; // ✅ Import

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';



const EditorPage = () => {
  const {
    videoUrl,
    handleVideoUpload,
    handlePromptSubmit,
    handleExport,
    currentFilename,
    setFilename
    
  } = useVideoEditorContext();

  const location = useLocation();
  const [loading, setLoading] = useState(false);
 const { chatHistory, handleChatPrompt } = useChatManager({
  videoUrl,
  currentFilename,
  setVideoUrl: handleVideoUpload,
  setFilename,
  handlePromptSubmit   // ✅ this was missing!
});

useEffect(() => {
  const filename = location.state?.resumeFilename || localStorage.getItem('lastFilename');
  if (!filename) {
    console.warn("No resume filename found.");
    return;
  }

  const fileUrl = `${BASE_URL}/uploads/videos/${filename}`;
  console.log("🧪 Loading video:", fileUrl);
  handleVideoUpload(fileUrl, filename);

},[])



  return (
    <div className="editor-layout">
      <Sidebar handleExport={()=> handleExport(currentFilename)} onVideoUpload={handleVideoUpload} />

      <div className="video-area">
        {videoUrl && (
          <div className="video-preview">
            {console.log("🎥 Final video URL to render:", videoUrl)}

            <video
              key={videoUrl}
              src={videoUrl}
              controls
              onLoadedMetadata={(e) => console.log("✅ Video loaded:", e.target.duration)}
            />
          </div>
        )}

      </div>

      <div className="prompt-panel">
        <ChatBox chatHistory={chatHistory} />

        {/* <PromptBox onSubmitPrompt={(promptText) => handlePromptSubmit(promptText, setChatHistory, setLoading)} loading={loading} /> */}
        {/* <PromptBox onSubmitPrompt={handlePromptSubmit} /> */}
        <PromptBox onSubmitPrompt={handleChatPrompt} />


      </div>
    </div>
  );
};


export default EditorPage;
