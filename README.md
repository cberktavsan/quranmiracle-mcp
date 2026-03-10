# @quranmiracle/mcp

Remote MCP server for Quranic linguistic data — 77,851 words, 324,646 letters, 114 surahs with grammar-aware search, ebced calculations, and root analysis.

Built on the [Model Context Protocol](https://modelcontextprotocol.io), this server gives AI applications direct access to a comprehensive Quranic database with Arabic morphological analysis, abjad (ebced) numerology, and grammar-aware search that handles the Arabic prefix system. Deployed as a remote HTTP server with OAuth 2.1 authentication.

## Quick Start

This is a remote MCP server. Point your MCP client to the deployed URL:

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "qurandb": {
      "url": "https://your-deployed-url.vercel.app/mcp"
    }
  }
}
```

### Cursor

Go to **Settings > MCP Servers > Add**:

```json
{
  "mcpServers": {
    "qurandb": {
      "url": "https://your-deployed-url.vercel.app/mcp"
    }
  }
}
```

The OAuth 2.1 flow is handled automatically by MCP clients — dynamic client registration, authorization, and token exchange happen transparently.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Secret key for signing JWT tokens (HMAC-HS256) |
| `AUTH_ISSUER_URL` | Yes | Public URL of the server (e.g. `https://your-app.vercel.app`) |
| `PORT` | No | Server port (default: `3000`, managed by Vercel in production) |

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

- **"How many times does the word الله appear in the Quran?"** — Uses `quran_grammar_search` to find all prefix variants of Allah and returns grouped counts.

- **"Analyze verse 2:255 (Ayat al-Kursi)"** — Uses `quran_get_verse` with surah=2, ayah=255 to retrieve full word-by-word linguistic data.

- **"Find words whose ebced value is a multiple of 19"** — Uses `quran_ebced_search` with `only_19: true` to find words whose abjad values are multiples of 19.

- **"Show all words derived from the root ر-ح-م"** — Uses `quran_get_root_words` with root="رحم" to retrieve all words derived from the r-H-m root (mercy).

## Deployment

The server is configured for [Vercel](https://vercel.com) deployment. The `vercel.json` routes all requests to `api/index.ts`, which re-exports the Express app.

```bash
# Set required environment variables in Vercel dashboard:
# AUTH_SECRET, AUTH_ISSUER_URL
vercel deploy
```

The SQLite database (`data/qurandb.sqlite`) is bundled with the deployment via the `includeFiles` config in `vercel.json`.

## Building from Source

```bash
git clone https://github.com/berktavsan/quranmiracle-mcp.git
cd quranmiracle-mcp
npm install
npm run build:db  # Creates SQLite from compressed JSON sources in data/
npm run build     # Compiles TypeScript to dist/index.js
```

The `build:db` script decompresses `data/words.json.gz` and `data/letters.json.gz` to create the SQLite database at `data/qurandb.sqlite`.

### Development

```bash
# Set environment variables
export AUTH_SECRET="your-dev-secret"
export AUTH_ISSUER_URL="http://localhost:3000"

npm run dev  # Runs the server on port 3000 via tsx
```

## License

MIT
