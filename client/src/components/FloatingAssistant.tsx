import { useState, useEffect, useRef } from "react";
import { X, Send, Minus, Maximize2, Bot } from "lucide-react";
import styles from "./FloatingAssistant.module.css";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function FloatingAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hi! I'm your Quotr Assistant. AI features are being migrated to Lovable Cloud. Check back soon!" }
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        setMessages(prev => [...prev, { role: "user", content: input }]);
        setInput("");
        setTimeout(() => {
            setMessages(prev => [...prev, { role: "assistant", content: "AI assistant is being migrated. This feature will be available soon!" }]);
        }, 300);
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
                            <div key={idx} className={`${styles.message} ${styles[msg.role]}`}><div className={styles.bubble}>{msg.content}</div></div>
                        ))}
                    </div>
                    <form onSubmit={handleSubmit} className={styles.inputArea}>
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything..." className={styles.input} />
                        <button type="submit" disabled={!input.trim()} className={styles.sendButton}><Send size={18} /></button>
                    </form>
                </>
            )}
        </div>
    );
}
