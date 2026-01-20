import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Cpu, Send, Bot, User, Sparkles } from "lucide-react";
import { apiRequest } from "../lib/api";
import styles from "./InvoicesPage.module.css";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function ForemanPage() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hi! I'm Foreman AI, your intelligent business assistant. I can help you with:\n\n• Creating quotes and invoices\n• Looking up client information\n• Analyzing your business data\n• Answering questions about your jobs\n\nHow can I help you today?"
        }
    ]);

    const sendMessage = useMutation({
        mutationFn: async (message: string) => {
            const response = await apiRequest("POST", "/api/foreman/chat", { message });
            return response.json();
        },
        onSuccess: (data) => {
            setMessages(prev => [...prev, { role: "assistant", content: data.response || data.message || "I apologize, I couldn't process that request." }]);
        },
        onError: () => {
            setMessages(prev => [...prev, { role: "assistant", content: "I'm sorry, I encountered an error. Please try again." }]);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setMessages(prev => [...prev, { role: "user", content: input }]);
        sendMessage.mutate(input);
        setInput("");
    };

    const suggestions = [
        "Create a new quote for €500",
        "Show my unpaid invoices",
        "How many jobs do I have this week?",
        "What's my total revenue this month?"
    ];

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        <Cpu size={28} style={{ display: "inline", marginRight: "12px", color: "#8b5cf6" }} />
                        Foreman AI
                    </h1>
                    <p className={styles.subtitle}>Your intelligent business assistant</p>
                </div>
            </div>

            <div style={{
                display: "flex",
                flexDirection: "column",
                height: "calc(100vh - 280px)",
                background: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                overflow: "hidden"
            }}>
                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "24px"
                }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
                            display: "flex",
                            gap: "12px",
                            marginBottom: "20px",
                            justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
                        }}>
                            {msg.role === "assistant" && (
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0
                                }}>
                                    <Bot size={18} color="white" />
                                </div>
                            )}
                            <div style={{
                                maxWidth: "70%",
                                padding: "12px 16px",
                                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                background: msg.role === "user" ? "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" : "#f1f5f9",
                                color: msg.role === "user" ? "white" : "#1e293b",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.5
                            }}>
                                {msg.content}
                            </div>
                            {msg.role === "user" && (
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    background: "#e2e8f0",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0
                                }}>
                                    <User size={18} color="#64748b" />
                                </div>
                            )}
                        </div>
                    ))}
                    {sendMessage.isPending && (
                        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <Bot size={18} color="white" />
                            </div>
                            <div style={{
                                padding: "12px 16px",
                                borderRadius: "16px 16px 16px 4px",
                                background: "#f1f5f9",
                                color: "#64748b"
                            }}>
                                <Sparkles size={16} style={{ animation: "pulse 1s infinite" }} /> Thinking...
                            </div>
                        </div>
                    )}
                </div>

                {/* Suggestions */}
                {messages.length <= 1 && (
                    <div style={{
                        padding: "0 24px 16px",
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap"
                    }}>
                        {suggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                onClick={() => setInput(suggestion)}
                                style={{
                                    padding: "8px 14px",
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "20px",
                                    fontSize: "13px",
                                    color: "#475569",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input */}
                <form onSubmit={handleSubmit} style={{
                    padding: "16px 24px",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    gap: "12px"
                }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Foreman AI anything..."
                        className={styles.searchInput}
                        style={{ flex: 1, padding: "12px 16px" }}
                        disabled={sendMessage.isPending}
                    />
                    <button
                        type="submit"
                        className={styles.createButton}
                        disabled={sendMessage.isPending || !input.trim()}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
