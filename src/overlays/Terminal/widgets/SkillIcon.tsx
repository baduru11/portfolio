"use client";

import * as si from "simple-icons";

type SiIcon = { path: string; title: string; hex: string };
type SiModule = Record<string, SiIcon>;

interface SkillIconProps {
  name: string;
}

// Map skill display name → simple-icons slug. Items not in this map fall
// back to a generic glyph (see GENERIC_PATH).
const SLUG_MAP: Record<string, string> = {
  Python: "python",
  TypeScript: "typescript",
  JavaScript: "javascript",
  "C++": "cplusplus",
  "HTML/CSS": "html5",

  "Next.js": "nextdotjs",
  React: "react",
  FastAPI: "fastapi",
  "Tailwind CSS": "tailwindcss",
  PyTorch: "pytorch",
  NumPy: "numpy",
  LangChain: "langchain",
  LangGraph: "langgraph",

  "RAG / pgvector": "postgresql",
  Whisper: "huggingface",
  "Whisper / ASR": "huggingface",
  Ollama: "ollama",
  Anthropic: "anthropic",
  Gemini: "googlegemini",

  "Git / GitHub": "github",
  Git: "git",
  GitHub: "github",
  Docker: "docker",
  Supabase: "supabase",
  Vercel: "vercel",
  Railway: "railway",
  "Cloudflare R2": "cloudflare",
  Clerk: "clerk",
  CodeMirror: "codemirror",
  Jest: "jest",
  JetBrains: "jetbrains",
};

// Tiny inline SVG (24×24) glyphs for non-branded skills. currentColor friendly.
const CUSTOM_GLYPHS: Record<string, string> = {
  // Three connected nodes (multi-agent)
  agents:
    "M5 6a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm10 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0ZM10 18a2 2 0 1 1 4 0 2 2 0 0 1-4 0ZM7 7.7l4.5 8M16.5 7.7L12 15.7",
  // Curly braces
  prompt:
    "M9 4c-2 0-3 1-3 3v3c0 1-1 2-2 2 1 0 2 1 2 2v3c0 2 1 3 3 3M15 4c2 0 3 1 3 3v3c0 1 1 2 2 2-1 0-2 1-2 2v3c0 2-1 3-3 3",
  // Lightning
  fast: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  // Plug
  socket:
    "M9 2v4M15 2v4M5 6h14v6a7 7 0 0 1-14 0V6Zm6 13v3",
  // Globe
  globe:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0c-3 3-3 17 0 20m0-20c3 3 3 17 0 20M2 12h20",
  // Document
  doc:
    "M6 2h9l5 5v15H6V2Zm9 0v5h5",
  // Microphone
  mic:
    "M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 18v4M8 22h8",
  // Cloud
  cloud:
    "M7 17a4 4 0 1 1 1-7.9 5 5 0 0 1 9.6 1.4A3.5 3.5 0 0 1 17 17H7Z",
  // Diamond / spark
  spark:
    "M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z",
};

const SKILL_TO_GLYPH: Record<string, keyof typeof CUSTOM_GLYPHS> = {
  "Multi-Agent Orchestration": "agents",
  "Prompt Engineering": "prompt",
  WebSockets: "socket",
  Docling: "doc",
  LlamaIndex: "spark",
  "Azure Speech": "mic",
  LangSmith: "spark",
  "Korean — Native": "globe",
  "English — Fluent": "globe",
};

const GENERIC_PATH = "M4 4h16v16H4z";

export function SkillIcon({ name }: SkillIconProps) {
  const slug = SLUG_MAP[name];
  let path: string | null = null;

  if (slug) {
    const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
    const icon = (si as unknown as SiModule)[key];
    if (icon) path = icon.path;
  }

  if (!path) {
    const gKey = SKILL_TO_GLYPH[name];
    if (gKey) path = CUSTOM_GLYPHS[gKey];
  }

  if (!path) path = GENERIC_PATH;

  const isStroke = !slug && (SKILL_TO_GLYPH[name] || !path);

  return (
    <svg
      className="skill-icon-svg"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill={isStroke ? "none" : "currentColor"}
      stroke={isStroke ? "currentColor" : "none"}
      strokeWidth={isStroke ? 1.6 : 0}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}
