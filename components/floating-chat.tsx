"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Sparkles, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content })
      });
      if (!res.ok) {
        throw new Error("Chat failed");
      }
      return res.json() as Promise<{ answer: string }>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    }
  });

  const send = () => {
    if (!input.trim()) return;
    const content = input.trim();
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    chatMutation.mutate(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-20 right-0 w-[360px] bg-white rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-display font-bold text-white">Volley Tutor</p>
                  <p className="text-xs text-white/60">AI-powered, rulebook-grounded</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X size={18} />
              </motion.button>
            </div>
            
            {/* Messages */}
            <div className="h-[320px] overflow-y-auto p-4 space-y-4 bg-surface">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
                    <MessageCircle size={24} />
                  </div>
                  <p className="text-sm text-muted">
                    Ask me anything about volleyball rules!
                  </p>
                  <div className="mt-4 space-y-2">
                    {[
                      "What is a double contact fault?",
                      "When can a libero attack?",
                      "Explain rotation rules"
                    ].map((suggestion, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setInput(suggestion);
                        }}
                        className="block w-full text-left px-3 py-2 rounded-lg bg-white border border-border text-sm text-ink hover:border-accent/40 transition-colors"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
              
              {messages.map((m, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                      m.role === "user"
                        ? "bg-primary text-white rounded-br-md"
                        : "bg-white border border-border text-ink rounded-bl-md"
                    }`}
                  >
                    {m.content}
                  </div>
                </motion.div>
              ))}
              
              {chatMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-border">
                    <div className="flex items-center gap-2 text-muted">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <div className="p-4 bg-white border-t border-border">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Ask about a rule..."
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={send}
                  disabled={!input.trim() || chatMutation.isPending}
                  className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                >
                  <Send size={18} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className={`relative w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all ${
          open
            ? "bg-secondary text-white"
            : "bg-primary text-white"
        }`}
        aria-label="Toggle chat"
      >
        {/* Pulsing ring animation when closed */}
        {!open && (
          <>
            <span className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-20" />
            <span className="absolute inset-0 rounded-2xl bg-primary animate-pulse opacity-30" />
          </>
        )}
        
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {open ? <X size={24} /> : <MessageCircle size={24} />}
        </motion.span>
      </motion.button>
    </div>
  );
}
