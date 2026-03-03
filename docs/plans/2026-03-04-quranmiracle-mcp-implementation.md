# @quranmiracle/mcp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server npm package that exposes the QuranDB database (77,851 words + 324,646 letters + 114 surahs) to AI applications via STDIO transport with grammar-aware search, ebced calculations, and educational prompts.

**Architecture:** TypeScript MCP server using better-sqlite3 for embedded SQLite database, bundled with tsup, published as `@quranmiracle/mcp`. Data files (words.json + letters.json) are converted to SQLite at build time via a build-db script. MCP tools provide read-only query access; MCP prompts inject grammar rules for correct usage.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, better-sqlite3, tsup

**Source QuranDB project:** `/Users/berktavsan/Documents/GitHub/QuranDB/`
**Target MCP project:** `/Users/berktavsan/Documents/GitHub/quranmiracle-mcp/`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `.gitignore`
- Create: `LICENSE`

**Step 1: Initialize git repo**

Run: `cd /Users/berktavsan/Documents/GitHub/quranmiracle-mcp && git init`

**Step 2: Create package.json**

```json
{
  "name": "@quranmiracle/mcp",
  "version": "0.1.0",
  "description": "MCP server for Quranic data - 77,851 words, 324,646 letters with grammar-aware search, ebced calculations, and linguistic analysis",
  "type": "module",
  "bin": {
    "quranmiracle-mcp": "dist/index.js"
  },
  "main": "dist/index.js",
  "files": [
    "dist",
    "data/qurandb.sqlite"
  ],
  "scripts": {
    "build:db": "tsx scripts/build-db.ts",
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["mcp", "quran", "arabic", "islamic", "nlp", "database", "ebced", "abjad"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "better-sqlite3": "^11.8.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^22.13.10",
    "tsup": "^8.4.0",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "scripts"]
}
```

**Step 4: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

**Step 5: Create .gitignore**

```
node_modules/
dist/
data/words.json
data/letters.json
*.tgz
```

Note: `data/qurandb.sqlite` is NOT gitignored.

**Step 6: Create LICENSE (MIT)**

Standard MIT license file.

**Step 7: Install dependencies**

Run: `cd /Users/berktavsan/Documents/GitHub/quranmiracle-mcp && npm install`

**Step 8: Commit**

```
git add -A && git commit -m "chore: scaffold project with package.json, tsconfig, tsup config"
```

---

### Task 2: Copy Data Files and Build SQLite Database

**Files:**
- Copy: `data/words.json` (from QuranDB — gitignored)
- Copy: `data/letters.json` (from QuranDB — gitignored)
- Create: `scripts/build-db.ts`

**Step 1: Copy JSON data files from QuranDB**

```
mkdir -p /Users/berktavsan/Documents/GitHub/quranmiracle-mcp/data
cp /Users/berktavsan/Documents/GitHub/QuranDB/data/words.json /Users/berktavsan/Documents/GitHub/quranmiracle-mcp/data/
cp /Users/berktavsan/Documents/GitHub/QuranDB/data/letters.json /Users/berktavsan/Documents/GitHub/quranmiracle-mcp/data/
```

**Step 2: Write scripts/build-db.ts**

This script:
1. Reads words.json (77,851 entries with fields: word_id, surah_no, ayah_no, order_in_ayah, order_in_surah, word_text, total_abjad, pos_tag, root, lemma, global_order_asc, global_order_desc)
2. Reads letters.json (324,646 entries with fields: letter_char, abjad_value, word_id, surah_no, ayah_no, position_in_word, global_order_asc)
3. Creates SQLite database with tables: words, letters, surahs
4. Aggregates surahs table from words+letters data
5. Creates all indexes
6. VACUUMs the database

Includes inline surah name data for AR/TR/EN (114 entries each). Copied from:
- AR names: from design doc `KURAN_VERITABANI_DOKUMANTASYONU.md` surah table
- TR names: from QuranDB `types/quran.ts` SURAH_NAMES_TR
- EN names: from QuranDB `types/quran.ts` SURAH_NAMES_EN

IMPORTANT: Use `console.error()` for all logging, never `console.log()`.

**Step 3: Run the build-db script**

Run: `cd /Users/berktavsan/Documents/GitHub/quranmiracle-mcp && npx tsx scripts/build-db.ts`
Expected output (on stderr): "Database built: .../data/qurandb.sqlite"

**Step 4: Verify the database**

Run a quick check: words=77851, letters=324646, surahs=114

**Step 5: Commit**

```
git add scripts/build-db.ts data/qurandb.sqlite
git commit -m "feat: add build-db script and generate SQLite database"
```

