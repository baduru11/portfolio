# DURU TERMINAL — Claude Design Prompt

Design a terminal-style interface called **DURU TERMINAL** for the laptop section of a 3D portfolio website. This is NOT a generic unreadable hacker terminal — it must be beautiful, intuitive, and fully mouse-navigable while still feeling authentically like a developer's personal environment.

---

## Core Philosophy

- **Mouse-first, keyboard-supported** — every action is clickable. Keyboard commands are a bonus, not a requirement.
- **Feels like a polished app** that happens to look like a terminal, not an actual terminal that happens to be on a website
- **No dead ends** — every screen has clear navigation cues, back buttons, and breadcrumbs
- The vibe is: a developer's obsessively customized Neovim/Kitty setup, not a black box

---

## Color Palette — Catppuccin Mocha

Use the Catppuccin Mocha palette exactly:

| Role | Name | Hex |
|---|---|---|
| Background | Crust | `#11111b` |
| Surface | Mantle | `#181825` |
| Panel / cards | Base | `#1e1e2e` |
| Elevated | Surface0 | `#313244` |
| Borders | Surface1 | `#45475a` |
| Dim text | Overlay1 | `#7f849c` |
| Body text | Text | `#cdd6f4` |
| Bright text | White | `#ffffff` |
| Accent / prompt | Green | `#a6e3a1` |
| Commands | Teal | `#94e2d5` |
| Project tags | Blue | `#89b4fa` |
| Skills | Mauve | `#cba6f7` |
| Warnings / WIP | Yellow | `#f9e2af` |
| Errors | Red | `#f38ba8` |
| Highlights | Pink | `#f5c2e7` |
| Cursor | Peach | `#fab387` |

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR: breadcrumb + command palette button + socials   │
├──────────────────┬──────────────────────────────────────┤
│                  │                                       │
│   SIDEBAR        │   MAIN CONTENT AREA                   │
│   (navigation)   │   (output / detail view)              │
│                  │                                       │
├──────────────────┴──────────────────────────────────────┤
│  INPUT BAR: prompt + text input + send button            │
└─────────────────────────────────────────────────────────┘
```

### Topbar
- Left: breadcrumb path — `~/duru` → `~/duru/projects` → etc. Each segment is clickable to navigate back
- Center: command palette button `⌘ commands` — opens a floating spotlight-style search of all available commands
- Right: GitHub icon link, LinkedIn icon link

### Sidebar
- Vertical nav list with icons + labels:
  - `~` Home
  - `📁` Projects
  - `⚡` Skills
  - `🧪` Lab
  - `👤` whoami
- Active item has a left accent bar in green (`#a6e3a1`) and brighter text
- Hover: background shifts to Surface0, smooth transition
- Collapsed to icon-only on narrow screens

### Main Content Area
- Scrollable output area
- Content renders as styled "terminal output blocks" — not raw text
- Each command output is a distinct visual block with a subtle top border in Surface1
- Smooth scroll, custom scrollbar styled to match the theme

### Input Bar
- Bottom of screen, always visible
- Prompt symbol `›` in peach/green
- Text input with blinking block cursor (`▮`) in peach
- Placeholder: `type a command or click the sidebar...`
- Send button on the right: `[ RUN ]` styled as a dim bordered button, lights up green on hover
- Tab autocomplete — suggestions appear as ghost text in the input
- Up/down arrow keys cycle through command history

---

## Screens & Content

### Home screen (default on load)

```
  ██████╗ ██╗   ██╗██████╗ ██╗   ██╗
  ██╔══██╗██║   ██║██╔══██╗██║   ██║
  ██║  ██║██║   ██║██████╔╝██║   ██║
  ██║  ██║██║   ██║██╔══██╗██║   ██║
  ██████╔╝╚██████╔╝██║  ██║╚██████╔╝
  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝

  DURU TERMINAL v1.0 — seungwan@hkust
  ─────────────────────────────────────────
  CS Student · AI · Builder · Seoul / HK
  ─────────────────────────────────────────
  Click the sidebar or type a command below.
  Type  help  to see all available commands.
```

