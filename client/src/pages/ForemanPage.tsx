import { useState, useEffect, useRef } from "react";
import { Cpu, Send, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import styles from "./InvoicesPage.module.css";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/foreman-chat`;

async function streamChat({
    messages,
    onDelta,
    onDone,
    onError,
}: {
    messages: Message[];
    onDelta: (text: string) => void;
    onDone: () => void;
    onError: (msg: string) => void;
}) {
    const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        onError(err.error || `Error ${resp.status}`);
        return;
    }

    if (!resp.body) { onError("No response body"); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") { onDone(); return; }
            try {
                const parsed = JSON.parse(json);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) onDelta(content);
            } catch { /* partial JSON, skip */ }
        }
    }
    onDone();
}

export default function ForemanPage() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hi! I'm **Foreman AI**, your intelligent business assistant. I can help you with:\n\n• Creating quotes and invoices\n• Looking up client information\n• Analyzing your business data\n• Trade-specific guidance\n\nHow can I help you today?"
        }
    ]);
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userMsg: Message = { role: "user", content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setIsStreaming(true);

        let assistantSoFar = "";
        const upsert = (chunk: string) => {
            assistantSoFar += chunk;
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length === newMessages.length + 1) {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
            });
        };

        await streamChat({
            messages: newMessages,
            onDelta: upsert,
            onDone: () => setIsStreaming(false),
            onError: (msg) => {
                setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
                setIsStreaming(false);
            },
        });
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}><Cpu size={28} style={{ display: "inline", marginRight: "12px", color: "#8b5cf6" }} />Foreman AI</h1>
                    <p className={styles.subtitle}>Your intelligent business assistant</p>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 280px)", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "12px", marginBottom: "20px", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                            {msg.role === "assistant" && (
                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Bot size={18} color="white" /></div>
                            )}
                            <div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" : "#f1f5f9", color: msg.role === "user" ? "white" : "#1e293b", lineHeight: 1.5 }}>
                                {msg.role === "assistant" ? (
                                    <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                                ) : msg.content}
                            </div>
                            {msg.role === "user" && (
                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><User size={18} color="#64748b" /></div>
                            )}
                        </div>
                    ))}
                    {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}><Bot size={18} color="white" /></div>
                            <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "#f1f5f9", color: "#64748b" }}><Sparkles size={16} /> Thinking...</div>
                        </div>
                    )}
                </div>
                <form onSubmit={handleSubmit} style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "12px" }}>
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Foreman AI anything..." className={styles.input} style={{ flex: 1, padding: "12px 16px" }} disabled={isStreaming} />
                    <button type="submit" className={styles.createBtn} disabled={isStreaming || !input.trim()}><Send size={18} /></button>
                </form>
            </div>
        </div>
    );
}
