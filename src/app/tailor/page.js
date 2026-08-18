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
  const { messages = [], sendMessage, status, stop } = useChat();
  const [input, setInput] = useState("");
  const isLoading = status === "streaming" || status === "submitted";

  const containerRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newSinceScrollUp, setNewSinceScrollUp] = useState(false);

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
        {messages.map((m, messageIndex) => {
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
        })}

        {isAssistantThinking && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg max-w-[40%]">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse inline-block"></span>
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse inline-block"></span>
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse inline-block"></span>
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

      <form
        className="border-t p-4 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input
          className="flex-1 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Paste job description and ask for a tailored cover letter..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />

        <button
          type="submit"
          className={`px-4 py-2 rounded-md text-white ${isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          disabled={isLoading}
        >
          Send
        </button>

        {isLoading && (
          <button type="button" className="px-3 py-2 rounded-md text-sm bg-red-500 text-white hover:bg-red-600" onClick={() => stop && stop()}>
            Stop
          </button>
        )}
      </form>
    </div>
  );
}