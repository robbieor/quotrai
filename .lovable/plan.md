

## Connect ElevenLabs (7) to the Project

### Step 1: Disconnect old ElevenLabs connection
Remove the currently linked "ElevenLabs (5)" connection from the project.

### Step 2: Link ElevenLabs (7)
Connect the new "ElevenLabs (7)" (with key ending `aaec`) to this project so the `ELEVENLABS_API_KEY` secret is updated.

### Step 3: Verify
Confirm the secret is available in the project environment.

### Technical Details
- The edge functions (`elevenlabs-agent-token`, `elevenlabs-tts`, `elevenlabs-scribe-token`) all read `ELEVENLABS_API_KEY` from `Deno.env` — no code changes needed, just swapping the connection.

