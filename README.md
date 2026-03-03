# @quranmiracle/mcp

MCP server for Quranic linguistic data — 77,851 words, 324,646 letters, 114 surahs with grammar-aware search, ebced calculations, and root analysis.

Built on the [Model Context Protocol](https://modelcontextprotocol.io), this server gives AI applications direct access to a comprehensive Quranic database with Arabic morphological analysis, abjad (ebced) numerology, and grammar-aware search that handles the Arabic prefix system.

## Quick Start

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

### Cursor

Go to **Settings > MCP Servers > Add** and use the same configuration:

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

The server runs over STDIO transport and requires no API keys or external services — the SQLite database is bundled with the package.

## Available Tools (7)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `quran_search` | Search words by text, root, or lemma | `query`, `type` (word/root/lemma), `surah?`, `limit?` |
| `quran_grammar_search` | Grammar-aware search with Arabic prefix analysis | `query`, `surah?`, `include_basmala?` |
| `quran_get_verse` | Get verse with all words and linguistic data | `surah`, `ayah` |
| `quran_get_surah` | Get surah metadata and statistics | `surah` |
| `quran_ebced_search` | Search by abjad numerical value | `value?`, `min?`, `max?`, `surah?`, `only_19?` |
| `quran_letter_stats` | Letter frequency statistics | `surah?`, `letters?[]`, `include_basmala?` |
| `quran_get_root_words` | Get all words derived from a root | `root` |

### Grammar-Aware Search

The `quran_grammar_search` tool handles the Arabic prefix system automatically. When you search for a word like **الله**, it finds all prefix variants:

- **الله** (exact) — 2,255 occurrences
- **والله** (wa + Allah) — conjunction "and"
- **بالله** (bi + Allah) — preposition "with/by"
- **لله** (li + Allah) — preposition "for" (lam merges with al-)
- **تالله** (ta + Allah) — oath marker
- **فالله** (fa + Allah) — conjunction "then/so"

Results are grouped by grammar category with counts for each prefix type.

### Ebced (Abjad) Search

The `quran_ebced_search` tool searches by numerical value using the traditional abjad letter-number system (alif=1, ba=2, ... ghayn=1000). Supports exact value, range, and multiples-of-19 filtering for both individual words and entire verses.

## Available Prompts (4)

| Prompt | Description | Arguments |
|--------|-------------|-----------|
| `quran-search` | Grammar-aware search guide | `query` (required) |
| `quran-analyze-verse` | Verse linguistic analysis guide | `surah` + `ayah` (required) |
| `quran-ebced` | Ebced calculation rules | `text` (optional) |
| `quran-root-analysis` | Root derivation analysis | `root` (required) |

Prompts provide structured instructions to the AI model, teaching it how to use the tools effectively with domain-specific knowledge about Arabic morphology, abjad numerology, and Quranic linguistics.

## Database Statistics

| Metric | Count |
|--------|-------|
| Words | 77,851 (with POS tags, roots, lemmas, ebced values) |
| Letters | 324,646 (with individual abjad values) |
| Surahs | 114 (Arabic, Turkish, English names) |
| Verses | 6,236 |

Each word record includes: Arabic text, surah/ayah location, position in verse, root (Buckwalter), lemma (Buckwalter), POS tag, and abjad value. The letter table stores each individual letter with its position and abjad value.

## Example Scenarios

These are common use cases in Turkish, reflecting the primary user base:

- **"Kuran'da الله kelimesi kac kez geciyor?"** — Uses `quran_grammar_search` to find all prefix variants of Allah and returns grouped counts.

- **"Bakara suresi 255. ayet (Ayetel Kursi) analiz et"** — Uses `quran_get_verse` with surah=2, ayah=255 to retrieve full word-by-word linguistic data.

- **"Ebced degeri 19'un kati olan kelimeler"** — Uses `quran_ebced_search` with `only_19: true` to find words whose abjad values are multiples of 19.

- **"ر-ح-م kokunden tureyen kelimeler"** — Uses `quran_get_root_words` with root="رحم" to retrieve all words derived from the r-H-m root (mercy).

## Building from Source

```bash
git clone https://github.com/berktavsan/quranmiracle-mcp.git
cd quranmiracle-mcp
npm install
npm run build:db  # Requires words.json and letters.json in data/
npm run build
```

The `build:db` script reads `data/words.json` and `data/letters.json` to create the SQLite database at `data/qurandb.sqlite`. The `build` script compiles TypeScript to `dist/index.js` using tsup.

### Development

```bash
npm run dev  # Runs the server directly via tsx
```

## License

MIT