ASCII art in mauve/blue gradient tones. Subtle fade-in on load, each line appearing with a slight delay (typewriter stagger, 40ms per line).

---

### Projects screen

Triggered by clicking `📁 Projects` in sidebar or typing `projects`.

**Layout:** Grid of project cards, 2 columns. Each card is a styled panel.

**Featured project card design:**
```
┌─────────────────────────────────────┐
│ [01]  WARD                    #AI   │
│ ─────────────────────────────────── │
│ Multi-channel agentic AI scam       │
│ detection. Cross-channel convergence│
│ engine as core differentiator.      │
│                                     │
│ FastAPI · LangGraph · Claude Haiku  │
│ Gemini · Deepgram · Next.js         │
│                                     │
│ 🏆 2nd Runner-Up · Most Innovative  │
│                          [ VIEW → ] │
└─────────────────────────────────────┘
```

- Card border: Surface1, lifts to blue on hover with a smooth glow
- Card number `[01]` in overlay1 (dim)
- Project name in bright text, bold
- Tags (`#AI`, `#Hackathon`) as small pills in blue/mauve
- Stack listed in teal, small monospace
- Awards in yellow
- `[ VIEW → ]` button in bottom right, green on hover
- Clicking card or button expands to detail view with slide-in animation from right

**Projects to include:**

| # | Name | Tags | Stack | Award |
|---|---|---|---|---|
| 01 | WARD | #AI #Hackathon #Agents | FastAPI, LangGraph, Next.js, Claude Haiku, Gemini 2.5 Flash, Deepgram, WebSocket | 2nd Runner-Up + Most Innovative — GDGoC HKUST 2026 |
| 02 | XiYouQuest | #AI #Education #Hackathon | Next.js, Supabase, iFlyTek ISE/ASR, OpenRouter, PostgreSQL | 1st Place — HKUST GenAI Hackathon 2026 |
| 03 | CLE AI Platform | #AI #Fullstack #Ongoing | FastAPI, Next.js, pgvector, Docling, Whisper, PyTorch, Azure Speech, iFlyTek, WebSocket, Clerk, Cloudflare R2, Railway | Real client — HKUST Centre for Language Education |
| 04 | CodeCocoon | #AI #DevTools #RAG | Next.js 16, React 19, TypeScript, Gemini 2.5 Flash, tree-sitter, MiniLM-L6-v2, pgvector, Supabase, OpenRouter, CodeMirror 6 | — |
| 05 | CompanyIntel | #AI #Agents #RAG | Python, FastAPI, React, LangGraph, ChromaDB, SentenceTransformers, Pydantic | — |
| 06 | FinaMeter | #Finance #AI #Hackathon | Next.js 16, React 19, FastAPI, Supabase, OpenRouter (MiniMax M2.5), Finnhub, GNews, Recharts, Railway, Vercel | Semi-Finalist — Hack The East 24h Hackathon |
| 07 | Focus Detector | #Desktop #AI #Rust | Tauri 2, React 19, TypeScript, Rust, SQLite, Framer Motion, Ollama, Gemini, Groq, OpenRouter | — |

**Project detail content:**

**[01] WARD**
Multi-channel agentic AI scam detection system covering voice calls, web phishing, and document scanning. Powered by a FastAPI WebSocket backend orchestrating a 5-node LangGraph reasoning pipeline across all three detection channels. Features a Next.js frontend with simulated phone UIs and a live reasoning panel streaming real-time threat analysis via WebSocket. Cross-channel convergence engine as the core differentiator.
- GitHub: github.com/baduru11

