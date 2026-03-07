# Deyad 🤖

**A local-first AI app builder — use [Ollama](https://ollama.ai), generate apps from chat.**

Competes with [dyad.sh](https://dyad.sh) and [Base44](https://base44.com) with full privacy, and zero lock-in.

---

## Why Deyad?

### 🔒 Privacy First — Local by Default

- **Ollama** runs 100% on your machine — no cloud, no API keys, works offline
- Cloud providers (OpenAI, Anthropic, Google) available when you want more powerful models
- Your code never leaves your machine unless you choose to deploy it

### 🧠 Multi-Provider AI

| Provider | Models | Auth |
|----------|--------|------|
| 🦙 **Ollama** (local) | Any model you pull (llama3.2, codellama, etc.) | None needed |
| 🟢 **OpenAI** | GPT-4o, GPT-4o-mini, o1, etc. | API key |
| 🟠 **Anthropic** | Claude Sonnet 4, Claude 3.5 Haiku, etc. | API key |
| 🔵 **Google Gemini** | Gemini 2.5 Pro, Gemini 2.5 Flash, etc. | API key |

### ⚡ Full Feature Set

| Feature | Deyad | dyad.sh | Base44 |
|---------|-------|---------|--------|
| Local AI (Ollama) | ✅ | ✅ | ❌ |
| Cloud AI (OpenAI, Anthropic, Google) | ✅ | ✅ | ✅ |
| Open source | ✅ | ✅ | ❌ |
| Desktop app | ✅ | ✅ | ❌ |
| Full-stack (React + Express + MySQL) | ✅ | Supabase | Managed |
| Git version control | ✅ Auto | Manual | ❌ |
| Project import | ✅ | ✅ | ❌ |
| Template library | ✅ | ✅ | ✅ |
| Export as ZIP | ✅ | ✅ | ❌ |
| Works offline | ✅ | Partial | ❌ |
| $0 with local models | ✅ | ✅ | ❌ |

---

## Features

- 🧠 **Multi-provider AI** — Ollama, OpenAI, Anthropic, Google Gemini — switch freely
- ⚡ **Frontend apps** — React + Vite scaffolded instantly
- 🗄️ **Full-stack apps** — React + Express + MySQL (Docker) + Prisma, one click
- 💬 **Chat to build** — describe your app, get working code with streaming
- 📁 **File editor** — view, edit, search generated files in-app
- 👁 **Live preview** — built-in dev server with iframe preview
- 🐳 **DB management** — Start/Stop your MySQL container from inside the app
- 📦 **Export as ZIP** — download your project as an archive
- ↩️ **Undo / Revert** — revert to before the last AI generation
- 🔀 **Git auto-commit** — every AI generation is versioned automatically
- 📂 **Import projects** — bring existing codebases into Deyad
- 🎨 **Templates** — start from Todo, Dashboard, Landing Page, Chat UI, Blog, E-commerce
- ⚙️ **Configurable** — Ollama host, default model, API keys all in Settings

## Stack (full-stack mode)

| Layer    | Technology                            |
|----------|---------------------------------------|
| Frontend | React 18 + Vite + TypeScript          |
| Backend  | Node.js + Express + TypeScript        |
| Database | **MySQL 8** via Docker Compose         |
| ORM      | **Prisma** (schema → type-safe client) |

## Requirements

| Requirement | Why |
|-------------|-----|
| [Node.js ≥ 18](https://nodejs.org) | Run the app |
| [Ollama](https://ollama.ai) *(or cloud API key)* | Powers AI chat |
| [Docker](https://docker.com) *(optional)* | Full-stack MySQL support |
| [Git](https://git-scm.com) *(optional)* | Auto version control |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start Deyad
npm start

# 3. In Settings, choose your AI provider:
#    - Ollama (local): make sure ollama is running with `ollama pull llama3.2`
#    - OpenAI/Anthropic/Google: paste your API key
```

## Usage

1. Click **+ New App** (or 📂 to import an existing project)
2. Pick a **template** or start blank
3. Choose **Frontend Only** (React + Vite) or **Full Stack** (adds MySQL + Express + Prisma)
4. Chat with your chosen AI model to describe what you want to build
5. Deyad generates the files, writes them to disk, and auto-commits via Git
6. For full-stack apps, click **▶ Start DB** to spin up MySQL via Docker Compose

### Full-stack workflow

```bash
# After Deyad generates the scaffold:

# Start MySQL (or click "Start DB" in-app)
docker compose up -d

# Set up backend
cd backend && npm install
npx prisma db push   # applies Prisma schema to MySQL
npm run dev          # http://localhost:3001

# Start frontend
cd ../frontend && npm install
npm run dev          # http://localhost:5173
```

## Development

```bash
npm start      # start Electron app
npm test       # run unit tests (vitest)
npm run lint   # lint TypeScript files
```

## License

MIT
