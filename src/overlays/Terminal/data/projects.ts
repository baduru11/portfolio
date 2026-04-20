export type ProjectId =
  | "ward"
  | "xiyouquest"
  | "cle"
  | "codecocoon"
  | "companyintel"
  | "finameter"
  | "focus-detector";

export interface Project {
  id: ProjectId;
  num: string;
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  stack: string[];
  award?: string;
  github?: string;
  liveUrl?: string;
}

export const PROJECTS: Project[] = [
  {
    id: "ward",
    num: "01",
    name: "WARD",
    tagline: "Multi-channel agentic AI scam detection.",
    description:
      "Multi-channel agentic AI scam detection system covering voice calls, web phishing, and document scanning. Powered by a FastAPI WebSocket backend orchestrating a 5-node LangGraph reasoning pipeline across all three detection channels. Features a Next.js frontend with simulated phone UIs and a live reasoning panel streaming real-time threat analysis via WebSocket. Cross-channel convergence engine as the core differentiator.",
    tags: ["#AI", "#Hackathon", "#Agents"],
    stack: [
      "FastAPI",
      "LangGraph",
      "Next.js",
      "Claude Haiku",
      "Gemini 2.5 Flash",
      "Deepgram",
      "WebSocket",
    ],
    award: "2nd Runner-Up + Most Innovative — GDGoC HKUST 2026",
    github: "https://github.com/baduru11",
  },
  {
    id: "xiyouquest",
    num: "02",
    name: "XiYouQuest",
    tagline: "Production Putonghua learning platform with RPG progression.",
    description:
      "Production-ready Putonghua educational platform built as sole developer in a 5-person team. Engineered an optimized oral assessment pipeline delivering phone-level accuracy and contextual feedback in under 3 seconds by integrating iFlyTek ISE and ASR Transcription WebSockets with OpenRouter for LLM feedback. Drove user retention through a scalable gamification engine powering a multi-stage RPG campaign, event-driven achievements, and a real-time social activity feed.",
    tags: ["#AI", "#Education", "#Hackathon"],
    stack: [
      "Next.js",
      "Supabase",
      "iFlyTek ISE/ASR",
      "OpenRouter",
      "PostgreSQL",
    ],
    award: "1st Place — HKUST GenAI Hackathon 2026",
    github: "https://github.com/baduru11",
  },
  {
    id: "cle",
    num: "03",
    name: "CLE AI Platform",
    tagline: "Adaptive AI teaching platform for HKUST language courses.",
    description:
      "AI-powered language teaching and learning platform built as sole engineer in a 4-person team, targeted for deployment across 5 HKUST language courses. Engineered an adaptive learning system using a NumPy/PyTorch REINFORCE contextual bandit that learns each student's optimal difficulty in real time, and a hierarchical Bayesian classifier that corrects LLM-assigned difficulty labels using observed student performance. Built a RAG pipeline (FastAPI, pgvector, Docling, Whisper) turning uploaded materials into quizzes, flashcards, and summaries, alongside live WebSocket in-class quizzes, pronunciation grading (Azure / iFlyTek), FSRS-5 neural spaced repetition, and an instructor analytics dashboard.",
    tags: ["#AI", "#Fullstack", "#Ongoing"],
    stack: [
      "FastAPI",
      "Next.js",
      "pgvector",
      "Docling",
      "Whisper",
      "PyTorch",
      "Azure Speech",
      "iFlyTek",
      "WebSocket",
      "Clerk",
      "Cloudflare R2",
      "Railway",
    ],
    award: "Real client — HKUST Centre for Language Education",
  },
  {
    id: "codecocoon",
    num: "04",
    name: "CodeCocoon",
    tagline: "AI code comprehension with personalized skill trees.",
    description:
      "AI-powered code comprehension platform that analyzes GitHub repositories through a 14-step SSE-streamed pipeline with parallel execution. Generates beginner-friendly tutorials with Mermaid diagrams, personalized skill trees, and exercises derived from the user's own codebase. Engineered a RAG pipeline using tree-sitter semantic chunking, MiniLM-L6-v2 embeddings, and pgvector. Features a codebase chat system that streams grounded answers with file-level attribution and skill-adapted explanations. 7 exercise types, role-based learning paths, and a full skill dependency DAG.",
    tags: ["#AI", "#DevTools", "#RAG"],
    stack: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "Gemini 2.5 Flash",
      "tree-sitter",
      "MiniLM-L6-v2",
      "pgvector",
      "Supabase",
      "OpenRouter",
      "CodeMirror 6",
    ],
    github: "https://github.com/baduru11",
  },
  {
    id: "companyintel",
    num: "05",
    name: "CompanyIntel",
    tagline: "5-node LangGraph agent for private-company intel.",
    description:
      "AI-powered competitive intelligence tool using a 5-node LangGraph agent pipeline (Planner → Searcher → Profiler → Synthesis → Critic), orchestrating parallel real-time web search and scraping for private company research. Engineered a three-layer anti-hallucination defense combining source-grounded prompts, Pydantic output validation, and an independent Critic node producing per-section confidence scores and a 4-axis Investment Score. RAG-powered chat via ChromaDB and SentenceTransformers.",
    tags: ["#AI", "#Agents", "#RAG"],
    stack: [
      "Python",
      "FastAPI",
      "React",
      "LangGraph",
      "ChromaDB",
      "SentenceTransformers",
      "Pydantic",
    ],
    github: "https://github.com/baduru11",
  },
  {
    id: "finameter",
    num: "06",
    name: "FinaMeter",
    tagline: "Gamified market-news learning with sector skill gauges.",
    description:
      "Gamified financial education platform that transforms real-time market news into interactive learning. Articles flow in from Finnhub, GNews, and RSS feeds through an LLM pipeline (OpenRouter / MiniMax M2.5) that generates summaries, tutorials, and quizzes. Core mechanic: sector-specific skill gauges (0–100) that gain on quiz completion and decay on inactivity — creating a daily return loop. Features XP progression, streak bonuses, stock directional prediction game, friends leaderboards, and AI-generated weekly performance reports. Built in 24 hours as sole backend engineer.",
    tags: ["#Finance", "#AI", "#Hackathon"],
    stack: [
      "Next.js 16",
      "React 19",
      "FastAPI",
      "Supabase",
      "OpenRouter (MiniMax M2.5)",
      "Finnhub",
      "GNews",
      "Recharts",
      "Railway",
      "Vercel",
    ],
    award: "Semi-Finalist — Hack The East 24h Hackathon",
    github: "https://github.com/baduru11",
  },
  {
    id: "focus-detector",
    num: "07",
    name: "Focus Detector",
    tagline: "Pomodoro app that escalates alarms when you drift off-task.",
    description:
      "Desktop Pomodoro app that watches your active window and escalates alarms when you drift off-task. Three alarm levels: toast → meme modal → fullscreen siren with glitch effects and screen shake. For ambiguous browser tabs, captures a screenshot and routes through a 4-provider AI vision chain (Ollama → Gemini → Groq → OpenRouter) to classify focus state. Built with Tauri 2 (Rust backend for OS-level window detection and screen capture) + React 19 frontend. Features stats tracking, custom profiles, always-on-top floating widget, and Windows Acrylic vibrancy.",
    tags: ["#Desktop", "#AI", "#Rust"],
    stack: [
      "Tauri 2",
      "React 19",
      "TypeScript",
      "Rust",
      "SQLite",
      "Framer Motion",
      "Ollama",
      "Gemini",
      "Groq",
      "OpenRouter",
    ],
    github: "https://github.com/baduru11",
  },
];

export function findProject(idOrName: string): Project | undefined {
  const q = idOrName.toLowerCase().replace(/\s+/g, "-");
  return PROJECTS.find(
    (p) =>
      p.id === q ||
      p.name.toLowerCase().replace(/\s+/g, "-") === q ||
      p.name.toLowerCase() === idOrName.toLowerCase(),
  );
}
