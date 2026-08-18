export const SYSTEM_PROMPT = `You are Resume Tailor, an assistant that helps users write tailored cover letters and
identify which resume bullets to emphasize based on a job description. When the user shares a job description,
use the analyzeJobMatch tool with the job description and the resume summary to evaluate skill overlap before
giving advice.`;

export const runtime = "nodejs";

import { streamText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const SKILL_KEYWORDS = [
  "react",
  "typescript",
  "javascript",
  "node",
  "api",
  "css",
  "next.js",
  "python",
  "sql",
  "aws",
  "git",
  "testing",
];

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

const normalizeSkillText = (value) => value.toLowerCase().replace(/[^a-z0-9./\s-]/g, " ").replace(/\s+/g, " ").trim();

const matchesSkill = (skill, text) => {
  const escapedSkill = skill.replace(/\./g, "\\.").replace(/\//g, "\\/");
  return new RegExp(`\\b${escapedSkill}\\b`, "i").test(text);
};

const analyzeJobMatch = tool({
  description: "Analyze how well a resume summary matches a job description using a predefined skill list.",
  inputSchema: z.object({
    jobDescription: z.string().min(1),
    resumeSummary: z.string().min(1),
  }),
  execute: async ({ jobDescription, resumeSummary }) => {
    const jobText = normalizeSkillText(jobDescription);
    const resumeText = normalizeSkillText(resumeSummary);

    const jobSkills = SKILL_KEYWORDS.filter((skill) => matchesSkill(skill, jobText));
    const resumeSkills = SKILL_KEYWORDS.filter((skill) => matchesSkill(skill, resumeText));
    const matchedSkills = jobSkills.filter((skill) => resumeSkills.includes(skill));
    const missingSkills = jobSkills.filter((skill) => !resumeSkills.includes(skill));

    const matchScore = jobSkills.length > 0 ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 0;

    const skillBullets = {
      react: "Built React interfaces and reusable components to improve user experience and maintainability.",
      typescript: "Used TypeScript to improve type safety and reduce runtime errors in application logic.",
      javascript: "Implemented JavaScript-based features and interactivity across the application experience.",
      node: "Developed backend or server-side features using Node.js to support application workflows.",
      api: "Integrated and consumed APIs to connect frontend experiences with backend services.",
      css: "Crafted responsive interfaces using CSS to deliver polished, accessible layouts.",
      "next.js": "Built Next.js pages and app routes to support modern full-stack experiences.",
      python: "Applied Python for scripting, automation, and data processing tasks.",
      sql: "Wrote SQL queries to manage, filter, and analyze data effectively.",
      aws: "Deployed or managed cloud workloads on AWS to support scalable application delivery.",
      git: "Used Git to manage version control, collaboration, and code review workflows.",
      testing: "Added or maintained automated tests to improve reliability and catch regressions early.",
    };

    const suggestedBullets = matchedSkills.slice(0, 3).map((skill) => skillBullets[skill] || `Applied ${skill} to improve project quality and delivery.`);

    return {
      matchScore,
      matchedSkills,
      missingSkills,
      suggestedBullets,
    };
  },
});

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
    tools: {
      analyzeJobMatch,
    },
  });

  return result.toUIMessageStreamResponse();
}
