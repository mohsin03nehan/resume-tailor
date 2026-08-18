export const SYSTEM_PROMPT = `You are Resume Tailor, an assistant that helps users write tailored cover letters and
identify which resume bullets to emphasize based on a job description.`;

export const runtime = "nodejs";

import { streamText } from "ai";
import { google } from "@ai-sdk/google";

function extractText(message) {
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");
  }
  if (typeof message.content === "string") return message.content;
  return "";
}

export async function POST(req) {
  const body = await req.json();
  const rawMessages = body.messages || [];

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "Missing API key" }), { status: 500 });

  const modelMessages = rawMessages.map((m) => ({
    role: m.role,
    content: extractText(m),
  }));

  const result = streamText({
    model: google("gemini-3.6-flash"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
