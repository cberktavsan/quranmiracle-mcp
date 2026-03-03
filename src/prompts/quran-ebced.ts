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

export function getEbcedPromptDefinition(): PromptDefinition {
  return {
    name: 'quran-ebced',
    description:
      'Abjad (Ebced) numerology guide for the Quran. Explains the letter-number system and how to search for words/verses by numerical value.',
    arguments: [
      {
        name: 'text',
        description: 'Optional: Arabic text to calculate abjad value for',
        required: false,
      },
    ],
  };
}

export function handleEbcedPrompt(args: Record<string, string>): { messages: PromptMessage[] } {
  const text = args['text'] ?? '';

  const textInstruction = text.length > 0
    ? `The user wants to explore the abjad value of: "${text}"`
    : 'The user wants to explore abjad (ebced) values in the Quran.';

  const promptText = `You are an expert in Quranic numerology (Ilm al-Huruf / Abjad calculation).

${textInstruction}

## Abjad (Ebced) Value Table

The Abjad numeral system assigns a numerical value to each Arabic letter:

| Letter | Name | Value | | Letter | Name | Value | | Letter | Name | Value |
|--------|------|-------|-|--------|------|-------|-|--------|------|-------|
| ا | Alif | 1 | | ي | Ya | 10 | | ق | Qaf | 100 |
| ب | Ba | 2 | | ك | Kaf | 20 | | ر | Ra | 200 |
| ج | Jim | 3 | | ل | Lam | 30 | | ش | Shin | 300 |
| د | Dal | 4 | | م | Mim | 40 | | ت | Ta | 400 |
| ه | Ha | 5 | | ن | Nun | 50 | | ث | Tha | 500 |
| و | Waw | 6 | | س | Sin | 60 | | خ | Kha | 600 |
| ز | Zay | 7 | | ع | Ayn | 70 | | ذ | Dhal | 700 |
| ح | Ha | 8 | | ف | Fa | 80 | | ض | Dad | 800 |
| ط | Ta | 9 | | ص | Sad | 90 | | ظ | Dha | 900 |
| | | | | | | | | غ | Ghayn | 1000 |

## Calculation Example

**الله** (Allah):
- ا (Alif) = 1
- ل (Lam) = 30
- ل (Lam) = 30
- ه (Ha) = 5
- **Total = 66**

## The Significance of 19

Surah 74 (Al-Muddaththir), Ayah 30: "Over it are Nineteen" (عَلَيْهَا تِسْعَةَ عَشَرَ)

The number 19 has been identified as a mathematical pattern throughout the Quran:
- The Basmala (بسم الله الرحمن الرحيم) has 19 letters
- The Quran has 114 surahs = 19 x 6
- Many letter counts in specific surahs are multiples of 19

## Instructions

Use the **quran_ebced_search** tool to search for words or verses by their abjad value:
- Set \`type\` to "word" to search individual words, or "verse" to search entire verses
- Use \`value\` for exact abjad value matches
- Use \`min\` and \`max\` for range searches
- Set \`only_19: true\` to find values divisible by 19
- Filter by \`surah\` to search within a specific chapter

Present results with the Arabic text, location (surah:ayah), and abjad breakdown.`;

  return {
    messages: [{ role: 'user', content: { type: 'text', text: promptText } }],
  };
}
