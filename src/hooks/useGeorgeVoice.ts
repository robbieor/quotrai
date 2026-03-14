import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useGeorgeVoice() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!text || isPlaying) return;

    setIsPlaying(true);
    setIsSpeaking(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Use data URI for playback
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setIsSpeaking(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsSpeaking(false);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsPlaying(false);
      setIsSpeaking(false);
    }
  }, [isPlaying]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isPlaying,
    isSpeaking,
  };
}

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startListening = useCallback(async () => {
    try {
      // Get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });

      // Get scribe token
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");

      if (error || !data?.token) {
        throw new Error("Failed to get voice token");
      }

      // Connect to ElevenLabs Scribe WebSocket
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/v1/transcribe?token=${data.token}&model_id=scribe_v2_realtime`
      );
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("Scribe WebSocket connected");
        setIsListening(true);
        
        // Send initial config
        ws.send(JSON.stringify({
          type: "configure",
          audio_format: "pcm_16000",
          sample_rate: 16000,
          encoding: "pcm_s16le",
          language_code: "en",
        }));

        // Start recording and sending audio
        startRecording(stream, ws);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === "partial_transcript") {
          setPartialTranscript(message.text || "");
        } else if (message.type === "final_transcript" || message.type === "committed_transcript") {
          const finalText = message.text || message.transcript || "";
          if (finalText) {
            setTranscript(prev => prev ? `${prev} ${finalText}` : finalText);
            setPartialTranscript("");
          }
        }
      };

      ws.onerror = (error) => {
        console.error("Scribe WebSocket error:", error);
        stopListening();
        toast.error("Voice recognition error");
      };

      ws.onclose = () => {
        console.log("Scribe WebSocket closed");
        stopRecording();
      };

    } catch (error) {
      console.error("Voice input error:", error);
      toast.error("Could not start voice input. Please check microphone permissions.");
      setIsListening(false);
    }
  }, []);

  const startRecording = (stream: MediaStream, ws: WebSocket) => {
    audioContextRef.current = new AudioContext({ sampleRate: 16000 });
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);

    processor.onaudioprocess = (e) => {
      if (ws.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        
        // Convert to base64
        const uint8Array = new Uint8Array(pcmData.buffer);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binary);
        
        ws.send(JSON.stringify({
          type: "audio",
          audio: base64Audio,
        }));
      }
    };

    // Store stream for cleanup
    mediaRecorderRef.current = { stream } as any;
  };

  const stopRecording = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
  };

  const stopListening = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    stopRecording();
    setIsListening(false);
    setPartialTranscript("");
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setPartialTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    partialTranscript,
    startListening,
    stopListening,
    clearTranscript,
  };
}
