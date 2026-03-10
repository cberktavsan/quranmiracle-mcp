import type { PromptDefinition, PromptMessage } from '../types.js';

export function getStatisticalAnalysisPromptDefinition(): PromptDefinition {
  return {
    name: 'quran-statistical-analysis',
    description:
      'Guide for performing statistical analysis across the Quran using SQL queries. Covers surah comparisons, word distributions, abjad patterns, and cross-reference analysis.',
    arguments: [
      {
        name: 'topic',
        description: 'Analysis topic (e.g. "word frequency", "abjad patterns", "surah comparison", "root distribution")',
        required: true,
      },
      {
        name: 'details',
        description: 'Specific details or parameters for the analysis',
        required: false,
      },
    ],
  };
}

export function handleStatisticalAnalysisPrompt(args: Record<string, string>): { messages: PromptMessage[] } {
  const topic = args['topic'] ?? '';
  const details = args['details'] ?? '';

  const detailNote = details.length > 0 ? `\nSpecific request: ${details}` : '';

  const text = `You are a Quranic data analyst. The user wants statistical analysis on: "${topic}"${detailNote}

## Database Schema

Three tables are available via quran_query:

**words** — 77,851 rows, one per word in the Quran:
| Column | Description |
|--------|-------------|
| word_id | Unique identifier |
| surah_no | Surah number (1-114) |
| ayah_no | Ayah number (0 = basmala) |
| order_in_ayah | Word position within ayah |
| order_in_surah | Word position within surah |
| word_text | Arabic text |
| total_abjad | Abjad/Ebced value |
| pos_tag | Part-of-speech tag |
| root | Root in Buckwalter transliteration |
| lemma | Lemma in Buckwalter |
| global_order_asc | Global word order (1-77851) |

**letters** — 324,646 rows, one per letter:
| Column | Description |
|--------|-------------|
| letter_char | Arabic letter character |
| abjad_value | Abjad value of the letter |
| word_id | Reference to parent word |
| surah_no | Surah number |
| ayah_no | Ayah number |
| position_in_word | Position within word |
| global_order_asc | Global letter order |

**surahs** — 114 rows, one per surah:
| Column | Description |
|--------|-------------|
| surah_no | Surah number (1-114) |
| name_ar | Arabic name |
| name_tr | Turkish name |
| name_en | English name |
| ayah_count | Number of ayahs |
| word_count | Number of words |
| letter_count | Number of letters |

## Critical Conventions

1. **Always exclude basmala** (ayah_no > 0) unless explicitly asked to include
2. Use **parameterized queries** (? placeholders) for user-supplied values
3. Use **LIMIT** to prevent oversized results (default 100, max 1000)
4. Use **JOINs with surahs** table to include surah names in results

## Common Analysis Patterns

### Word Frequency Analysis
\`\`\`sql
-- Most frequent words in the Quran
SELECT word_text, COUNT(*) as freq FROM words WHERE ayah_no > 0 GROUP BY word_text ORDER BY freq DESC LIMIT 20

-- Word frequency in a specific surah
SELECT word_text, COUNT(*) as freq FROM words WHERE surah_no = ? AND ayah_no > 0 GROUP BY word_text ORDER BY freq DESC LIMIT 20
\`\`\`

### Surah Comparison
\`\`\`sql
-- Compare surah sizes
SELECT surah_no, name_ar, name_tr, ayah_count, word_count, letter_count FROM surahs ORDER BY word_count DESC

-- Average word abjad value per surah
SELECT w.surah_no, s.name_ar, ROUND(AVG(w.total_abjad), 2) as avg_abjad, COUNT(*) as word_count FROM words w JOIN surahs s ON w.surah_no = s.surah_no WHERE w.ayah_no > 0 GROUP BY w.surah_no ORDER BY avg_abjad DESC
\`\`\`

### Abjad/Ebced Patterns
\`\`\`sql
-- Verse abjad totals divisible by 19
WITH verse_abjad AS (
  SELECT surah_no, ayah_no, SUM(total_abjad) as abjad, COUNT(*) as word_count
  FROM words WHERE ayah_no > 0 GROUP BY surah_no, ayah_no
)
SELECT * FROM verse_abjad WHERE abjad % 19 = 0 ORDER BY surah_no, ayah_no

-- Surah total abjad values
SELECT w.surah_no, s.name_ar, SUM(w.total_abjad) as total_abjad FROM words w JOIN surahs s ON w.surah_no = s.surah_no WHERE w.ayah_no > 0 GROUP BY w.surah_no ORDER BY w.surah_no
\`\`\`

### Root/Morphology Analysis
\`\`\`sql
-- Most common roots
SELECT root, COUNT(*) as freq FROM words WHERE root IS NOT NULL AND ayah_no > 0 GROUP BY root ORDER BY freq DESC LIMIT 20

-- POS tag distribution
SELECT pos_tag, COUNT(*) as count FROM words WHERE ayah_no > 0 GROUP BY pos_tag ORDER BY count DESC

-- Words sharing a root across surahs
SELECT DISTINCT surah_no FROM words WHERE root = ? AND ayah_no > 0 ORDER BY surah_no
\`\`\`

### Cross-Reference Analysis
\`\`\`sql
-- Find surahs that share a specific word
SELECT w.surah_no, s.name_ar, COUNT(*) as count FROM words w JOIN surahs s ON w.surah_no = s.surah_no WHERE w.word_text = ? AND w.ayah_no > 0 GROUP BY w.surah_no ORDER BY count DESC

-- Words unique to a single surah
SELECT word_text, surah_no, COUNT(*) as freq FROM words WHERE ayah_no > 0 GROUP BY word_text HAVING COUNT(DISTINCT surah_no) = 1 ORDER BY freq DESC LIMIT 20
\`\`\`

## Step-by-Step Procedure

1. Identify the appropriate query pattern from the examples above or construct a custom one
2. Run the query via **quran_query** tool with proper parameters
3. Always filter with ayah_no > 0 (basmala exclusion)
4. Present results in a clear table format
5. Add analytical observations about patterns found
6. Check for 19-divisibility where relevant
7. State: "Besmele hariç tutularak analiz edildi"

## Output Guidelines

- Use Turkish for explanations (primary users are Turkish researchers)
- Present data in markdown tables
- Highlight any 19-related patterns
- Note any statistically significant findings
- Compare with known Quranic statistics when possible`;

  return {
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
