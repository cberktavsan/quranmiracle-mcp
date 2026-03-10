# CLAUDE.md

## Project Overview

`@quranmiracle/mcp` — MCP (Model Context Protocol) server for Quranic linguistic data. Provides 7 tools and 4 prompts for grammar-aware search, ebced (abjad) calculations, and root/morphological analysis over 77,851 words and 324,646 letters.

Deployed as a remote HTTP MCP server on Vercel with OAuth 2.1 authentication. Also supports local STDIO transport via `npx`.

## Tech Stack

- **Runtime:** Node.js 22 (ESM)
- **Language:** TypeScript (strict mode, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
- **Database:** SQLite via `better-sqlite3` (read-only, bundled)
- **Framework:** Express 5 (HTTP transport) + MCP SDK
- **Auth:** OAuth 2.1 with JWT (jose)
- **Build:** tsup (ESM output, single entry)
- **Lint:** ESLint flat config with 11 plugins (300+ rules)
- **Deploy:** Vercel (serverless, `api/index.ts` entry point)

## Project Structure

```
src/
├── index.ts          # Express app, HTTP transport, OAuth setup
├── server.ts         # MCP Server creation, request handlers
├── db.ts             # SQLite connection (singleton, read-only)
├── types.ts          # All shared TypeScript interfaces
├── auth/
│   ├── provider.ts   # JwtOAuthProvider
│   └── clients.ts    # OAuth client registry
├── tools/
│   ├── index.ts      # Tool registry (getAllTools, handleToolCall)
│   ├── search.ts     # quran_search, quran_grammar_search
│   ├── verse.ts      # quran_get_verse, quran_get_surah
│   ├── ebced.ts      # quran_ebced_search
│   ├── stats.ts      # quran_letter_stats
│   └── root.ts       # quran_get_root_words
├── prompts/
│   ├── index.ts      # Prompt registry
│   ├── quran-search.ts
│   ├── quran-analyze-verse.ts
│   ├── quran-ebced.ts
│   └── quran-root-analysis.ts
└── lib/
    ├── arabic-grammar.ts  # Arabic prefix system logic
    ├── constants.ts       # Abjad values, prefix maps
    └── transliterate.ts   # Buckwalter transliteration
api/
└── index.ts          # Vercel entry point (re-exports Express app)
data/
├── qurandb.sqlite    # Built SQLite database (gitignored source JSONs)
├── words.json.gz     # Compressed source data
└── letters.json.gz   # Compressed source data
scripts/
└── build-db.ts       # Builds SQLite from JSON source files
```

## Commands

```bash
npm run build        # Build with tsup → dist/
npm run dev          # Run server locally via tsx
npm run build:db     # Rebuild SQLite from data/*.json.gz
npm run type-check   # tsc --noEmit
npm run lint         # ESLint on src/
npm run check        # type-check + lint combined
```

## Code Conventions

- **ESM only** — all imports use `.js` extensions (TypeScript convention for ESM)
- **Readonly types** — interfaces use `readonly` on all properties
- **Strict TypeScript** — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` are all enabled
- **No `any`** — `noImplicitAny` is on; use `unknown` and narrow
- **Perfectionist sorting** — imports and object keys are auto-sorted by ESLint
- **Security-aware** — ESLint security and no-secrets plugins are active
- **Tool pattern** — each tool file exports a definition (schema) and a handler function, registered in `tools/index.ts`
- **Prompt pattern** — each prompt file exports a definition and a handler, registered in `prompts/index.ts`
- **Error handling** — tool/prompt errors return `isError: true` with JSON-stringified error messages
- **Database** — always accessed via `getDb()` singleton; never write to the database

## Domain Context

- **Ebced/Abjad:** Traditional Arabic letter-number system (alif=1, ba=2, ... ghayn=1000)
- **Grammar-aware search:** Handles Arabic prefixes (و، ب، ل، ت، ف، س، أ، ال) that attach to words
- **Root system:** Arabic words derive from 3-letter roots; roots stored in Buckwalter transliteration
- **Primary users:** Turkish-speaking researchers studying Quranic linguistics