---

### Task 3: Core Library — Types, Constants, Transliteration

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/constants.ts`
- Create: `src/lib/transliterate.ts`

**Step 1: Create src/types.ts**

Essential types for MCP tools. Port from QuranDB `types/quran.ts`:

Types to include:
- `Word` — all fields from words table
- `Letter` — all fields from letters table
- `Surah` — all fields from surahs table
- `Verse` — constructed from words (surah_no, ayah_no, text, total_abjad, word_count, words[])
- `GrammarCategory` — union type: 'exact' | 'definite' | 'conjunction' | 'preposition' | 'oath' | 'question' | 'future'
- `GrammarGroupedResult` — category, count, prefix, words[]
- `LetterStat` — letter, count, abjad_value, percentage, divisible_by_19

**Step 2: Create src/lib/constants.ts**

Port from QuranDB `lib/constants.ts`:
- `ARABIC_LETTERS` array (27 letters with abjad values)
- `LETTER_TO_ABJAD` lookup map

**Step 3: Create src/lib/transliterate.ts**

Port from QuranDB `lib/transliterate.ts` — only two functions:
- `arabicToBuckwalter(text)` — converts Arabic to Buckwalter (for root search)
- `containsArabic(text)` — checks if text has Arabic chars

**Step 4: Commit**

```
git add src/types.ts src/lib/constants.ts src/lib/transliterate.ts
git commit -m "feat: add core types, constants, and transliteration utilities"
```

---

### Task 4: Arabic Grammar Library

**Files:**
- Create: `src/lib/arabic-grammar.ts`

**Step 1: Port arabic-grammar.ts from QuranDB**

Copy from `/Users/berktavsan/Documents/GitHub/QuranDB/lib/arabic-grammar.ts`.

Changes needed:
1. Change import: `import type { GrammarCategory } from '@/types/quran'` → `import type { GrammarCategory } from '../types.js'`
2. Remove re-export: `export type { GrammarCategory } from '@/types/quran'`
3. Everything else stays identical

Functions to include (all exported):
- `analyzeWord(word)` — returns baseWord, detectedPrefixes, variants
- `getVariantInfo(word, baseWord)` — returns category and prefix
- `generateVariants(baseWord)` — generates all prefix variants
- `extractBaseWord(word)` — strips prefixes to find base
- `detectPrefixes(word)` — detects prefix categories
- `categorizePrefix(prefix)` — maps prefix to category

Constants to include:
- `ARABIC_PREFIXES` — prefix definitions by category
- `DEFINITE_ARTICLE` — ال definition
- `SPECIAL_WORDS` set — الله, اللهم, huruf-u mukattaa, etc.

**Step 2: Commit**

```
git add src/lib/arabic-grammar.ts
git commit -m "feat: port Arabic grammar library with prefix analysis and variant generation"
```

---

### Task 5: Database Connection Module

**Files:**
- Create: `src/db.ts`

**Step 1: Create SQLite connection module**

Features:
- Lazy singleton: opens DB on first call to `getDb()`
- Finds `data/qurandb.sqlite` relative to current file (works for both dev `tsx` and production `dist/`)
- Opens as read-only
- Sets WAL mode and 64MB cache for performance
- `closeDb()` for graceful shutdown

IMPORTANT: Use `fileURLToPath(import.meta.url)` to resolve paths.

**Step 2: Commit**

```
git add src/db.ts
git commit -m "feat: add SQLite connection module with read-only access"
```

---

### Task 6: MCP Tools — Search & Grammar Search

**Files:**
- Create: `src/tools/search.ts`

**Step 1: Implement quran_search tool**

Parameters:
- `query` (string, required): Arabic word, root, or lemma to search
- `type` (enum: "word" | "root" | "lemma", default "word"): Search mode
- `surah` (number, optional): Filter by surah number (1-114)
- `limit` (number, optional, default 50, max 200): Result limit

Logic (ported from QuranDB `lib/db/search.ts`):
- For "root" type: convert Arabic input to Buckwalter via `arabicToBuckwalter()` before querying
- For "lemma" type: convert Arabic input to Buckwalter, use LIKE query
- For "word" type: use LIKE query on word_text
- Return words ordered by global_order_asc

**Step 2: Implement quran_grammar_search tool**

Parameters:
- `query` (string, required): Arabic word to search with grammar awareness
- `surah` (number, optional): Filter by surah
- `include_basmala` (boolean, default true): Include basmala verses

Logic (ported from QuranDB `lib/db/search.ts` searchGrammarAware):
1. Call `analyzeWord(query)` to get baseWord and all variants
2. Query `SELECT * FROM words WHERE word_text IN (variants)` with optional surah/basmala filters
3. Group results by grammar category using `getVariantInfo()`
4. Return: baseWord, totalCount, groups (by category with count + words), stats

**Step 3: Export `getSearchTools()` function**

Returns array of tool definitions (name, description, inputSchema).

**Step 4: Export `handleSearchTool(name, args)` function**

Dispatches to correct handler based on tool name.

**Step 5: Commit**

```
git add src/tools/search.ts
git commit -m "feat: add quran_search and quran_grammar_search MCP tools"
```

---

### Task 7: MCP Tools — Verse & Surah

**Files:**
- Create: `src/tools/verse.ts`

**Step 1: Implement quran_get_verse tool**

Parameters:
- `surah` (number, required): Surah number (1-114)
- `ayah` (number, required): Verse number

Logic (ported from QuranDB `lib/db/stats.ts` getAyah):
1. Query `SELECT * FROM words WHERE surah_no = ? AND ayah_no = ? ORDER BY order_in_ayah`
2. Construct verse text by joining word_text with spaces
3. Calculate total_abjad by summing word abjad values
4. Return: surah_no, ayah_no, text, total_abjad, word_count, words[]

**Step 2: Implement quran_get_surah tool**

Parameters:
- `surah` (number, required): Surah number (1-114)

Logic:
1. Query surahs table for metadata (name_ar, name_tr, name_en, ayah_count, word_count, letter_count)
2. Return surah metadata

**Step 3: Export `getVerseTools()` and `handleVerseTool(name, args)`

**Step 4: Commit**

```
git add src/tools/verse.ts
git commit -m "feat: add quran_get_verse and quran_get_surah MCP tools"
```

---

### Task 8: MCP Tools — Ebced Search

**Files:**
- Create: `src/tools/ebced.ts`

**Step 1: Implement quran_ebced_search tool**

Parameters:
- `value` (number, optional): Exact abjad value
- `min` (number, optional): Minimum abjad value
- `max` (number, optional): Maximum abjad value
- `surah` (number, optional): Filter by surah
- `only_19` (boolean, optional): Only multiples of 19
- `type` (enum: "word" | "verse", default "word"): Search words or verses
- `limit` (number, optional, default 50, max 200): Result limit

Logic (ported from QuranDB `lib/db/ebced.ts`):
- For "word" type: query words table with abjad filters
- For "verse" type: GROUP BY surah_no, ayah_no, HAVING SUM(total_abjad) matches

**Step 2: Export `getEbcedTools()` and `handleEbcedTool(name, args)`

**Step 3: Commit**

```
git add src/tools/ebced.ts
git commit -m "feat: add quran_ebced_search MCP tool"
```

---

### Task 9: MCP Tools — Stats & Root Words

**Files:**
- Create: `src/tools/stats.ts`
- Create: `src/tools/root.ts`

**Step 1: Implement quran_letter_stats tool**

Parameters:
- `surah` (number, optional): Filter by surah
- `letters` (string[], optional): Specific letters to count
- `include_basmala` (boolean, default true): Include basmala

Logic (ported from QuranDB `lib/db/stats.ts` getLetterStats):
1. Query letters table with filters
2. GROUP BY letter_char, count occurrences
3. Calculate percentage and 19 divisibility
4. Return: array of { letter, count, abjad_value, percentage, divisible_by_19 }

**Step 2: Implement quran_get_root_words tool**

Parameters:
- `root` (string, required): Arabic root (e.g. رحم) or Buckwalter (e.g. rHm)

Logic (ported from QuranDB `lib/db/search.ts` getRelatedWords):
1. Convert Arabic input to Buckwalter if needed
2. Query `SELECT * FROM words WHERE root = ? ORDER BY global_order_asc`
3. Return: total count + words array

**Step 3: Export functions for both

**Step 4: Commit**

```
git add src/tools/stats.ts src/tools/root.ts
git commit -m "feat: add quran_letter_stats and quran_get_root_words MCP tools"
```

---

### Task 10: Tool Registry

**Files:**
- Create: `src/tools/index.ts`

**Step 1: Create unified tool registry**

This file:
1. Imports all tool modules (search, verse, ebced, stats, root)
2. Exports `getAllTools()` — returns combined array of all tool definitions
3. Exports `handleToolCall(name, args)` — dispatches to correct handler based on tool name

**Step 2: Commit**

```
git add src/tools/index.ts
git commit -m "feat: add tool registry"
```

---

### Task 11: MCP Prompts

**Files:**
- Create: `src/prompts/quran-search.ts`
- Create: `src/prompts/quran-analyze-verse.ts`
- Create: `src/prompts/quran-ebced.ts`
- Create: `src/prompts/quran-root-analysis.ts`
- Create: `src/prompts/index.ts`

**Step 1: Create quran-search prompt**

Argument: `query` (required, string)

Content should include:
- Arabic prefix system explanation (و، ف، ب، ل، ت، أ، س)
- Special words that must NOT be decomposed (الله, اللهم, huruf-u mukattaa)
- Lam merging rule: ل + ال = لل
- Instruction to use `quran_grammar_search` tool with the query
- Example: "الله search returns 2698 results including الله، والله، بالله، تالله، لله etc."

**Step 2: Create quran-analyze-verse prompt**

Arguments: `surah` (required), `ayah` (required)

Content should include:
- Instruction to call `quran_get_verse` first
- POS tag reference table (N=Noun, V=Verb, PN=Proper Noun, ADJ=Adjective, PRON=Pronoun, DEM=Demonstrative, REL=Relative, P=Preposition, CONJ=Conjunction, INTG=Interrogative, NEG=Negative, EMPH=Emphatic, PART=Particle, VOC=Vocative)
- Analyze each word: root, lemma, POS, abjad value
- Note the Buckwalter format for root and lemma fields

**Step 3: Create quran-ebced prompt**

Argument: `text` (optional)

Content should include:
- Full 27-letter abjad value table
- Calculation example: الله = ا(1) + ل(30) + ل(30) + ه(5) = 66
- Mention the "19 miracle" significance
- Instruction to use `quran_ebced_search` tool

**Step 4: Create quran-root-analysis prompt**

Argument: `root` (required)

Content should include:
- Buckwalter transliteration table (Arabic ↔ Latin mapping)
- Explain that roots in the database are stored in Buckwalter format
- Arabic 3-letter root system explanation
- Instruction to use `quran_get_root_words` tool

**Step 5: Create prompt registry (index.ts)**

Exports `getAllPrompts()` and `handleGetPrompt(name, args)`.

**Step 6: Commit**

```
git add src/prompts/
git commit -m "feat: add MCP prompts for grammar search, verse analysis, ebced, and root analysis"
```

---

### Task 12: MCP Server Entry Point

**Files:**
- Create: `src/index.ts`

**Step 1: Create the MCP server**

Wire everything together:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getAllTools, handleToolCall } from './tools/index.js';
import { getAllPrompts, handleGetPrompt } from './prompts/index.js';
import { closeDb } from './db.js';
```

