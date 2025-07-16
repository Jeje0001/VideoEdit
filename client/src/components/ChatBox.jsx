import React, { useEffect, useRef } from 'react';
import '../styles/ChatBox.css';

const ChatBox = ({ chatHistory }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    }, [chatHistory]);


  return (
    <div className="chat-box">
      {chatHistory.map((msg, index) => (
        <div key={index} className={`chat-message ${msg.role}`}>
          <div className="bubble">{msg.message}</div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatBox;