**[02] XiYouQuest**
Production-ready Putonghua educational platform built as sole developer in a 5-person team. Engineered an optimized oral assessment pipeline delivering phone-level accuracy and contextual feedback in under 3 seconds by integrating iFlyTek ISE and ASR Transcription WebSockets with OpenRouter for LLM feedback. Drove user retention through a scalable gamification engine powering a multi-stage RPG campaign, event-driven achievements, and a real-time social activity feed.
- GitHub: github.com/baduru11

**[03] CLE AI Platform**
AI-powered language teaching and learning platform built as sole engineer in a 4-person team, targeted for deployment across 5 HKUST language courses. Engineered an adaptive learning system using a NumPy/PyTorch REINFORCE contextual bandit that learns each student's optimal difficulty in real time, and a hierarchical Bayesian classifier that corrects LLM-assigned difficulty labels using observed student performance. Built a RAG pipeline (FastAPI, pgvector, Docling, Whisper) turning uploaded materials into quizzes, flashcards, and summaries, alongside live WebSocket in-class quizzes, pronunciation grading (Azure / iFlyTek), FSRS-5 neural spaced repetition, and an instructor analytics dashboard.

**[04] CodeCocoon**
AI-powered code comprehension platform that analyzes GitHub repositories through a 14-step SSE-streamed pipeline with parallel execution. Generates beginner-friendly tutorials with Mermaid diagrams, personalized skill trees, and exercises derived from the user's own codebase. Engineered a RAG pipeline using tree-sitter semantic chunking, MiniLM-L6-v2 embeddings, and pgvector. Features a codebase chat system that streams grounded answers with file-level attribution and skill-adapted explanations. 7 exercise types, role-based learning paths, and a full skill dependency DAG.
- GitHub: github.com/baduru11

**[05] CompanyIntel**
AI-powered competitive intelligence tool using a 5-node LangGraph agent pipeline (Planner → Searcher → Profiler → Synthesis → Critic), orchestrating parallel real-time web search and scraping for private company research. Engineered a three-layer anti-hallucination defense combining source-grounded prompts, Pydantic output validation, and an independent Critic node producing per-section confidence scores and a 4-axis Investment Score. RAG-powered chat via ChromaDB and SentenceTransformers.
- GitHub: github.com/baduru11

**[06] FinaMeter**
Gamified financial education platform that transforms real-time market news into interactive learning. Articles flow in from Finnhub, GNews, and RSS feeds through an LLM pipeline (OpenRouter / MiniMax M2.5) that generates summaries, tutorials, and quizzes. Core mechanic: sector-specific skill gauges (0–100) that gain on quiz completion and decay on inactivity — creating a daily return loop. Features XP progression, streak bonuses, stock directional prediction game, friends leaderboards, and AI-generated weekly performance reports. Built in 24 hours as sole backend engineer.
- GitHub: github.com/baduru11

**[07] Focus Detector**
Desktop Pomodoro app that watches your active window and escalates alarms when you drift off-task. Three alarm levels: toast → meme modal → fullscreen siren with glitch effects and screen shake. For ambiguous browser tabs, captures a screenshot and routes through a 4-provider AI vision chain (Ollama → Gemini → Groq → OpenRouter) to classify focus state. Built with Tauri 2 (Rust backend for OS-level window detection and screen capture) + React 19 frontend. Features stats tracking, custom profiles, always-on-top floating widget, and Windows Acrylic vibrancy.
- GitHub: github.com/baduru11

**Project detail view:**
- Slides in from right, pushing grid to the left
- Back button `← projects` at top left
- Full description, tech stack badges, links (GitHub, live demo)
- Breadcrumb updates: `~/duru/projects/ward`

---

### Skills screen

Triggered by `⚡ Skills` sidebar or `skills` command.

**Layout:** Grouped pill/tag clusters by category. No bars, no percentages — just clean, readable groupings that feel like a well-organized dotfile config.

