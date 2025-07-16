// src/logic/ChatManager.js
import { useState } from 'react';
import { classifyPromptType,rewritePromptWithGPT } from '../utils/gptHelpers';
 
export const useChatManager = ({ videoUrl, currentFilename, setVideoUrl, handlePromptSubmit }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [editHistory, setEditHistory] = useState([]);

  const handleChatPrompt = async (userPrompt) => {
  const trimmed = userPrompt.trim();
  setChatHistory(prev => [...prev, { role: "user", message: trimmed }]);

  try {
    const result = await classifyPromptType(trimmed);

    if (result.type === "edit") {
      if (!result.canPerform) {
        setChatHistory(prev => [
          ...prev,
          { role: "ai", message: `⚠️ ${result.reason || "This edit isn't supported yet."}` }
        ]);
        return;
      }

      const cleanedPrompt = await rewritePromptWithGPT(trimmed);
      setChatHistory(prev => [
        ...prev,
        { role: "ai", message: "🛠️ Working on your edit..." }
      ]);

      await handlePromptSubmit(cleanedPrompt);

      setChatHistory(prev => [
        ...prev.slice(0, -1),
        { role: "ai", message: `✅ Edit applied: “${cleanedPrompt}”` }
      ]);

      setEditHistory(prev => [
        ...prev,
        { originalPrompt: cleanedPrompt, timestamp: new Date().toISOString() }
      ]);
    }

    else if (result.type === "undo") {
      await handlePromptSubmit("undo");
      setChatHistory(prev => [
        ...prev,
        { role: "ai", message: "🔁 Last edit undone." }
      ]);
    }

    else if (result.type === "greeting") {
      setChatHistory(prev => [
        ...prev,
        { role: "ai", message: "👋 Hey there! What would you like to edit?" }
      ]);
    }

    else {
    setChatHistory(prev => [
      ...prev,
      { role: "ai", message: `⚠️ ${result.reason || "I didn’t understand that command."}` }
    ]);
  }

  } catch (err) {
    console.error("❌ GPT Error:", err);
    setChatHistory(prev => [
      ...prev,
      { role: "ai", message: "❌ Something went wrong while processing your request." }
    ]);
  }
};


  const getLastEdit = () => {
    if (editHistory.length === 0) return null;
    return editHistory[editHistory.length - 1];
  };

  return {
    chatHistory,
    handleChatPrompt,
    editHistory,
    getLastEdit
  };
};
