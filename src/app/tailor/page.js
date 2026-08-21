"use client";

import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";

function getTextFromMessage(message) {
  if (!message) return "";
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");
  }
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => (c && (c.text || c.content)) || "").join("");
  if (content && typeof content === "object") return content.text || content["content"] || "";
  return "";
}

function MessageBubble({ message, text }) {
  const isUser = message.role === "user";
  const content = text ?? getTextFromMessage(message);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg break-words whitespace-pre-wrap shadow-sm ${
          isUser ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-100 text-gray-900 rounded-bl-none"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function ToolAnalyzeJobMatchCard({ part, onRetry }) {
  const state = part?.state || "input-streaming";
  const output = part && typeof part.output === "object" && part.output ? part.output : {};
  const cardClass = "mt-2 max-w-[80%] rounded-lg border p-4 shadow-sm transition-all duration-200 ease-out transform-gpu";

  if (state === "output-available") {
    return (
      <div className="flex justify-start opacity-100 translate-y-0 transition-all duration-200 ease-out">
        <div className={`${cardClass} border-blue-200 bg-blue-50`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">Job match</p>
              <h3 className="mt-1 text-sm font-semibold text-gray-900">Resume fit overview</h3>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-sm font-bold text-blue-700">{output.matchScore ?? 0}%</span>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Matched skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(output.matchedSkills || []).length > 0 ? (
                  output.matchedSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No direct matches yet.</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Missing skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(output.missingSkills || []).length > 0 ? (
                  output.missingSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No major gaps flagged.</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Suggested bullets</p>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {(output.suggestedBullets || []).length > 0 ? (
                  output.suggestedBullets.map((bullet, index) => (
                    <li key={`${bullet}-${index}`} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                      <span>{bullet}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No suggested bullets yet.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === "output-error") {
    return (
      <div className="flex justify-start opacity-100 translate-y-0 transition-all duration-200 ease-out">
        <div className={`${cardClass} border-red-200 bg-red-50`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700">Analysis failed</p>
              <p className="mt-1 text-sm text-red-700">{part?.errorText || "The job match tool could not finish."}</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start opacity-100 translate-y-0 transition-all duration-200 ease-out">
      <div className={`${cardClass} border-gray-200 bg-gray-50`}>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-sm text-gray-700">
            {state === "input-available" ? "Preparing job match analysis..." : "Checking job match..."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TailorPage() {
  const { messages = [], sendMessage, regenerate, clearError, error, status, stop } = useChat();
  const [input, setInput] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const isLoading = status === "streaming" || status === "submitted";

  const examplePrompts = [
    "I'm a frontend developer applying for a React role",
    "I have 5 years in backend, applying for a senior role",
    "I'm a product designer applying to a startup",
  ];

  const containerRef = useRef(null);
  const wasLoadingRef = useRef(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newSinceScrollUp, setNewSinceScrollUp] = useState(false);

  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && !error) {
      setIsSuccess(true);
      const successTimeout = window.setTimeout(() => setIsSuccess(false), 800);
      wasLoadingRef.current = isLoading;
      return () => window.clearTimeout(successTimeout);
    }

    wasLoadingRef.current = isLoading;
  }, [error, isLoading]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 150;
      setIsNearBottom(nearBottom);
      if (nearBottom) setNewSinceScrollUp(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      setNewSinceScrollUp(true);
    }
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const lastText = getTextFromMessage(lastMessage);
  const isAssistantThinking = isLoading && lastMessage && lastMessage.role === "assistant" && !lastText;

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="px-4 py-3 border-b">
        <h1 className="text-lg font-semibold">Resume Tailor</h1>
        <p className="text-sm text-gray-500">Get tailored cover letter paragraphs and resume bullet suggestions.</p>
      </header>

      <main ref={containerRef} className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-gray-800">Start by describing the job you&apos;re applying for</p>
            <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, messageIndex) => {
            const parts = m.parts && Array.isArray(m.parts) ? m.parts : null;

            return (
              <div key={m.id || `message-${messageIndex}`} className="space-y-2">
                {parts ? (
                  parts.map((part, partIndex) => {
                    if (part.type === "text") {
                      return <MessageBubble key={`${m.id || messageIndex}-text-${partIndex}`} message={m} text={part.text} />;
                    }

                    if (part.type === "tool-analyzeJobMatch") {
                      return (
                        <ToolAnalyzeJobMatchCard
                          key={`${m.id || messageIndex}-tool-${partIndex}`}
                          part={part}
                          onRetry={() => sendMessage({ text: "Re-run the job match analysis." })}
                        />
                      );
                    }

                    return null;
                  })
                ) : (
                  <MessageBubble message={m} />
                )}
              </div>
            );
          })
        )}

        {isAssistantThinking && (
          <div className="flex justify-start">
            <div className="min-h-28 w-full max-w-md rounded-lg bg-gray-100 px-4 py-4 animate-pulse">
              <div className="space-y-3">
                <div className="h-3 w-11/12 rounded bg-gray-200"></div>
                <div className="h-3 w-4/5 rounded bg-gray-200"></div>
                <div className="h-3 w-1/2 rounded bg-gray-200"></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {newSinceScrollUp && (
        <div className="fixed bottom-24 right-4">
          <button
            className="bg-blue-600 text-white px-3 py-2 rounded-md shadow-md"
            onClick={() => {
              const el = containerRef.current;
              if (!el) return;
              el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
              setNewSinceScrollUp(false);
            }}
          >
            Jump to latest
          </button>
        </div>
      )}

      {error && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
            <span>Something went wrong sending that message.</span>
            <button
              type="button"
              onClick={async () => {
                if (isRetrying) return;
                setIsRetrying(true);
                try {
                  await regenerate();
                } finally {
                  setIsRetrying(false);
                }
              }}
              disabled={isRetrying}
              className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      )}

      <form
        className="border-t p-4 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          clearError();
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input
          className="flex-1 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Paste job description and ask for a tailored cover letter..."
          aria-label="Paste job description and ask for a tailored cover letter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />

        {/* 150ms ease-out makes hover feel immediate without being jumpy; 250ms ease-in-out lets loading register without feeling sluggish. */}
        <button
          type="submit"
          className={`send-button rounded-md px-4 py-2 text-white ${error ? "send-button-error send-button-shake" : isLoading ? "send-button-loading" : "send-button-idle"}`}
          disabled={isLoading}
        >
          <span className={`send-button-width ${isLoading ? "send-button-width-loading" : ""}`}>
            <span className={`send-button-state ${isLoading ? "send-button-state-hidden" : "send-button-state-visible"}`}>
              {error ? "Retry" : isSuccess ? "" : "Send"}
            </span>
            <span className={`send-button-spinner ${isLoading ? "send-button-state-visible" : "send-button-state-hidden"}`} aria-hidden="true">
              <span className="send-spinner-ring" />
            </span>
            <span className={`send-button-check ${isSuccess && !isLoading && !error ? "send-button-state-visible" : "send-button-state-hidden"}`} aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m4 10 4 4 8-8" />
              </svg>
            </span>
          </span>
        </button>

        {isLoading && (
          <button type="button" className="px-3 py-2 rounded-md text-sm bg-red-500 text-white hover:bg-red-600" onClick={() => stop && stop()}>
            Stop
          </button>
        )}
      </form>

      <style jsx>{`
        .send-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 5rem;
          overflow: hidden;
          transition: transform 150ms ease-out;
        }

        .send-button:hover:not(:disabled),
        .send-button:focus-visible:not(:disabled) {
          transform: scale(1.03);
        }

        .send-button:focus-visible {
          outline: 2px solid #93c5fd;
          outline-offset: 2px;
        }

        .send-button-idle {
          background: #2563eb;
        }

        .send-button-idle:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .send-button-loading {
          background: #9ca3af;
        }

        .send-button-error {
          background: #dc2626;
        }

        .send-button-error:hover:not(:disabled) {
          background: #b91c1c;
        }

        .send-button-shake {
          animation: send-button-shake 300ms ease-in-out;
        }

        .send-button-width {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 1.25rem;
          max-width: 3.5rem;
          overflow: hidden;
          transition: max-width 225ms ease-in-out;
        }

        .send-button-width-loading {
          max-width: 1.25rem;
        }

        .send-button-state,
        .send-button-spinner,
        .send-button-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          transition: transform 225ms ease-in-out, opacity 225ms ease-in-out;
        }

        .send-button-state-hidden {
          position: absolute;
          opacity: 0;
          transform: translateY(0.35rem) scale(0.96);
          pointer-events: none;
        }

        .send-button-state-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .send-button-check svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .send-spinner-ring {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.45);
          border-top-color: white;
          border-radius: 9999px;
          animation: send-spinner 700ms linear infinite;
        }

        @keyframes send-button-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }

        @keyframes send-spinner {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .send-button,
          .send-button:hover:not(:disabled),
          .send-button:focus-visible:not(:disabled),
          .send-button-state,
          .send-button-spinner,
          .send-button-check,
          .send-button-width {
            transition: none;
            transform: none;
          }

          .send-button-shake,
          .send-spinner-ring {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}