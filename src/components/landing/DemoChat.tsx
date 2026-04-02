import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Loader2, ArrowRight, Mic, Volume2, VolumeX } from "lucide-react";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const MAX_DEMO_MESSAGES = 3;

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

interface DemoMessage {
  role: "user" | "assistant";
  content: string;
}

interface DemoChatProps {
  open: boolean;
  onClose: () => void;
}

export function DemoChat({ open, onClose }: DemoChatProps) {
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm George — your AI business partner. Ask me anything a tradesperson would need help with. Try:\n\n- *\"Quote for Mrs. Patterson, EV charger 7kW\"*\n- *\"Which invoices are overdue?\"*\n- *\"What should I focus on this week?\"*",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const hasBrowserTTS = typeof window !== "undefined" && !!window.speechSynthesis;

  const hasSpeechSupport = !!SpeechRecognitionAPI;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakResponse = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const trimmed = text.slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = "en-GB";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    // Pick a British male voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === "en-GB" && /male/i.test(v.name))
      || voices.find(v => v.lang.startsWith("en-GB"));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const userMessage = (overrideText || input).trim();
    if (!userMessage || isLoading || userMessageCount >= MAX_DEMO_MESSAGES) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setUserMessageCount((c) => c + 1);
    setIsLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/george-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: null,
          demo_mode: true,
        }),
      });

      const data = await res.json();
      const reply = data.message || "I couldn't process that right now. Try signing up for the full experience!";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      // Speak the reply
      speakResponse(reply);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Sign up to get the full George experience!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, userMessageCount, speakResponse]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      if (transcript) {
        setInput(transcript);
        // Auto-send after a short delay so user sees the text
        setTimeout(() => handleSend(transcript), 300);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  }, [isListening, handleSend]);

  const hitLimit = userMessageCount >= MAX_DEMO_MESSAGES;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
          <ForemanAvatar size="md" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">George — Demo Mode</p>
            <p className="text-xs text-muted-foreground">
              {MAX_DEMO_MESSAGES - userMessageCount} message{MAX_DEMO_MESSAGES - userMessageCount !== 1 ? "s" : ""} remaining
              {hasSpeechSupport && " · Voice enabled"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {hasSpeechSupport && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current = null;
                  }
                  setVoiceEnabled((v) => !v);
                }}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "gap-2.5")}>
              {msg.role === "assistant" && <ForemanAvatar size="sm" className="mt-0.5 shrink-0" />}
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 max-w-[85%] text-sm",
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 rounded-br-md"
                    : "bg-muted/50 border border-border rounded-bl-md"
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2.5">
              <ForemanAvatar size="sm" className="mt-0.5 shrink-0" />
              <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input or CTA */}
        <div className="border-t border-border p-4">
          {hitLimit ? (
            <div className="text-center space-y-3">
              <p className="text-sm font-medium text-foreground">Like what you see?</p>
              <p className="text-xs text-muted-foreground">Sign up free to get unlimited access to George.</p>
              <Link to="/signup">
                <Button className="w-full gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Ask George anything..."}
                disabled={isLoading || isListening}
                className="flex-1"
              />
              {hasSpeechSupport && (
                <Button
                  type="button"
                  size="icon"
                  variant={isListening ? "default" : "outline"}
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={cn(isListening && "animate-pulse")}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
