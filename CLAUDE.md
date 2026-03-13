# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies, generate Prisma client, run migrations
npm run setup

# Development server (Turbopack)
npm run dev

# Build for production
npm run build

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Lint
npm run lint

# Reset database
npm run db:reset
```

The dev server requires `NODE_OPTIONS='--require ./node-compat.cjs'` (already included in npm scripts) due to Node.js compatibility shims.

## Architecture

This is an AI-powered React component generator. Users describe components in chat; Claude generates them in a virtual file system with live preview.

### Data Flow

1. User submits prompt in `ChatInterface` → `ChatProvider` sends to `/api/chat` with serialized virtual file system state
2. `/api/chat/route.ts` calls Claude via Vercel AI SDK `streamText` with two tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete)
3. Tool calls update the `FileSystemContext` (in-memory virtual FS, no disk writes)
4. `PreviewFrame` transpiles the virtual files via Babel (`jsx-transformer.ts`) and renders in a sandboxed iframe using an import map
5. On stream completion, the project (messages + file system) is saved to SQLite via Prisma

### Key Modules

- **`src/lib/file-system.ts`** — `VirtualFileSystem` class: Map-based in-memory storage with serialization for DB persistence
- **`src/lib/contexts/file-system-context.tsx`** — React context wrapping `VirtualFileSystem`; source of truth for all file state
- **`src/lib/contexts/chat-context.tsx`** — Wraps Vercel AI SDK `useChat`; manages streaming and project persistence
- **`src/lib/transform/jsx-transformer.ts`** — Babel standalone transpilation + ESM import map generation for the preview iframe
- **`src/lib/provider.ts`** — Returns `anthropic('claude-sonnet-4-5')` if `ANTHROPIC_API_KEY` is set, otherwise falls back to `MockLanguageModel` that returns a static component
- **`src/lib/prompts/generation.tsx`** — System prompt instructing Claude how to generate components using the tool-call API
- **`src/lib/auth.ts`** — JWT auth with HTTPOnly cookies (7-day TTL); supports anonymous projects (no `userId` required)
- **`src/app/api/chat/route.ts`** — Streaming POST endpoint; deserializes file system from request, runs tool calls, streams back, saves project in `onFinish`
- **`src/components/preview/PreviewFrame.tsx`** — Detects entry point (`App.tsx`, `App.jsx`, `index.tsx`, etc.), transpiles, renders in iframe sandbox

### Database

Prisma with SQLite. Two models:
- `User` — optional (supports anonymous projects)
- `Project` — stores `messages` (JSON) and `data` (serialized virtual FS JSON); `userId` is nullable

### Auth

JWT stored in HTTPOnly cookie. `src/middleware.ts` protects routes. Anonymous sessions are tracked via `src/lib/anon-work-tracker.ts`. Auth UI is in `src/components/auth/`.

### Testing

Vitest with jsdom + React Testing Library. Tests are colocated in `__tests__/` subdirectories next to the components they test.
