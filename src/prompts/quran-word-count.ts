import type { PromptDefinition, PromptMessage } from '../types.js';

export function getWordCountPromptDefinition(): PromptDefinition {
  return {
    name: 'quran-word-count',
    description:
      'Guide for correctly counting word occurrences in the Quran. Encodes counting conventions: basmala exclusion, grammar-aware variant counting, and efficient SQL queries.',
    arguments: [
      {
        name: 'word',
        description: 'Arabic word to count (e.g. الله, رحمن, يوم)',
        required: true,
      },
      {
        name: 'surah',
        description: 'Optional: limit count to a specific surah (1-114)',
        required: false,
      },
    ],
  };
}

export function handleWordCountPrompt(args: Record<string, string>): { messages: PromptMessage[] } {
  const word = args['word'] ?? '';
  const surah = args['surah'] ?? '';

  const surahFilter = surah.length > 0 ? ` in Surah ${surah}` : '';

  const text = `You are a Quranic word-counting specialist. The user wants to count occurrences of "${word}"${surahFilter} in the Quran.

## Critical Counting Rules

### Rule 1: Basmala Exclusion
Basmala (بسم الله الرحمن الرحيم) appears at the start of 113 surahs (all except Surah 9/Tevbe) as ayah_no = 0. In standard Quranic word counting:
- **EXCLUDE basmala words** (ayah_no = 0) from counts
- Exception: In Surah 1 (Fatiha), the basmala IS part of the surah as ayah 1, so it is ALREADY counted normally
- Exception: Surah 27 (Neml), ayah 30 contains a basmala within the verse text — this IS counted because it has a regular ayah number
- Always clearly state whether basmala was included or excluded

### Rule 2: Grammar-Aware Counting
Arabic words appear with attached prefixes. When counting a word, you must decide:
- **Exact form only**: Count only the exact spelling (e.g. only "الله")
- **All grammatical variants**: Count the word with all prefix combinations (الله، والله، بالله، لله، تالله، فالله، etc.)

Always ask or clarify which approach is used. For most research purposes, **all variants** is the standard approach.

### Rule 3: Efficient Counting Strategy
Use **quran_query** for counts instead of fetching all results:

**For exact word count (excluding basmala):**
\`\`\`
quran_query({
  query: "SELECT COUNT(*) as count FROM words WHERE word_text = ? AND ayah_no > 0",
  params: ["${word}"]
})
\`\`\`

**For grammar-aware count, first use quran_grammar_search to identify all variants, then count via SQL:**
\`\`\`
quran_grammar_search({ query: "${word}", include_basmala: false })
\`\`\`
This returns totalCount and grouped statistics directly.

**For count per surah distribution:**
\`\`\`
quran_query({
  query: "SELECT w.surah_no, s.name_ar, COUNT(*) as count FROM words w JOIN surahs s ON w.surah_no = s.surah_no WHERE w.word_text = ? AND w.ayah_no > 0 GROUP BY w.surah_no ORDER BY count DESC",
  params: ["${word}"]
})
\`\`\`

## Step-by-Step Procedure

1. **Use quran_grammar_search** with query="${word}" and include_basmala=false${surah.length > 0 ? ` and surah=${surah}` : ''} to get the complete grammar-aware count with all prefix variants grouped by category
2. **Report the total count** and the breakdown by grammar category (exact, conjunction, preposition, definite, etc.)
3. If the user wants just the exact form count, use quran_query with the exact word SQL
4. **Always state**: "Besmele hariç tutularak sayıldı" (Counted excluding basmala)

## Common Word Count References

These are well-known counts for verification (excluding basmala, all grammar variants):
- الله (Allah): ~2698 occurrences
- رب (Rabb): ~970 occurrences
- If your count differs significantly from known values, double-check your query

## Output Format

Present results as:
1. Total count (with convention stated)
2. Breakdown by grammar category if variant counting was used
3. Top surahs by occurrence count (optional, useful for distribution analysis)`;

  return {
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
