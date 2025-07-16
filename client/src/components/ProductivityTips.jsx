import React, { useState, useEffect } from 'react';
import '../styles/ProductivityTips.css';

const tips = [
  "💡 Use short, clear prompts like: 'Cut from 00:01:00 to 00:01:15'.",
  "✨ Type 'remove last 10 seconds' to trim the end of your video.",
  "🔁 Use 'undo last edit' to revert your most recent change.",
  "🧠 Tip: Start simple. Then iterate.",
  "📁 Your edits are saved as you go — no need to worry!",
  "🚀 Use export when you're done to download your final video.",
  "⌨️ You can use keyboard shortcuts: Enter = submit, Esc = clear prompt.",
  "🕒 Say 'speed up from 00:01:00 to 00:01:15' to fast-forward clips.",
  "🔍 You can ask for caption styling like 'bold and large font'.",
  "   You can extract the audio from the video",
  "   You can try prompts like Add Subscribe!' text at 1:15, bottom-right, in red",
  "   Apply slow motion from 1:10 to 1:20"
];

const ProductivityTips = ({ interval = 5000 }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const tipCycle = setInterval(() => {
      setCurrentTipIndex((prevIndex) => (prevIndex + 1) % tips.length);
    }, interval);
    return () => clearInterval(tipCycle);
  }, [interval]);

  return (
    <div className="tips-box fade-in">
      <h3>💡 Productivity Tip</h3>
      <p className="tip-text" key={currentTipIndex}>
        {tips[currentTipIndex]}
      </p>
    </div>
  );
};

export default ProductivityTips;
