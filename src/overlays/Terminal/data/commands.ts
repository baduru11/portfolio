import type { ReactNode } from "react";
import type { Route } from "../hooks/useTerminalState";
import { findProject, PROJECTS } from "./projects";

export interface CommandResult {
  route?: Route;
  view?: ReactNode;
  echo?: string;
  side?: "github";
}

export interface CommandDef {
  id: string;
  label: string;
  alias: string;
  keywords: string[];
  hidden?: boolean;
  unlock?: "konami";
  section?: "NAVIGATE" | "VIEW" | "GAMES" | "EXTERNAL" | "SYSTEM" | "SECRET";
  icon?: string;
  resolve: (args: string[]) => CommandResult | null;
}

export const COMMANDS: CommandDef[] = [
  {
    id: "home",
    label: "Home",
    alias: "home · ~",
    keywords: ["home", "start"],
    section: "NAVIGATE",
    icon: "home",
    resolve: () => ({ route: { kind: "home" } }),
  },
  {
    id: "projects",
    label: "Projects",
    alias: "projects · ls projects",
    keywords: ["projects", "work", "portfolio", "ls"],
    section: "NAVIGATE",
    icon: "projects",
    resolve: () => ({ route: { kind: "projects" } }),
  },
  {
    id: "project",
    label: "Open project",
    alias: "project <name>",
    keywords: ["project", "open"],
    section: "NAVIGATE",
    icon: "projects",
    resolve: (args) => {
      const name = args.join(" ").trim();
      if (!name) return { route: { kind: "projects" } };
      const p = findProject(name);
      if (!p) return null;
      return { route: { kind: "project", id: p.id } };
    },
  },
  {
    id: "skills",
    label: "Skills",
    alias: "skills",
    keywords: ["skills", "stack", "tech"],
    section: "NAVIGATE",
    icon: "skills",
    resolve: () => ({ route: { kind: "skills" } }),
  },
  {
    id: "lab",
    label: "Lab",
    alias: "lab · wip",
    keywords: ["lab", "wip", "experiments"],
    section: "NAVIGATE",
    icon: "lab",
    resolve: () => ({ route: { kind: "lab" } }),
  },
  {
    id: "whoami",
    label: "whoami",
    alias: "whoami · about",
    keywords: ["whoami", "about", "bio", "me"],
    section: "NAVIGATE",
    icon: "whoami",
    resolve: () => ({ route: { kind: "whoami" } }),
  },
  {
    id: "help",
    label: "Help",
    alias: "help",
    keywords: ["help", "?", "commands"],
    section: "VIEW",
    icon: "help",
    resolve: () => ({ route: { kind: "help" } }),
  },
  {
    id: "github",
    label: "Open GitHub",
    alias: "github",
    keywords: ["github", "gh", "code"],
    section: "EXTERNAL",
    icon: "github",
    resolve: () => ({ side: "github" }),
  },
  {
    id: "contact",
    label: "Contact",
    alias: "contact",
    keywords: ["contact", "email", "reach", "mail"],
    section: "EXTERNAL",
    icon: "contact",
    resolve: () => ({ route: { kind: "contact" } }),
  },
  {
    id: "matrix",
    label: "Matrix rain",
    alias: "matrix",
    keywords: ["matrix", "rain"],
    section: "VIEW",
    icon: "matrix",
    resolve: () => ({ route: { kind: "matrix" } }),
  },
  {
    id: "hack",
    label: "hack <target>",
    alias: "hack <target>",
    keywords: ["hack", "intrude"],
    section: "GAMES",
    icon: "matrix",
    resolve: (args) => ({ route: { kind: "hack", target: args.join(" ") || "the planet" } }),
  },
  {
    id: "panic",
    label: "sudo rm -rf /",
    alias: "sudo rm -rf /",
    keywords: ["sudo", "rm", "kernel", "panic"],
    hidden: true,
    section: "SECRET",
    resolve: () => ({ route: { kind: "panic" } }),
  },
  {
    id: "breakout",
    label: "Breakout",
    alias: "breakout",
    keywords: ["breakout", "game", "arcade"],
    section: "GAMES",
    icon: "game",
    resolve: () => ({ route: { kind: "game", id: "breakout" } }),
  },
  {
    id: "pong",
    label: "Pong",
    alias: "pong",
    keywords: ["pong", "game"],
    section: "GAMES",
    icon: "game",
    resolve: () => ({ route: { kind: "game", id: "pong" } }),
  },
  {
    id: "clear",
    label: "Clear terminal",
    alias: "clear",
    keywords: ["clear", "cls"],
    section: "SYSTEM",
    icon: "clear",
    resolve: () => ({}),
  },
  {
    id: "duru",
    label: "✦ duru ✦",
    alias: "duru",
    keywords: ["duru", "secret"],
    hidden: true,
    unlock: "konami",
    section: "SECRET",
    resolve: () => ({ route: { kind: "konami" } }),
  },
];

const ALIASES: Record<string, string> = {
  "ls": "projects",
  "ls projects": "projects",
  "?": "help",
  "about": "whoami",
  "wip": "lab",
};

export function parseInput(raw: string): { id: string; args: string[] } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Match exact aliases first (longest first).
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(ALIASES).sort((a, b) => b.length - a.length)) {
    if (lower === key) return { id: ALIASES[key], args: [] };
    if (lower.startsWith(`${key} `))
      return { id: ALIASES[key], args: trimmed.slice(key.length + 1).split(/\s+/) };
  }

  // Special: "sudo rm -rf /"
  if (lower === "sudo rm -rf /") return { id: "panic", args: [] };

  const tokens = trimmed.split(/\s+/);
  const head = tokens[0].toLowerCase();
  const args = tokens.slice(1);
  return { id: head, args };
}

export function commandCompletions(): string[] {
  const all = COMMANDS.flatMap((c) => [c.id, ...c.alias.split(" · ").map((a) => a.split(" ")[0])])
    .filter((s) => /^[a-z][a-z0-9-]*$/i.test(s));
  // Add project names as completions for `project <name>`
  const projectCmds = PROJECTS.map((p) => `project ${p.name.toLowerCase().replace(/\s+/g, "-")}`);
  return Array.from(new Set([...all, ...projectCmds]));
}
