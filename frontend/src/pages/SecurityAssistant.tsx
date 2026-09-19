import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Shield,
  AlertCircle,
  HelpCircle,
  Cpu,
  CornerDownLeft,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { Finding, Scan } from '../types';
import { useToast } from '../context/ToastContext';

interface Props {
  initialFindingId?: string;
  onNavigate: (route: string, param?: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  provider?: string;
  timestamp: string;
}

export const SecurityAssistant: React.FC<Props> = ({ initialFindingId }) => {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello! I am your AI Security Assistant. I can explain discovered vulnerabilities, evaluate risk, provide remediation code examples, and analyze scan differences using our dual-provider LLM engine (Gemini with Ollama fallback). How can I assist your security review?',
      provider: 'System',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<string>(initialFindingId || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await api.listFindings();
        setFindings(list);
      } catch (err: any) {
        console.error('Error loading findings for assistant:', err);
      }
    };
    load();
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.askAssistant(
        textToSend.trim(),
        selectedFindingId || undefined
      );

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.answer,
        provider: res.provider_used,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `Assistant error: ${err.message || 'Could not communicate with LLM provider.'}`,
        provider: 'Error',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      addToast('Failed to receive response from assistant', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    addToast('Response copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    'Explain this vulnerability in simple language',
    'Why is this issue dangerous in production?',
    'Provide a secure code fix for this vulnerability',
    'How do I test if this vulnerability has been fixed?',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            AI Security Assistant
          </h2>
          <p className="text-xs text-gray-400">
            Grounded in actual Strix scan outputs. Automatic failover: Gemini &rarr; Ollama.
          </p>
        </div>

        {/* Optional Finding Context Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="context-finding-select" className="text-xs text-gray-400 shrink-0">Context:</label>
          <select
            id="context-finding-select"
            value={selectedFindingId}
            onChange={(e) => setSelectedFindingId(e.target.value)}
            className="bg-[#151c2a] border border-[#222c3d] text-gray-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 font-mono max-w-xs truncate"
          >
            <option value="">General Security Q&A</option>
            {findings.map((f) => (
              <option key={f.id} value={f.id}>
                [{f.severity.toUpperCase()}] {f.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Thread */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Security Assistant Conversation"
        className="flex-1 bg-[#0b0e14] border border-[#1d273a] rounded-xl p-4 overflow-y-auto space-y-4"
      >
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[11px] font-semibold text-gray-400">
                  {isUser ? 'You' : 'Security Assistant'}
                </span>
                {!isUser && m.provider && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#161f30] text-purple-400 border border-[#24324c]">
                    {m.provider}
                  </span>
                )}
                <span className="text-[10px] text-gray-600">{m.timestamp}</span>
              </div>

              <div
                className={`relative group p-3.5 rounded-xl text-xs max-w-2xl leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-[#121826] border border-[#1e273b] text-gray-200 rounded-tl-none'
                }`}
              >
                {m.text}

                {!isUser && m.sender === 'assistant' && (
                  <button
                    onClick={() => handleCopyMessage(m.id, m.text)}
                    aria-label="Copy assistant answer"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-[#1c2438] hover:bg-[#25304a] text-gray-400 hover:text-gray-200"
                  >
                    {copiedId === m.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400 p-2">
            <Sparkles className="w-4 h-4 animate-spin text-blue-400" />
            <span>Analyzing scan telemetry & generating response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-[#121824] hover:bg-[#1a2333] border border-[#1f2838] text-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 shrink-0"
      >
        <label htmlFor="assistant-chat-input" className="sr-only">Ask question to security assistant</label>
        <input
          id="assistant-chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a vulnerability, remediation code, or scan difference..."
          className="flex-1 bg-[#111726] border border-[#1d273a] rounded-xl px-4 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
