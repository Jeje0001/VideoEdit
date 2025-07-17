# 🎬 Cursor – AI Video Editor

**Cursor** is a smart video editing tool that lets users edit video clips using natural language prompts like “cut the last 5 seconds,” “remove all filler words,” or “add subtitles.” Powered by GPT-4o and FFmpeg, Cursor delivers lightning-fast edits, auto-generated transcripts, and a sleek React interface for creators, educators, and storytellers.

---

## 🚀 Key Features

- 🧠 **Natural Language Prompt Editing**  
  Type what you want and Cursor figures it out. Examples:
  - “Cut the first 5 seconds”
  - “Remove all ums and ahs”
  - “Mute between 00:12 and 00:18”

- ✂️ **Precision Cutting**  
  Cut specific segments using time ranges or prompt descriptions.

- 🔊 **Mute Audio Segments**  
  Silence portions of the video with prompt-based commands.

- 🧘 **Remove Filler Words**  
  Automatically detects and removes all filler words (e.g., “um”, “uh”, “like”, “you know”).

- 🔇 **Silence Removal**  
  Detects long silent pauses and removes them based on customizable thresholds.

- 💬 **Auto Subtitles**  
  Generates subtitles from speech using Whisper and overlays them with styled drawtext.

- 🎧 **Audio Extraction**  
  Exports the audio from any uploaded video in `.mp3` or `.wav` format.

- 🔄 **Undo/Redo**  
  Maintains full edit history with stack-based undo and redo.

- 📄 **Transcript Regeneration**  
  Every edit dynamically re-transcribes the video to reflect changes.

- 📦 **Export Final Cut**  
  One-click download of the fully edited video.

---

## 🧪 Prompt Examples You Can Try

- “Remove all filler words and"
- add subtitles”  
- “Mute everything from 1:10 to 1:30”    
- “Extract audio”  
- “Cut the last 5 seconds”

---

## 🛠 Tech Stack

- **Frontend:** React, HTML, CSS  
- **Backend:** Node.js, Express  
- **AI:** OpenAI GPT-4o, Whisper  
- **Video Processing:** FFmpeg  
- **Hosting:** Render, Railway

---


