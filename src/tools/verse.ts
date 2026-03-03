import { getDb } from '../db.js';
import type { Word, Surah, ToolDefinition, ToolResult } from '../types.js';

export function getVerseToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'quran_get_verse',
      description:
        'Get a specific verse (ayah) from the Quran with all its words, including Arabic text, root, lemma, POS tag, and abjad value for each word.',
      inputSchema: {
        type: 'object',
        properties: {
          surah: {
            type: 'number',
            description: 'Surah number (1-114)',
            minimum: 1,
            maximum: 114,
          },
          ayah: {
            type: 'number',
            description: 'Ayah (verse) number within the surah',
            minimum: 0,
          },
        },
        required: ['surah', 'ayah'],
      },
    },
    {
      name: 'quran_get_surah',
      description:
        'Get metadata about a specific surah (chapter) of the Quran, including Arabic name, Turkish name, English name, ayah count, word count, and letter count.',
      inputSchema: {
        type: 'object',
        properties: {
          surah: {
            type: 'number',
            description: 'Surah number (1-114)',
            minimum: 1,
            maximum: 114,
          },
        },
        required: ['surah'],
      },
    },
  ];
}

function handleGetVerse(args: Record<string, unknown>): ToolResult {
  const surah = typeof args['surah'] === 'number' ? args['surah'] : 0;
  const ayah = typeof args['ayah'] === 'number' ? args['ayah'] : 0;

  if (surah < 1 || surah > 114) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'Surah must be between 1 and 114' }) }], isError: true };
  }

  const db = getDb();
  const words = db
    .prepare('SELECT * FROM words WHERE surah_no = ? AND ayah_no = ? ORDER BY order_in_ayah')
    .all(surah, ayah) as Word[];

  if (words.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: `Verse ${surah}:${String(ayah)} not found` }),
        },
      ],
      isError: true,
    };
  }

  const text = words.map((w) => w.word_text).join(' ');
  let totalAbjad = 0;
  for (const w of words) {
    totalAbjad += w.total_abjad;
  }

  const result = {
    surah_no: surah,
    ayah_no: ayah,
    text,
    total_abjad: totalAbjad,
    word_count: words.length,
    words,
  };

  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}

function handleGetSurah(args: Record<string, unknown>): ToolResult {
  const surah = typeof args['surah'] === 'number' ? args['surah'] : 0;

  if (surah < 1 || surah > 114) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'Surah must be between 1 and 114' }) }], isError: true };
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM surahs WHERE surah_no = ?').get(surah) as Surah | undefined;

  if (row === undefined) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: `Surah ${String(surah)} not found` }),
        },
      ],
      isError: true,
    };
  }

  return { content: [{ type: 'text', text: JSON.stringify(row) }] };
}

export function handleVerseTool(name: string, args: Record<string, unknown>): ToolResult {
  if (name === 'quran_get_verse') {
    return handleGetVerse(args);
  }
  if (name === 'quran_get_surah') {
    return handleGetSurah(args);
  }
  return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }], isError: true };
}
