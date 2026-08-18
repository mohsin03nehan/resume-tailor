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

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const text = getTextFromMessage(message);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg break-words whitespace-pre-wrap shadow-sm ${
          isUser ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-100 text-gray-900 rounded-bl-none"
        }`}
      >
        {text}
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
        {messages.map((m) => (
          <div key={m.id || Math.random()}>
            <MessageBubble message={m} />
          </div>
        ))}

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