```
  LANGUAGES
  ─────────────────────────────────────────
  [ Python ]  [ TypeScript ]  [ JavaScript ]  [ C++ ]  [ HTML/CSS ]

  FRAMEWORKS & LIBRARIES
  ─────────────────────────────────────────
  [ Next.js ]  [ React ]  [ FastAPI ]  [ Tailwind CSS ]
  [ PyTorch ]  [ NumPy ]  [ LangChain ]  [ LangGraph ]
  [ WebSockets ]

  AI & AGENTIC
  ─────────────────────────────────────────
  [ Multi-Agent Orchestration ]  [ RAG / pgvector ]
  [ Prompt Engineering ]  [ LlamaIndex ]  [ Docling ]
  [ Whisper / ASR ]  [ Azure Speech ]

  DEVELOPER TOOLS
  ─────────────────────────────────────────
  [ Git / GitHub ]  [ Docker ]  [ Supabase ]  [ Vercel ]
  [ Railway ]  [ Cloudflare R2 ]  [ Clerk ]  [ LangSmith ]

  LANGUAGES (SPOKEN)
  ─────────────────────────────────────────
  [ Korean — Native ]  [ English — Fluent ]
```

- Pills styled as bordered tags: Surface1 border, Text color, mauve tint on hover
- Category headers in teal, ALL CAPS, with a thin separator line
- Tags animate in with a stagger fade on section enter (30ms per tag)
- Hover on a tag subtly highlights it in mauve/blue depending on category

---

### Lab screen

Triggered by `🧪 Lab` or `lab` command.

WIP / experimental projects. Different visual treatment — yellow accent, dashed borders instead of solid.

```
  ⚠  LAB — WORK IN PROGRESS
  ────────────────────────────────────────
  Things being built. No promises.

  [WIP]  SEUNGWAN.DEV          this very site
         3D cyberpunk portfolio · Three.js · Blender · R3F

  [WIP]  CLE PLATFORM v2       ongoing
         AI teaching assistant for HKUST language instructors

  [IDEA] Contextual Bandit Adapter
         Adaptive difficulty for language learning via PyTorch
```

---

### whoami screen

```
  ┌─────────────────────────────────────┐
  │  seungwan@hkust  ~                  │
  └─────────────────────────────────────┘

  NAME      Seungwan
  ALIAS     duru
  BASED     Hong Kong (from Seoul, Korea)
  STUDY     BSc CS + Extended Major AI @ HKUST
  STATUS    Year 2 · Dean's List · GPA 3.74/4.3
  SERVED    ROK Military (completed)

  INTERESTS
  ─────────────────
  AI · Creative Coding · Hackathons
  Music Production · Generative Art
  Equity Markets (US + KR)

  CONTACT
  ─────────────────
  GitHub     github.com/baduru11
  Email      [ click to reveal ]
```

---

## Animations & Transitions

**Sidebar navigation:**
- Active indicator bar slides vertically between items (Spring easing, ~200ms)
- Content area fades out then fades in new content (crossfade, ~150ms)
- Breadcrumb updates with a slide-right transition

**Project card hover:**
- Smooth lift: `translateY(-2px)`, border glow in blue, ~150ms
- Stack tags shift from teal to brighter teal

**Project detail slide-in:**
- Detail panel slides in from right (`translateX(100%)` → `0`), ~280ms ease-out
- Grid slides left simultaneously, stays partially visible behind detail

**Skills bars:**
- Bars grow from 0% to their value on section enter
- Staggered: each row starts 60ms after previous
- Easing: ease-out cubic

**Command input:**
- On submit: input clears, command echoes in the output area with `›` prefix in peach
- New output block slides down from top with fade-in, ~120ms
- Previous blocks push down smoothly

**ASCII art on home:**
- Each line types in with 40ms stagger
- Cursor blinks at end of last line for 1s then disappears

**Command palette (⌘ commands):**
- Spotlight-style modal: dark overlay, centered floating panel
- Slides down from top ~180ms
- Fuzzy search filters commands in real time
- Keyboard: arrow keys to navigate, Enter to run, Esc to close
- Mouse: hover highlights, click runs command