Server setup:
1. Create `new Server({ name: '@quranmiracle/mcp', version: '0.1.0' }, { capabilities: { tools: {}, prompts: {} } })`
2. Register `ListToolsRequestSchema` handler → `getAllTools()`
3. Register `CallToolRequestSchema` handler → `handleToolCall(name, args)`
4. Register `ListPromptsRequestSchema` handler → `getAllPrompts()`
5. Register `GetPromptRequestSchema` handler → `handleGetPrompt(name, args)`
6. Connect via `new StdioServerTransport()`
7. Handle SIGINT/SIGTERM → `closeDb()` then exit

CRITICAL: Never use `console.log()` — only `console.error()` for any debug output.

**Step 2: Build and verify**

Run: `npm run build`
Expected: `dist/index.js` with shebang header

**Step 3: Smoke test**

Send initialize JSON-RPC via stdin, verify response.

**Step 4: Commit**

```
git add src/index.ts
git commit -m "feat: add MCP server entry point with STDIO transport"
```

---

### Task 13: README

**Files:**
- Create: `README.md`

**Step 1: Write README**

Sections:
- Header: @quranmiracle/mcp
- One-line description
- Quick Start (Claude Desktop config JSON + Cursor config JSON)
- Available Tools table (7 tools with descriptions and params)
- Available Prompts table (4 prompts)
- Database Statistics
- Example Scenarios
- Building from Source
- License (MIT)

**Step 2: Commit**

```
git add README.md
git commit -m "docs: add README with installation and usage guide"
```

---

### Task 14: End-to-End Verification

**Step 1: Full clean build**

```
rm -rf dist && npm run build
```

**Step 2: Test all 7 tools via manual STDIO**

Test each tool with representative input and verify correct JSON response.

**Step 3: Verify the package structure**

Run `npm pack --dry-run` to see what would be published. Verify it includes `dist/index.js` and `data/qurandb.sqlite`.

**Step 4: Final commit**

```
git add -A && git commit -m "chore: finalize v0.1.0"
```
