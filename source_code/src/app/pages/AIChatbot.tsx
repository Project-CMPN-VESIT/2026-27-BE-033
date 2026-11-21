"use client";
import { useEffect, useRef, useState } from "react";
import { Send, AlertCircle, FileText, Shield, BarChart3, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import source from "@/lib/data/assistant_source.json";
import { ASSISTANT_COPY, LANGUAGE_OPTIONS, detectLanguage, isAssistantLanguage, type AssistantLanguage } from "@/lib/assistantLanguage";

// --- Types -------------------------------------------------------------------

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  language?: AssistantLanguage;
}

// --- Constants ---------------------------------------------------------------

const MAX_CHARS = 300;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    ASSISTANT_COPY.en.welcome,
  timestamp: "",
};

// --- Component ---------------------------------------------------------------

export function AIChatbot() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState<string | undefined>();
  const [retryQuestion, setRetryQuestion] = useState("");
  const [language, setLanguage] = useState<AssistantLanguage>("en");
  const explicitLanguage = useRef(false);
  const sendingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = ASSISTANT_COPY[language];

  useEffect(() => {
    try {
      const saved = localStorage.getItem("assistant-language");
      if (isAssistantLanguage(saved)) { explicitLanguage.current = true; setLanguage(saved); }
    } catch { /* The selector also works when browser storage is disabled. */ }
  }, []);

  useEffect(() => {
    setMessages(prev => prev.length === 1 && prev[0].id === "welcome" ? [{ ...WELCOME_MESSAGE, content: ASSISTANT_COPY[language].welcome, language }] : prev);
  }, [language]);

  const chooseLanguage = (value: AssistantLanguage) => {
    explicitLanguage.current = true;
    setLanguage(value);
    try { localStorage.setItem("assistant-language", value); } catch { /* Optional preference storage. */ }
  };

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendQuestion = async (text: string, isRetry = false) => {
    const question = text.trim();
    if (!question || sendingRef.current) return;
    if (question.length > MAX_CHARS) {
      setError(language === "mr" ? `कृपया प्रश्न ${MAX_CHARS} अक्षरांपर्यंत ठेवा.` : language === "hi" ? `कृपया प्रश्न ${MAX_CHARS} अक्षरों तक रखें।` : language === "hinglish" ? `Kripya sawaal ${MAX_CHARS} characters tak rakhiye.` : `Please keep your question under ${MAX_CHARS} characters.`);
      return;
    }

    setError("");
    sendingRef.current = true;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
      language,
    };
    if (!isRetry) setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context, language }),
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json() as { answer?: string; error?: string; context?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer ?? "No answer received.",
        timestamp: new Date().toISOString(),
        language,
      };
      setMessages(prev => [...prev, aiMsg]);
      setContext(data.context);
      setRetryQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setRetryQuestion(question);
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  };

  const showExamples = messages.length <= 1 && !isLoading;
  const charsLeft = MAX_CHARS - input.length;

  return (
    <div lang={language === "hinglish" ? "hi-Latn" : language} className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center ring-1 ring-white/20 flex-shrink-0">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Chunav Bodh AI Assistant</h1>
            <p className="text-blue-100 text-sm mt-1">
              English · Hinglish · हिन्दी · मराठी
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoCard
          icon={<Shield className="w-5 h-5" />}
          title="Affidavit Data Only"
          description="Answers use candidate affidavits as recorded in the sheet"
        />
        <InfoCard
          icon={<BarChart3 className="w-5 h-5" />}
          title="Strictly Neutral"
          description="Facts only — no voting advice, no party bias"
        />
        <InfoCard
          icon={<FileText className="w-5 h-5" />}
          title={`${source.count.toLocaleString("en-IN")} Candidates`}
          description="Assets, liabilities, declared cases, age and education"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p id="assistant-language-label" className="text-sm font-semibold text-[#1E3A8A]">{copy.language}</p>
          <div role="group" aria-labelledby="assistant-language-label" className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map(option => (
              <button key={option.value} type="button" lang={option.value === "hinglish" ? "hi-Latn" : option.value} aria-pressed={language === option.value} disabled={isLoading} onClick={() => chooseLanguage(option.value)} className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${language === option.value ? "border-[#1E3A8A] bg-[#1E3A8A] text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-blue-50"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500">{copy.hint}</p>
      </div>

      {/* Chat Window */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <p className="text-sm text-gray-600">{copy.followup}</p>
          <Button variant="ghost" disabled={isLoading} onClick={() => { setMessages([{ ...WELCOME_MESSAGE, content: copy.welcome, language }]); setContext(undefined); setError(""); setRetryQuestion(""); setInput(""); }}>{copy.newChat}</Button>
        </div>
        {/* Messages */}
        <div role="log" aria-live="polite" aria-busy={isLoading} aria-label="Assistant conversation" className="h-[520px] overflow-y-auto p-5 space-y-5 bg-gray-50 rounded-t-2xl">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-[#1E3A8A] rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "400ms" }} />
                  <span className="text-xs text-gray-400 ml-1">{copy.loading}</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Example Questions */}
        {showExamples && (
          <div className="border-t border-gray-200 p-4 bg-white">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
              {copy.tryAsking}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {copy.examples.map(q => (
                <button
                  key={q}
                  onClick={() => sendQuestion(q)}
                  disabled={isLoading}
                  className="text-left px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-sm text-gray-700 leading-snug disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="mx-4 mb-0 mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            {retryQuestion && <Button variant="ghost" disabled={isLoading} onClick={() => sendQuestion(retryQuestion, true)}>{copy.retry}</Button>}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 p-4 bg-white rounded-b-2xl">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); if (!explicitLanguage.current) setLanguage(detectLanguage(e.target.value)); }}
                onKeyDown={handleKeyDown}
                placeholder={copy.placeholder}
                aria-label={copy.input}
                maxLength={MAX_CHARS}
                disabled={isLoading}
                className="pr-16"
              />
              {input.length > MAX_CHARS * 0.8 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${charsLeft < 20 ? "text-red-500" : "text-gray-400"}`}>
                  {charsLeft}
                </span>
              )}
            </div>
            <Button
              onClick={() => sendQuestion(input)}
              disabled={!input.trim() || isLoading}
              aria-label={copy.send}
              className="px-5 bg-[#1E3A8A] hover:bg-[#1E40AF] text-white rounded-lg flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {copy.footer}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs text-gray-700 leading-relaxed">
          {copy.disclaimer}
        </p>
      </div>
    </div>
  );
}

// --- Sub-components ----------------------------------------------------------

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div lang={message.language === "hinglish" ? "hi-Latn" : message.language ?? "en"} className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-3`}>
      {!isUser && (
        <div className="w-9 h-9 bg-[#1E3A8A] rounded-lg flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] sm:max-w-[72%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-xl px-4 py-3 shadow-sm text-sm whitespace-pre-line leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-[#1E3A8A] to-[#1E40AF] text-white"
              : "bg-white border border-gray-200 text-gray-900"
          }`}
        >
          {message.content}
        </div>
        {message.timestamp && <p className="text-xs text-gray-400 mt-1.5 px-1">
          {new Date(message.timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>}
      </div>
      {isUser && (
        <div className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
      <div className="text-[#1E3A8A] mb-2 flex justify-center">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