**Global:**
- Custom scrollbar: thin, Surface1 track, mauve thumb
- All hover transitions: `150ms ease`
- All page transitions: `200–300ms ease-out`
- No jarring snaps anywhere

---

## Easter Eggs & Terminal Minigames

### Easter Eggs

**`hack <target>`**
A fake hacking minigame — pure cinematic theatre. On enter:
- Screen dims, a fake IP trace streams line by line (`Tracing route to 192.168.x.x...`)
- Firewall bypass text floods in (`Bypassing firewall layer 1... ██████ BYPASSED`)
- A fake progress bar fills over ~20s with random "cracking" status messages
- Final screen: `ACCESS GRANTED` in full green with a glitch reveal animation, then a fake "classified" file dumps to screen
- After 5s: auto-returns to normal terminal with `[SESSION TERMINATED]`

**`sudo rm -rf /`**
- Terminal types the command back as if confirming
- Screen flashes white once
- Full red background, fake kernel panic text floods the screen in white monospace:
  ```
  KERNEL PANIC — not syncing: VFS: Unable to mount root fs
  CPU: 0 PID: 1 Comm: swapper
  ████ SYSTEM FAILURE ████
  ```
- After 2s: CRT flicker effect, then reboots with the full boot sequence
- Returns to normal terminal

**`matrix`**
- Green falling characters (`ｦｧｨｩｪ0123456789ABCDEF`) fill the entire terminal in classic Matrix rain
- Runs for 10s with authentic column-based character streams at varying speeds
- Press any key to exit early
- On exit: characters collapse inward to center then dissolve, terminal returns

**`konami`**
- Triggered by typing the Konami code on keyboard anywhere in the terminal: `↑ ↑ ↓ ↓ ← → ← → B A`
- Does not need to be in the input bar — listens globally
- On activation:
  - Screen inverts colors for 300ms
  - `✦ CHEAT CODE ACTIVATED ✦` appears in giant glitch text center screen
  - A short chiptune plays (Web Audio: 8-bit ascending arpeggio)
  - Confetti burst of ASCII characters (`*`, `✦`, `#`, `▓`) rains down for 2s
  - A secret command `duru` gets unlocked and added to the help list
  - Returns to normal

---

### ASCII Minigames

All games are playable inline in the terminal content area. Mouse-clickable controls shown below the game canvas for accessibility. Keyboard controls always work. Each game tracks a high score saved to localStorage.

**`breakout`**
Classic Breakout rendered in ASCII:
- Paddle: `══════` controlled by left/right arrow keys or clicking left/right sides of screen
- Ball: `●` bouncing physics
- Bricks: rows of `▓▓▓` in Catppuccin colors (mauve top rows, blue middle, teal bottom)
- Score and lives displayed above the play area in terminal style
- Brick destruction plays a short Web Audio tick
- On game over: ASCII art `GAME OVER` with score, high score, and `[ PLAY AGAIN ]` button
- Cyberpunk skin: bricks labeled with fake hex addresses, paddle is `[SHIELD]`

**`pong`**
Two-mode Pong:
- **vs CPU:** `W/S` keys for left paddle, CPU controls right with slight delay for fairness
- **vs Player:** `W/S` for left, `↑/↓` for right — same keyboard, two players
- Paddles: `│` (3 chars tall), Ball: `◉`
- Center dotted line: `┊` running vertically
- Score displayed top center: `03 : 02`
- Ball speed increases every 5 volleys
- On score: brief flash of the scoring side's color (mauve/blue)
- First to 7 wins — `WINNER` announced with a glitch text reveal

---

## Help Command Output

```
  AVAILABLE COMMANDS
  ──────────────────────────────────────────
  projects          browse all projects
  project <name>    open a specific project
  skills            view skill chart
  lab               experimental work
  whoami            about me
  github            open github.com/baduru11
  contact           get in touch
  clear             clear terminal
  easter-egg        👀
  help              show this message

  TIP: click the sidebar · use ⌘ command palette · arrow keys for history
```
