import type { PromptDefinition, PromptMessage } from '../types.js';

export function getQuranSearchPromptDefinition(): PromptDefinition {
  return {
    name: 'quran-search',
    description:
      'Grammar-aware search guide for finding Arabic words in the Quran. Explains the Arabic prefix system and instructs how to use the quran_grammar_search tool.',
    arguments: [
      {
        name: 'query',
        description: 'Arabic word to search for (e.g. الله, رحمن, كتب)',
        required: true,
      },
    ],
  };
}

export function handleQuranSearchPrompt(args: Record<string, string>): { messages: PromptMessage[] } {
  const query = args['query'] ?? '';

  const text = `You are a Quranic Arabic language expert. The user wants to search for the word "${query}" in the Quran.

## Arabic Prefix System

Arabic words in the Quran often appear with prefixes attached. When searching, you must account for all prefix variants to get comprehensive results.

### Single-letter prefixes:
- **و** (waw) — Conjunction "and": والله = و + الله
- **ف** (fa) — Conjunction "then/so": فالله = ف + الله
- **ب** (ba) — Preposition "with/by": بالله = ب + الله
- **ل** (lam) — Preposition "for/to": لله = ل + الله (lam merges!)
- **ت** (ta) — Oath marker: تالله = ت + الله
- **أ** (hamza) — Question marker: أفلا = أ + ف + لا
- **س** (sin) — Future particle: سيعلمون = س + يعلمون

### Definite article:
- **ال** (al) — "the": الرحمن = ال + رحمن

### Combination prefixes:
- و+ب (wabi): وبالحق = و + ب + ال + حق
- و+ل (wali): ولله = و + ل + الله
- ف+ب (fabi): فبالحق = ف + ب + ال + حق
- ف+ل (fali): فلله = ف + ل + الله
- أ+ب (abi): أبالله = أ + ب + الله
- و+ت (wata): وتالله = و + ت + الله
- و+س (wasa): وسيعلم = و + س + يعلم
- ف+س (fasa): فسيكفيكهم = ف + س + يكفيكهم

### Special Lam merging rule:
When ل (preposition) combines with الله (which starts with ال), the two lams merge:
- ل + الله = **لله** (NOT لالله)
- و + ل + الله = **ولله**
- ف + ل + الله = **فلله**

### Special words that must NOT be decomposed:
These words look like they contain ال but are actually indivisible:
- **الله** — Allah (NOT ال + له)
- **اللهم** — Allahumma (NOT ال + لهم)
- **الم** — Alif-Lam-Mim (Huruf al-Muqatta'at)
- **الر** — Alif-Lam-Ra (Huruf al-Muqatta'at)
- **المص** — Alif-Lam-Mim-Sad (Huruf al-Muqatta'at)
- **المر** — Alif-Lam-Mim-Ra (Huruf al-Muqatta'at)
- **الياس** — Prophet Ilyas (Elijah)
- **اليسع** — Prophet Al-Yasa (Elisha)
- **اللت** — Al-Lat (idol name)

## Instructions

Use the **quran_grammar_search** tool with query="${query}" to search. This tool automatically:
1. Analyzes the word to find its base form
2. Generates all prefix variants
3. Searches for all variants in the Quran
4. Groups results by grammar category (exact match, conjunction, preposition, definite, etc.)
5. Provides statistics per category

For example, searching for "الله" returns ~2698 total results across all prefix variants (الله، والله، بالله، لله، تالله، فالله، etc.).

Present the results organized by category, showing the count for each prefix type.`;

  return {
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
