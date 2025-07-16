import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post('/parse-prompt', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, message: 'No prompt provided' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
           content: `
                    You are a strict parser for a video-editing CLI. Output pure JSON only.

                    ---

                    Available actions:
                    • cut — extract only the given segment
                    • remove_segment — delete the given segment
                    • add_subtitles — add subtitles
                    • export — export video
                    • undo — undo the last edit
                    • add_overlay — overlay text on the video
                    • extract_audio — extract audio as .mp3 or .wav
                    • slow_motion — apply slow motion to a part of the video
                    • remove_silence — remove all silence from the video
                    • remove_filler — remove all filler words from the video  
                    • mute_segment — mute audio only from a specific time range  
                    . download- export video

                    ---

                    Timestamps must be full HH:MM:SS or keywords:
                    • "start" or "beginning" → 00:00:00
                    • "end" → end of video
                    • "end-00:00:10" → 10 seconds before the end

                    ---

                    Rules:
                    - If the prompt includes “cut out silence”, “remove silence”, or “delete silent parts”, use "remove_silence"
                          → Return: { "action": "remove_silence" }
                    
                    - If the prompt includes “remove filler words”, “cut out filler words”, “delete umm/uh/like” or any variation of “remove all the filler words” → use "remove_filler"
                           → Return: { "action": "remove_filler" }
                    
                    - If the prompt says “mute”, “silence audio”, “turn off sound”, “remove sound” from a time to another time, use "mute_segment"
                         


                    - If the prompt says “remove” or “delete”, use "remove_segment"
                    - If it says “cut”, “clip”, or “extract”, use "cut"
                    - If the user says undo or reverse, return { "action": "undo" }
                    - If the user says redo or do again, return { "action": "redo" }
                    - Always respond with pure JSON: { "actions": [ { ... } ] }
                    - If the prompt says “Add 'text'...” or “Put 'text'...” (e.g., “Add 'Subscribe Now' at the end”), use action "add_overlay"
                    - For overlays, return: 
                      {
                        "action": "add_overlay",
                        "prompt": "[the full prompt text]"
                      }
                    - If the prompt includes "extract audio" or "convert to mp3/wav", use "extract_audio"
                    - Default format is "mp3" unless user says "wav"
                    - Return: { "action": "extract_audio", "format": "mp3" }
                    - If the prompt says “slow motion” or “slow down”, use "slow_motion"
                  - Default speed = 0.5 unless otherwise specified
                  - Examples:
                    - “Remove all the filler words”  
                          → { "actions": [ { "action": "remove_filler" } ] }

                    - “Cut out all the umms and uhs from the video”  
                          → { "actions": [ { "action": "remove_filler" } ] }

                    - “Delete all filler words and clean it up”  
                          → { "actions": [ { "action": "remove_filler" } ] }

                    - “Get rid of all the likes, you knows, umms”  
                          → { "actions": [ { "action": "remove_filler" } ] }
                  - “Cut out silence”  
                        → { "actions": [ { "action": "remove_silence" } ] }

                      - “Remove silence from the video”  
                        → { "actions": [ { "action": "remove_silence" } ] }

                      - “Delete all the silent parts”  
                        → { "actions": [ { "action": "remove_silence" } ] }
                    - “Mute from 0:15 to 0:30”  
                          → { "action": "mute_segment", "start": "00:00:15", "end": "00:00:30" }

                        - “Silence audio from beginning to 0:20”  
                          → { "action": "mute_segment", "start": "start", "end": "00:00:20" }

                        - “Turn off audio from 2:00 till the end”  
                          → { "action": "mute_segment", "start": "00:02:00", "end": "end" }

                    - “Slow motion from 3:00 to 3:30”
                      → { "action": "slow_motion", "start": "00:03:00", "end": "00:03:30", "speed": 0.5 }

                    - “Add slow motion from the beginning to 0:30”
                      → { "action": "slow_motion", "start": "start", "end": "00:00:30", "speed": 0.5 }

                    - “Apply slow motion from 0:40 till the end”
                      → { "action": "slow_motion", "start": "00:00:40", "end": "end", "speed": 0.5 }

                    - “Make 1:10 to 1:20 2x slower”
                      → { "action": "slow_motion", "start": "00:01:10", "end": "00:01:20", "speed": 0.5 }

                    - “Slow down clip from 2:00 to 2:30 to 25% speed”
                      → { "action": "slow_motion", "start": "00:02:00", "end": "00:02:30", "speed": 0.25 }
                    
                      - If the user says "slow down the whole video" or "make entire video slower", return:
                          {
                            "action": "slow_motion",
                            "start": "start",
                            "end": "end",
                            "speed": 0.5
                          }
                       - If a speed like "25% speed" or "make it 2x slower" is mentioned, calculate the speed:
                            - "2x slower" → 0.5
                            - "half speed" → 0.5
                            - "quarter speed" → 0.25
                            - "75% speed" → 0.75
                    ---

                    Examples:
                    - “Remove the last 5 seconds”  
                      → { "actions": [ { "action": "remove_segment", "start": "end-00:00:05", "end": "end" } ] }

                    - “Cut the last 10 seconds”  
                      → { "actions": [ { "action": "cut", "start": "end-00:00:10", "end": "end" } ] }

                    - “Trim the first 10 seconds”  
                      → { "actions": [ { "action": "remove_segment", "start": "00:00:00", "end": "00:00:10" } ] }

                    - “Undo that”  
                      → { "actions": [ { "action": "undo" } ] }

                    - “Add 'Subscribe Now' at the end in red top-right bold text”
                        → { "actions": [ { "action": "add_overlay", "prompt": "Add 'Subscribe Now' at the end in red top-right bold text" } ] }

               
                    `
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    let gptResponse = completion.choices[0].message.content;
    console.log("GPT Response:", gptResponse);

    gptResponse = gptResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(gptResponse);
    const actions = parsed.actions;

    const supportedActions = [
      'cut', 'trim', 'add_subtitles', 'export',
      'remove_segment', 'undo', 'add_overlay',
      'extract_audio', 'slow_motion','remove_silence','remove_filler','mute_segment','download'
    ];

    for (const act of actions) {
      if (!supportedActions.includes(act.action)) {
        return res.status(400).json({
          success: false,
          message: `The requested action '${act.action}' is not currently supported.`
        });
      }
    }

    return res.status(200).json({ success: true, actions });

  } catch (error) {
    console.error("Error parsing prompt:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to parse prompt",
      error: error.message
    });
  }
});

export default router;
