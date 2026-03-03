import { getDb } from '../db.js';
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

interface VerseRow {
  surah_no: number;
  ayah_no: number;
  text: string;
  total_abjad: number;
  word_count: number;
}

export function getEbcedToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'quran_ebced_search',
      description:
        'Search for words or verses by their Abjad (numerical) value. Can search for exact values, ranges, and multiples of 19. Abjad values are computed from the Arabic letter-number mapping (ا=1, ب=2, ج=3, ... غ=1000).',
      inputSchema: {
        type: 'object',
        properties: {
          value: {
            type: 'number',
            description: 'Exact abjad value to search for',
          },
          min: {
            type: 'number',
            description: 'Minimum abjad value (inclusive)',
          },
          max: {
            type: 'number',
            description: 'Maximum abjad value (inclusive)',
          },
          surah: {
            type: 'number',
            description: 'Filter to a specific surah (1-114)',
            minimum: 1,
            maximum: 114,
          },
          only_19: {
            type: 'boolean',
            description: 'Only return results whose abjad value is divisible by 19',
          },
          type: {
            type: 'string',
            enum: ['word', 'verse'],
            description: 'Search for individual words or entire verses. Default: "word"',
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return (default 50, max 200)',
            minimum: 1,
            maximum: 200,
          },
        },
      },
    },
  ];
}

function handleEbcedWordSearch(
  value: number | undefined,
  min: number | undefined,
  max: number | undefined,
  surah: number | undefined,
  only19: boolean,
  limit: number,
): ToolResult {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (value !== undefined) {
    conditions.push('total_abjad = ?');
    params.push(value);
  }
  if (min !== undefined) {
    conditions.push('total_abjad >= ?');
    params.push(min);
  }
  if (max !== undefined) {
    conditions.push('total_abjad <= ?');
    params.push(max);
  }
  if (surah !== undefined) {
    conditions.push('surah_no = ?');
    params.push(surah);
  }
  if (only19) {
    conditions.push('total_abjad % 19 = 0');
  }

  if (conditions.length === 0) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'At least one filter (value, min, max, surah, only_19) is required' }) }] };
  }

  const whereClause = conditions.join(' AND ');
  const sql = `SELECT * FROM words WHERE ${whereClause} ORDER BY global_order_asc LIMIT ?`;
  params.push(limit);

  const db = getDb();
  const words = db.prepare(sql).all(...params) as Word[];

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ total: words.length, type: 'word', results: words }),
      },
    ],
  };
}

function handleEbcedVerseSearch(
  value: number | undefined,
  min: number | undefined,
  max: number | undefined,
  surah: number | undefined,
  only19: boolean,
  limit: number,
): ToolResult {
  const whereConditions: string[] = [];
  const havingConditions: string[] = [];
  const params: (string | number)[] = [];

  // Surah filter goes in WHERE
  if (surah !== undefined) {
    whereConditions.push('surah_no = ?');
    params.push(surah);
  }

  // We need a separate params array approach since HAVING params come after WHERE params
  const havingParams: (string | number)[] = [];

  if (value !== undefined) {
    havingConditions.push('SUM(total_abjad) = ?');
    havingParams.push(value);
  }
  if (min !== undefined) {
    havingConditions.push('SUM(total_abjad) >= ?');
    havingParams.push(min);
  }
  if (max !== undefined) {
    havingConditions.push('SUM(total_abjad) <= ?');
    havingParams.push(max);
  }
  if (only19) {
    havingConditions.push('SUM(total_abjad) % 19 = 0');
  }

  if (whereConditions.length === 0 && havingConditions.length === 0) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'At least one filter (value, min, max, surah, only_19) is required' }) }] };
  }

  const wherePart = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : '';
  const havingPart = havingConditions.length > 0 ? ` HAVING ${havingConditions.join(' AND ')}` : '';

  const sql = `SELECT surah_no, ayah_no, GROUP_CONCAT(word_text, ' ') as text, SUM(total_abjad) as total_abjad, COUNT(*) as word_count FROM words${wherePart} GROUP BY surah_no, ayah_no${havingPart} ORDER BY surah_no, ayah_no LIMIT ?`;

  const allParams = [...params, ...havingParams, limit];

  const db = getDb();
  const verses = db.prepare(sql).all(...allParams) as VerseRow[];

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ total: verses.length, type: 'verse', results: verses }),
      },
    ],
  };
}

export function handleEbcedTool(name: string, args: Record<string, unknown>): ToolResult {
  if (name !== 'quran_ebced_search') {
    return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }] };
  }

  const value = typeof args['value'] === 'number' ? args['value'] : undefined;
  const min = typeof args['min'] === 'number' ? args['min'] : undefined;
  const max = typeof args['max'] === 'number' ? args['max'] : undefined;
  const surah = typeof args['surah'] === 'number' ? args['surah'] : undefined;
  const only19 = typeof args['only_19'] === 'boolean' ? args['only_19'] : false;
  const type = String(args['type'] ?? 'word');
  const limit = Math.min(Math.max(typeof args['limit'] === 'number' ? args['limit'] : 50, 1), 200);

  if (type === 'verse') {
    return handleEbcedVerseSearch(value, min, max, surah, only19, limit);
  }

  return handleEbcedWordSearch(value, min, max, surah, only19, limit);
}
