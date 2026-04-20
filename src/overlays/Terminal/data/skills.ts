export type SkillAccent = "mauve" | "blue" | "teal" | "yellow" | "pink";

export interface SkillGroup {
  id: string;
  title: string;
  accent: SkillAccent;
  items: string[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    id: "languages",
    title: "LANGUAGES",
    accent: "blue",
    items: ["Python", "TypeScript", "JavaScript", "C++", "HTML/CSS"],
  },
  {
    id: "frameworks",
    title: "FRAMEWORKS & LIBRARIES",
    accent: "teal",
    items: [
      "Next.js",
      "React",
      "FastAPI",
      "Tailwind CSS",
      "PyTorch",
      "NumPy",
      "LangChain",
      "LangGraph",
      "WebSockets",
      "Docling",
      "Whisper / ASR",
    ],
  },
  {
    id: "ai",
    title: "AI & AGENTIC",
    accent: "mauve",
    items: [
      "Multi-Agent Orchestration",
      "RAG / pgvector",
      "Prompt Engineering",
    ],
  },
  {
    id: "devtools",
    title: "DEVELOPER TOOLS",
    accent: "blue",
    items: [
      "Git / GitHub",
      "Docker",
      "Supabase",
      "Vercel",
      "Railway",
      "Cloudflare R2",
      "Clerk",
      "LangSmith",
    ],
  },
  {
    id: "spoken",
    title: "LANGUAGES (SPOKEN)",
    accent: "pink",
    items: ["Korean — Native", "English — Fluent"],
  },
];
