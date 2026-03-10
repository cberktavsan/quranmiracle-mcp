import type { PromptDefinition, PromptMessage } from '../types.js';

export function getLetterCountPromptDefinition(): PromptDefinition {
  return {
    name: 'quran-letter-count',
    description:
      'Guide for counting letter frequencies in the Quran. Covers basmala conventions, Huruf al-Muqattaat analysis, 19-divisibility checks, and per-surah distribution.',
    arguments: [
      {
        name: 'letters',
        description: 'Arabic letters to count, comma-separated (e.g. ا,ل,م or ق or ن)',
        required: true,
      },
      {
        name: 'surah',
        description: 'Optional: limit to a specific surah (1-114)',
        required: false,
      },
    ],
  };
}

export function handleLetterCountPrompt(args: Record<string, string>): { messages: PromptMessage[] } {
  const letters = args['letters'] ?? '';
  const surah = args['surah'] ?? '';

  const letterList = letters.split(',').map((l) => l.trim()).filter((l) => l.length > 0);
  const letterDisplay = letterList.join(', ');
  const surahNote = surah.length > 0 ? ` in Surah ${surah}` : '';

  const text = `You are a specialist in Quranic letter frequency analysis. The user wants to count the letter(s) ${letterDisplay}${surahNote}.

## Critical Counting Rules

### Rule 1: Basmala Convention
- **EXCLUDE basmala** (ayah_no = 0) from letter counts by default
- Basmala letters are stored with ayah_no = 0 in all 113 surahs (except Surah 9)
- In Surah 1 (Fatiha), basmala is ayah 1, so it is counted normally
- Always state clearly: "Besmele hariç/dahil sayıldı"

### Rule 2: Huruf al-Muqattaat (Mukattaa Harfleri)
These are the mysterious disconnected letters at the start of 29 surahs. They are critically important for letter counting research:

| Letters | Surahs |
|---------|--------|
| الم | 2, 3, 29, 30, 31, 32 |
| الر | 10, 11, 12, 14, 15 |
| المص | 7 |
| المر | 13 |
| كهيعص | 19 |
| طه | 20 |
| طسم | 26, 28 |
| طس | 27 |
| يس | 36 |
| ص | 38 |
| حم | 40, 41, 43, 44, 45, 46 |
| حم عسق | 42 |
| ق | 50 |
| ن | 68 |

When counting letters from Mukattaa initials in their respective surahs, the count often reveals patterns divisible by 19 or other significant numbers.

### Rule 3: 19-Divisibility Check
Always check if the letter count is divisible by 19. This is a key research interest:
- Example: The letter ق (Qaf) in Surah 50 (Qaf) appears 57 times = 19 × 3

## Counting Methods

**Method 1: Using quran_letter_stats (recommended for single surah or full Quran)**
\`\`\`
quran_letter_stats({
  letters: [${letterList.map((l) => `"${l}"`).join(', ')}],
  ${surah.length > 0 ? `surah: ${surah},` : ''}
  include_basmala: false
})
\`\`\`

**Method 2: Using quran_query for custom aggregations**

Per-surah distribution of a letter:
\`\`\`
quran_query({
  query: "SELECT surah_no, COUNT(*) as count FROM letters WHERE letter_char = ? AND ayah_no > 0 GROUP BY surah_no ORDER BY surah_no",
  params: ["${letterList[0] ?? 'ا'}"]
})
\`\`\`

Multiple letters total in a surah:
\`\`\`
quran_query({
  query: "SELECT letter_char, COUNT(*) as count FROM letters WHERE letter_char IN (${letterList.map(() => '?').join(',')}) AND ayah_no > 0${surah.length > 0 ? ' AND surah_no = ?' : ''} GROUP BY letter_char ORDER BY count DESC",
  params: [${letterList.map((l) => `"${l}"`).join(', ')}${surah.length > 0 ? `, ${surah}` : ''}]
})
\`\`\`

Combined count of Mukattaa letters in their surah:
\`\`\`
quran_query({
  query: "SELECT SUM(count) as total FROM (SELECT COUNT(*) as count FROM letters WHERE letter_char IN (${letterList.map(() => '?').join(',')}) AND surah_no = ? AND ayah_no > 0 GROUP BY letter_char)",
  params: [${letterList.map((l) => `"${l}"`).join(', ')}${surah.length > 0 ? `, ${surah}` : ''}]
})
\`\`\`

## Step-by-Step Procedure

1. Use **quran_letter_stats** with the specified letters and include_basmala=false${surah.length > 0 ? ` and surah=${surah}` : ''}
2. Report each letter's count, percentage, and abjad value
3. **Check 19-divisibility** for each count and the total
4. If relevant Mukattaa letters, note the connection to the surah's opening letters
5. State the convention used: "Besmele hariç tutularak sayıldı"

## Output Format

Present results as:
| Harf | Sayı | Yüzde | Ebced | 19'a Bölünür? |
|------|------|-------|-------|---------------|
| ... | ... | ... | ... | ... |

Total: X letters
19-divisibility: X ÷ 19 = Y (or not divisible)`;

  return {
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
