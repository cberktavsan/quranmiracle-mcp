import { getDb } from '../db.js';
import { arabicToBuckwalter, containsArabic } from '../lib/transliterate.js';
import type { Word } from '../types.js';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolResult {
  content: { type: 'text'; text: string }[];
}

export function getRootToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'quran_get_root_words',
      description:
        'Get all words in the Quran that share a specific Arabic root. Accepts root in Arabic script or Buckwalter transliteration. The Arabic root system is the foundation of Arabic morphology — most words derive from a 3-letter root.',
      inputSchema: {
        type: 'object',
        properties: {
          root: {
            type: 'string',
            description: 'Arabic root in Arabic script (e.g. رحم) or Buckwalter transliteration (e.g. rHm)',
          },
        },
        required: ['root'],
      },
    },
  ];
}

export function handleRootTool(name: string, args: Record<string, unknown>): ToolResult {
  if (name !== 'quran_get_root_words') {
    return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }] };
  }

  const root = String(args['root'] ?? '');

  if (root.length === 0) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'Root is required' }) }] };
  }

  const buckwalterRoot = containsArabic(root) ? arabicToBuckwalter(root) : root;

  const db = getDb();
  const words = db
    .prepare('SELECT * FROM words WHERE root = ? ORDER BY global_order_asc')
    .all(buckwalterRoot) as Word[];

  const result = {
    root,
    buckwalter: buckwalterRoot,
    total: words.length,
    words,
  };

  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}
