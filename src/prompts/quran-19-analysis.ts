import type { PromptDefinition, PromptMessage } from '../types.js';

export function get19AnalysisPromptDefinition(): PromptDefinition {
  return {
    name: 'quran-19-analysis',
    description:
      'Guide for analyzing mathematical patterns based on the number 19 in the Quran. Covers letter counts in Mukattaa surahs, word/verse abjad divisibility, and systematic verification methods.',
    arguments: [
      {
        name: 'scope',
        description: 'Analysis scope: "mukattaat" for initial letter analysis, "abjad" for numerical value patterns, "structure" for structural patterns, or "custom" for specific queries',
        required: true,
      },
      {
        name: 'surah',
        description: 'Optional: specific surah number to analyze (1-114)',
        required: false,
      },
    ],
  };
}

export function handle19AnalysisPrompt(args: Record<string, string>): { messages: PromptMessage[] } {
  const scope = args['scope'] ?? 'mukattaat';
  const surah = args['surah'] ?? '';

  const surahNote = surah.length > 0 ? `\nFocus on Surah ${surah}.` : '';

  const text = `You are an expert in the mathematical structure of the Quran, specifically the number 19 pattern (Kuran'ın 19 Mucizesi). The user wants a ${scope} analysis.${surahNote}

## Foundation: Surah 74:30

"Over it are Nineteen" (عَلَيْهَا تِسْعَةَ عَشَرَ) — Al-Muddaththir 74:30

This verse is the basis for examining 19-based patterns throughout the Quran.

## Critical Rules

### Rule 1: Basmala Exclusion
**Always exclude basmala** (ayah_no > 0) in all counts. The basmala itself (بسم الله الرحمن الرحيم) has 19 letters — this is a separate, well-known fact, not to be double-counted in surah-level analysis.

### Rule 2: Verification Over Claim
Always **verify** patterns with actual data. Do not assume a count is divisible by 19 — query the database and calculate. Present both the count and the division result (count ÷ 19 = quotient with remainder).

### Rule 3: Transparent Methodology
Always state exactly what was counted and how. Ambiguity in counting methods is the most common source of disputed claims.

## Huruf al-Muqattaat (Mukattaa Harfleri) & 19

The 29 surahs with mysterious initial letters are the primary domain for 19-pattern research:

| Harf(ler) | Sureler | Analiz Edilecek Harfler |
|-----------|---------|------------------------|
| الم | 2, 3, 29, 30, 31, 32 | ا، ل، م |
| الر | 10, 11, 12, 14, 15 | ا، ل، ر |
| المص | 7 | ا، ل، م، ص |
| المر | 13 | ا، ل، م، ر |
| كهيعص | 19 | ك، ه، ي، ع، ص |
| طه | 20 | ط، ه |
| طسم | 26, 28 | ط، س، م |
| طس | 27 | ط، س |
| يس | 36 | ي، س |
| ص | 38 | ص |
| حم | 40, 41, 43, 44, 45, 46 | ح، م |
| حم عسق | 42 | ح، م، ع، س، ق |
| ق | 50 | ق |
| ن | 68 | ن |

### Well-Known 19 Patterns (for verification):
- ق (Qaf) in Surah 50: 57 = 19 × 3
- ن (Nun) in Surah 68: reported as 133 = 19 × 7
- ي + س (Ya + Sin) in Surah 36: reported as 285 = 19 × 15
- ح + م (Ha + Mim) in each Ha-Mim surah: check individually

## Analysis Queries

### Mukattaa Letter Count in a Surah
\`\`\`
quran_query({
  query: "SELECT letter_char, COUNT(*) as count FROM letters WHERE surah_no = ? AND letter_char IN (?, ?) AND ayah_no > 0 GROUP BY letter_char",
  params: [surah_number, "letter1", "letter2"]
})
\`\`\`

### Combined Mukattaa Letter Total
\`\`\`
quran_query({
  query: "SELECT COUNT(*) as total FROM letters WHERE surah_no = ? AND letter_char IN (?, ?) AND ayah_no > 0",
  params: [surah_number, "letter1", "letter2"]
})
\`\`\`

### Verse Abjad Values Divisible by 19
\`\`\`
quran_query({
  query: "WITH v AS (SELECT surah_no, ayah_no, SUM(total_abjad) as abjad FROM words WHERE ayah_no > 0 GROUP BY surah_no, ayah_no) SELECT * FROM v WHERE abjad % 19 = 0 AND surah_no = ?",
  params: [surah_number]
})
\`\`\`

### Word Count per Surah (19-divisibility check)
\`\`\`
quran_query({
  query: "SELECT surah_no, COUNT(*) as word_count, COUNT(*) % 19 as remainder FROM words WHERE ayah_no > 0 GROUP BY surah_no HAVING COUNT(*) % 19 = 0"
})
\`\`\`

### Structural Patterns
\`\`\`
quran_query({
  query: "SELECT surah_no, ayah_count, word_count, letter_count, word_count % 19 as word_rem, letter_count % 19 as letter_rem FROM surahs WHERE word_count % 19 = 0 OR letter_count % 19 = 0"
})
\`\`\`

## Step-by-Step Procedure

1. **Identify the scope**: Mukattaa letters, abjad values, or structural patterns
2. **Determine the surah(s)** to analyze
3. **Run the appropriate query** via quran_query or quran_letter_stats
4. **Calculate 19-divisibility**: count ÷ 19 = quotient (remainder)
5. **Report transparently**: show exact counts, division results, and methodology
6. **Cross-reference**: compare with known published values
7. State: "Besmele hariç tutularak sayıldı"

## Output Format

Present results as:
| Analiz | Sayı | ÷ 19 | Kalan | Sonuç |
|--------|------|-------|-------|-------|
| ق harfi (Sure 50) | 57 | 3 | 0 | ✓ 19 × 3 |

Always include:
- Exact methodology description
- Raw count values
- Division calculation
- Whether the pattern holds or not (report negative results too)`;

  return {
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
