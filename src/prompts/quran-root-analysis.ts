interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
}

interface PromptMessage {
  role: 'user';
  content: { type: 'text'; text: string };
}

export function getRootAnalysisPromptDefinition(): PromptDefinition {
  return {
    name: 'quran-root-analysis',
    description:
      'Arabic root system analysis guide. Explains the trilateral root system and retrieves all words derived from a given root in the Quran.',
    arguments: [
      {
        name: 'root',
        description: 'Arabic root to analyze (e.g. رحم for mercy, كتب for writing)',
        required: true,
      },
    ],
  };
}

export function handleRootAnalysisPrompt(args: Record<string, string>): { messages: PromptMessage[] } {
  const root = args['root'] ?? '';

  const text = `You are an expert in Arabic morphology (Sarf) and Quranic linguistics. The user wants to analyze the root "${root}" in the Quran.

## Arabic Root System

Arabic is built on a root-and-pattern system. Most words derive from a **trilateral root** (3 consonant letters) that carries a core meaning. Different patterns (wazn/وزن) applied to the root create different but related words.

### Example: Root ر-ح-م (r-H-m) — core meaning: "mercy"
- **رحمن** (raHmAn) — Most Merciful (intensive form)
- **رحيم** (raHiym) — Especially Merciful (intensive form)
- **رحمة** (raHmap) — mercy (noun)
- **رحم** (raHim) — womb (concrete noun from same root)
- **ارحم** (ArHam) — most merciful (elative)
- **يرحم** (yarHam) — he has mercy (verb)

## Buckwalter Transliteration Table

The database stores roots in Buckwalter encoding:

| Arabic | Buckwalter | | Arabic | Buckwalter | | Arabic | Buckwalter |
|--------|------------|-|--------|------------|-|--------|------------|
| ا | A | | ز | z | | ف | f |
| ب | b | | س | s | | ق | q |
| ت | t | | ش | $ | | ك | k |
| ث | v | | ص | S | | ل | l |
| ج | j | | ض | D | | م | m |
| ح | H | | ط | T | | ن | n |
| خ | x | | ظ | Z | | ه | h |
| د | d | | ع | E | | و | w |
| ذ | * | | غ | g | | ي | y |
| ر | r | | | | | | |

## Instructions

1. Call the **quran_get_root_words** tool with root="${root}" to retrieve all words sharing this root.
2. Analyze the results:
   - Group words by their unique word forms
   - Note the morphological pattern of each form
   - Count occurrences of each form
   - Identify which surahs contain the most occurrences
3. Present a summary including:
   - Total number of occurrences in the Quran
   - List of unique word forms derived from this root
   - Distribution across surahs
   - Notable patterns or linguistic observations`;

  return {
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
