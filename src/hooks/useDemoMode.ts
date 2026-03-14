import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { demoSteps, type DemoStep } from "@/config/demoWalkthrough";
import { supabase } from "@/integrations/supabase/client";

export function useDemoMode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);
  const navigate = useNavigate();

  const currentStep: DemoStep | null = isActive ? demoSteps[currentStepIndex] ?? null : null;
  const totalSteps = demoSteps.length;

  // Auto-start from URL param
  useEffect(() => {
    if (searchParams.get("demo") === "true" && !isActive) {
      searchParams.delete("demo");
      setSearchParams(searchParams, { replace: true });
      // Small delay to let page settle
      setTimeout(() => playAll(), 500);
    }
  }, []);

  const getAuthToken = async (): Promise<string> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  };

  const playNarration = useCallback(async (text: string): Promise<void> => {
    setIsNarrating(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      return new Promise<void>((resolve) => {
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setIsNarrating(false);
          audioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          setIsNarrating(false);
          audioRef.current = null;
          resolve();
        };
        audio.play().catch(() => {
          setIsNarrating(false);
          resolve();
        });
      });
    } catch (err) {
      console.error("Demo narration error:", err);
      setIsNarrating(false);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }, []);

  const stopDemo = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isActiveRef.current = false;
    setIsActive(false);
    setIsNarrating(false);
    setCurrentStepIndex(0);
  }, []);

  const runStep = useCallback(
    async (index: number) => {
      if (index < 0 || index >= demoSteps.length) return;
      if (!isActiveRef.current) return;
      const step = demoSteps[index];
      setCurrentStepIndex(index);
      navigate(step.route);
      await new Promise((r) => setTimeout(r, 1000));
      if (!isActiveRef.current) return;
      await playNarration(step.narration);
      if (step.pauseAfter && isActiveRef.current) {
        await new Promise((r) => setTimeout(r, step.pauseAfter));
      }
    },
    [navigate, playNarration]
  );

  const playAll = useCallback(async () => {
    isActiveRef.current = true;
    setIsActive(true);
    for (let i = 0; i < demoSteps.length; i++) {
      if (!isActiveRef.current) break;
      await runStep(i);
    }
    if (isActiveRef.current) {
      stopDemo();
    }
  }, [runStep, stopDemo]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < demoSteps.length - 1) {
      const next = currentStepIndex + 1;
      isActiveRef.current = true;
      setIsActive(true);
      runStep(next);
    }
  }, [currentStepIndex, runStep]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prev = currentStepIndex - 1;
      isActiveRef.current = true;
      setIsActive(true);
      runStep(prev);
    }
  }, [currentStepIndex, runStep]);

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    isNarrating,
    startDemo: playAll,
    stopDemo,
    nextStep,
    prevStep,
    playAll,
    goToStep: runStep,
  };
}
