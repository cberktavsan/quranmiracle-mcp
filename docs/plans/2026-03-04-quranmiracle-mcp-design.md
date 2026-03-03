# @quranmiracle/mcp — Design Document

## Overview

MCP (Model Context Protocol) server that exposes the QuranDB database (77,851 words + 324,646 letters + 114 surahs) to AI applications via STDIO transport. Published as `@quranmiracle/mcp` on npm with an embedded SQLite database.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Package name | `@quranmiracle/mcp` | User preference |
| Language | TypeScript | Consistent with QuranDB codebase |
| Data strategy | Embedded SQLite in npm package | No internet dependency, single `npx` command |
| SQLite library | better-sqlite3 | Synchronous API fits MCP STDIO perfectly |
| Transport | STDIO | Standard for local MCP servers |
| License | MIT | Maximum openness |
| Tables | words + letters + surahs | User requirement: both words and letters |
| Bundler | tsup | Fast, simple, ESM+CJS output |

## Architecture

```
Claude/Cursor ──STDIO──> MCP Server ──> better-sqlite3 ──> qurandb.sqlite (embedded)
```

### Project Structure

```
quranmiracle-mcp/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── LICENSE                         # MIT
├── README.md
├── src/
│   ├── index.ts                    # MCP server entry + STDIO transport
│   ├── db.ts                       # SQLite connection (better-sqlite3)
│   ├── tools/
│   │   ├── index.ts                # Tool registry
│   │   ├── search.ts               # quran_search, quran_grammar_search
│   │   ├── verse.ts                # quran_get_verse, quran_get_surah
│   │   ├── ebced.ts                # quran_ebced_search
│   │   ├── stats.ts                # quran_letter_stats, quran_stats
│   │   └── root.ts                 # quran_get_root_words
│   ├── prompts/
│   │   ├── index.ts                # Prompt registry
│   │   ├── quran-search.ts         # Grammar-aware search prompt
│   │   ├── quran-analyze-verse.ts  # Verse analysis prompt
│   │   ├── quran-ebced.ts          # Ebced calculation prompt
│   │   └── quran-root-analysis.ts  # Root analysis prompt
│   ├── lib/
│   │   ├── arabic-grammar.ts       # Prefix analysis & variant generation
│   │   ├── transliterate.ts        # Buckwalter conversion
│   │   └── constants.ts            # Ebced values, surah names
│   └── types.ts                    # Type definitions
├── scripts/
│   └── build-db.ts                 # JSON → SQLite converter
└── data/
    ├── words.json                  # Source (gitignored)
    ├── letters.json                # Source (gitignored)
    └── qurandb.sqlite              # Build artifact (published to npm)
```

## MCP Tools (7)

| Tool | Description | Parameters |
|------|-------------|------------|
| `quran_search` | Word/root/lemma search | `query`, `type` (word/root/lemma), `surah?`, `limit?` |
| `quran_grammar_search` | Grammar-aware search with prefix variants | `query`, `surah?`, `include_basmala?` |
| `quran_get_verse` | Get verse with all words and linguistic data | `surah`, `ayah` |
| `quran_get_surah` | Get surah metadata and statistics | `surah` |
| `quran_ebced_search` | Search by abjad numerical value | `value?`, `min?`, `max?`, `surah?`, `only_19?` |
| `quran_letter_stats` | Letter frequency statistics | `surah?`, `letters?[]`, `include_basmala?` |
| `quran_get_root_words` | Get all words derived from a root | `root` |

## MCP Prompts (4)

| Prompt | Description | Arguments |
|--------|-------------|-----------|
| `quran-search` | Grammar-aware search guide with prefix rules | `query` (required) |
| `quran-analyze-verse` | Verse linguistic analysis guide | `surah` + `ayah` (required) |
| `quran-ebced` | Ebced calculation rules and letter table | `text` (optional) |
| `quran-root-analysis` | Root derivation analysis guide | `root` (required) |

Each prompt injects grammar rules and search strategy BEFORE tool calls, ensuring correct results.

## SQLite Schema

```sql
CREATE TABLE words (
  word_id TEXT PRIMARY KEY,
  surah_no INTEGER NOT NULL,
  ayah_no INTEGER NOT NULL,
  order_in_ayah INTEGER NOT NULL,
  order_in_surah INTEGER NOT NULL,
  word_text TEXT NOT NULL,
  total_abjad INTEGER NOT NULL,
  pos_tag TEXT,
  root TEXT,
  lemma TEXT,
  global_order_asc INTEGER NOT NULL,
  global_order_desc INTEGER NOT NULL
);

CREATE TABLE letters (
  letter_char TEXT NOT NULL,
  abjad_value INTEGER NOT NULL,
  word_id TEXT NOT NULL,
  surah_no INTEGER NOT NULL,
  ayah_no INTEGER NOT NULL,
  position_in_word INTEGER NOT NULL,
  global_order_asc INTEGER NOT NULL
);

CREATE TABLE surahs (
  surah_no INTEGER PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_tr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  ayah_count INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  letter_count INTEGER NOT NULL
);

CREATE INDEX idx_words_surah ON words(surah_no, ayah_no);
CREATE INDEX idx_words_text ON words(word_text);
CREATE INDEX idx_words_root ON words(root);
CREATE INDEX idx_words_lemma ON words(lemma);
CREATE INDEX idx_words_abjad ON words(total_abjad);
CREATE INDEX idx_words_global ON words(global_order_asc);
CREATE INDEX idx_letters_surah ON letters(surah_no, ayah_no);
CREATE INDEX idx_letters_char ON letters(letter_char);
CREATE INDEX idx_letters_word ON letters(word_id);
```

## Ported Modules (QuranDB → MCP)

| Source (QuranDB) | Target (MCP) | Changes |
|------------------|--------------|---------|
| `lib/arabic-grammar.ts` | `src/lib/arabic-grammar.ts` | Remove Next.js type imports, self-contained |
| `lib/transliterate.ts` | `src/lib/transliterate.ts` | Only `arabicToBuckwalter` + `containsArabic` |
| `lib/constants.ts` | `src/lib/constants.ts` | Ebced table + surah names (TR/EN/AR) |
| `lib/db/search.ts` logic | `src/tools/search.ts` | pg → better-sqlite3 (sync) |
| `lib/db/stats.ts` logic | `src/tools/stats.ts` | pg → better-sqlite3 (sync) |
| `lib/db/ebced.ts` logic | `src/tools/ebced.ts` | pg → better-sqlite3 (sync) |

## User Experience

### Installation
```json
{
  "mcpServers": {
    "qurandb": {
      "command": "npx",
      "args": ["@quranmiracle/mcp"]
    }
  }
}
```

### Usage
User asks Claude: "Kuran'da الله kelimesi kaç kez geçiyor?"
1. Claude calls `quran_grammar_search` with query "الله"
2. MCP server generates all prefix variants (الله, والله, بالله, تالله, لله, ...)
3. Returns 2698 results grouped by grammar category
4. Claude presents the answer with breakdown

## Build Pipeline

```
1. npm run build:db    → scripts/build-db.ts → data/qurandb.sqlite
2. npm run build       → tsup → dist/index.js
3. npm publish         → dist/ + data/qurandb.sqlite
```
