import { useState, useEffect, useRef } from "react";
import { X, Send, Minus, Maximize2, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import styles from "./FloatingAssistant.module.css";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/foreman-chat`;

export default function FloatingAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hi! I'm your **Quotr Assistant**. Ask me anything about your business, quotes, or invoices!" }
    ]);
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

        try {
            const resp = await fetch(CHAT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ messages: newMessages }),
            });

            if (!resp.ok || !resp.body) {
                const err = await resp.json().catch(() => ({ error: "Request failed" }));
                setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.error || "Error"}` }]);
                setIsStreaming(false);
                return;
            }

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
                    if (json === "[DONE]") break;
                    try {
                        const parsed = JSON.parse(json);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) upsert(content);
                    } catch { /* skip */ }
                }
            }
        } catch {
            setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
        }
        setIsStreaming(false);
    };

    if (!isOpen) {
        return <button className={styles.fab} onClick={() => setIsOpen(true)}><Bot size={24} /></button>;
    }

    return (
        <div className={`${styles.container} ${isMinimized ? styles.minimized : ""}`}>
            <div className={styles.header}>
                <div className={styles.headerInfo}><Bot size={18} /><span>Assistant</span></div>
                <div className={styles.headerActions}>
                    <button onClick={() => setIsMinimized(!isMinimized)}>{isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}</button>
                    <button onClick={() => setIsOpen(false)}><X size={16} /></button>
                </div>
            </div>
            {!isMinimized && (
                <>
                    <div className={styles.chatArea} ref={scrollRef}>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`${styles.message} ${styles[msg.role]}`}>
                                <div className={styles.bubble}>
                                    {msg.role === "assistant" ? (
                                        <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                                    ) : msg.content}
                                </div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleSubmit} className={styles.inputArea}>
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything..." className={styles.input} disabled={isStreaming} />
                        <button type="submit" disabled={!input.trim() || isStreaming} className={styles.sendButton}><Send size={18} /></button>
                    </form>
                </>
            )}
        </div>
    );
}
