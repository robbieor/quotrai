import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useScribe } from "@elevenlabs/react";
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

/**
 * Dictation hook powered by ElevenLabs Scribe v2 Realtime via the official
 * @elevenlabs/react SDK. Replaces the hand-rolled WebSocket + ScriptProcessor
 * pipeline — lower latency (~150ms partials), better iOS support, VAD commits.
 */
export function useVoiceInput() {
  const [committedText, setCommittedText] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    onPartialTranscript: (data: { text: string }) => {
      setPartialTranscript(data.text || "");
    },
    onCommittedTranscript: (data: { text: string }) => {
      const finalText = (data.text || "").trim();
      if (!finalText) return;
      setCommittedText((prev) => (prev ? `${prev} ${finalText}` : finalText));
      setPartialTranscript("");
    },
  });

  const isListening = scribe.isConnected;

  const transcript = useMemo(() => {
    if (partialTranscript) {
      return committedText ? `${committedText} ${partialTranscript}` : partialTranscript;
    }
    return committedText;
  }, [committedText, partialTranscript]);

  const startListening = useCallback(async () => {
    if (scribe.isConnected || isStarting) return;
    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        throw new Error("Failed to get voice token");
      }
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      console.error("Voice input error:", error);
      toast.error("Could not start voice input. Please check microphone permissions.");
    } finally {
      setIsStarting(false);
    }
  }, [scribe, isStarting]);

  const stopListening = useCallback(() => {
    if (scribe.isConnected) {
      scribe.disconnect();
    }
    setPartialTranscript("");
  }, [scribe]);

  const clearTranscript = useCallback(() => {
    setCommittedText("");
    setPartialTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scribe.isConnected) scribe.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

