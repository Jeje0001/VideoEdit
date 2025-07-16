import React, { useState, useEffect } from 'react';
import '../styles/PromptBox.css';

const PromptBox = ({ onSubmitPrompt }) => {
  const [prompt, setPrompt] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = [
    "Cut from 00:01:10 to 00:01:20",
    "Add text 'Subscribe Now' at 1:15",
    "Mute audio from 00:00 to 00:10",
    "Extract audio as MP3",
    "Apply slow motion from 00:01:00 to 00:01:15",
    "Remove filler words like um, uh",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  });

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    onSubmitPrompt(prompt);
    setPrompt("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="prompt-box">
      <input
        type="text"
        aria-label="Prompt input for video editing"
        placeholder={placeholders[placeholderIndex]}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleSubmit} disabled={!prompt.trim()}>
        Run
      </button>
    </div>
  );
};

export default PromptBox;
