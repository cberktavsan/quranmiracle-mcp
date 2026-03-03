import type { PromptDefinition, PromptMessage } from '../types.js';

export function getAnalyzeVersePromptDefinition(): PromptDefinition {
  return {
    name: 'quran-analyze-verse',
    description:
      'Detailed linguistic analysis of a Quran verse. Analyzes each word for Arabic text, root, lemma, POS tag, and abjad value.',
    arguments: [
      {
        name: 'surah',
        description: 'Surah number (1-114)',
        required: true,
      },
      {
        name: 'ayah',
        description: 'Ayah (verse) number',
        required: true,
      },
    ],
  };
}

export function handleAnalyzeVersePrompt(args: Record<string, string>): { messages: PromptMessage[] } {
  const surah = args['surah'] ?? '1';
  const ayah = args['ayah'] ?? '1';

  const text = `You are a Quranic Arabic linguist. Analyze verse ${surah}:${ayah} in detail.

## Instructions

1. Call the **quran_get_verse** tool with surah=${surah} and ayah=${ayah} to retrieve the verse data.
2. For each word in the verse, analyze:
   - **Arabic text** (word_text)
   - **Root** — the 3-letter Arabic root (in Buckwalter transliteration)
   - **Lemma** — the dictionary form (in Buckwalter transliteration)
   - **POS tag** — Part of Speech tag
   - **Abjad value** (total_abjad) — numerical value of the word
   - **Position** (order_in_ayah) — word position in the verse

## POS Tag Reference

### Simple tags:
| Tag | Meaning |
|-----|---------|
| N | Noun |
| V | Verb |
| PN | Proper Noun |
| ADJ | Adjective |
| PRON | Pronoun |
| DEM | Demonstrative Pronoun |
| REL | Relative Pronoun |
| P | Preposition |
| CONJ | Conjunction |
| INTG | Interrogative |
| NEG | Negative Particle |
| EMPH | Emphatic Particle |
| PART | Particle |
| VOC | Vocative Particle |

### Compound tags (separated by +):
| Tag | Meaning |
|-----|---------|
| DET+N | Definite Noun (with ال) |
| P+N | Preposition + Noun |
| V+PRON | Verb + Pronoun suffix |
| CONJ+V | Conjunction + Verb |
| DET+ADJ | Definite Adjective |
| P+PRON | Preposition + Pronoun |

## Buckwalter Transliteration

Root and lemma fields use Buckwalter encoding. Key mappings:
- ا→A, ب→b, ت→t, ث→v, ج→j, ح→H, خ→x
- د→d, ذ→*, ر→r, ز→z, س→s, ش→$, ص→S
- ض→D, ط→T, ظ→Z, ع→E, غ→g, ف→f, ق→q
- ك→k, ل→l, م→m, ن→n, ه→h, و→w, ي→y

## Analysis Format

Present the analysis as a table with columns: Position, Arabic, Root, Lemma, POS, Abjad.
Then provide:
- Total verse abjad value and whether it is divisible by 19
- Word count
- Any notable linguistic features (root patterns, grammatical structures)`;

  return {
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
