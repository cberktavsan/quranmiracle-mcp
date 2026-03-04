import type { ToolDefinition, ToolResult, Word } from '../types.js';
import { getDb } from '../db.js';

interface VerseRow {
  ayah_no: number;
  surah_no: number;
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

interface EbcedSearchParams {
  readonly limit: number;
  readonly max: number | undefined;
  readonly min: number | undefined;
  readonly only19: boolean;
  readonly surah: number | undefined;
  readonly value: number | undefined;
}

function handleEbcedWordSearch(
  searchParams: EbcedSearchParams,
): ToolResult {
  const { limit, max, min, only19, surah, value } = searchParams;
  const conditions: string[] = [];
  const sqlParams: (number | string)[] = [];

  if (value !== undefined) {
    conditions.push('total_abjad = ?');
    sqlParams.push(value);
  }
  if (min !== undefined) {
    conditions.push('total_abjad >= ?');
    sqlParams.push(min);
  }
  if (max !== undefined) {
    conditions.push('total_abjad <= ?');
    sqlParams.push(max);
  }
  if (surah !== undefined) {
    conditions.push('surah_no = ?');
    sqlParams.push(surah);
  }
  if (only19) {
    conditions.push('total_abjad % 19 = 0');
  }

  if (conditions.length === 0) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'At least one filter (value, min, max, surah, only_19) is required' }) }], isError: true };
  }

  const whereClause = conditions.join(' AND ');
  const sql = `SELECT * FROM words WHERE ${whereClause} ORDER BY global_order_asc LIMIT ?`;
  sqlParams.push(limit);

  const db = getDb();
  const words = db.prepare(sql).all(...sqlParams) as Word[];

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
  searchParams: EbcedSearchParams,
): ToolResult {
  const { limit, max, min, only19, surah, value } = searchParams;
  const whereConditions: string[] = [];
  const havingConditions: string[] = [];
  const whereParams: (number | string)[] = [];

  // Surah filter goes in WHERE
  if (surah !== undefined) {
    whereConditions.push('surah_no = ?');
    whereParams.push(surah);
  }

  // HAVING params come after WHERE params in the query
  const havingParams: (number | string)[] = [];

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
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'At least one filter (value, min, max, surah, only_19) is required' }) }], isError: true };
  }

  const wherePart = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : '';
  const havingPart = havingConditions.length > 0 ? ` HAVING ${havingConditions.join(' AND ')}` : '';

  const sql = `SELECT surah_no, ayah_no, GROUP_CONCAT(word_text, ' ') as text, SUM(total_abjad) as total_abjad, COUNT(*) as word_count FROM words${wherePart} GROUP BY surah_no, ayah_no${havingPart} ORDER BY surah_no, ayah_no LIMIT ?`;

  const allParams: (number | string)[] = [...whereParams, ...havingParams, limit];

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
    return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }], isError: true };
  }

  const value = typeof args['value'] === 'number' ? args['value'] : undefined;
  const min = typeof args['min'] === 'number' ? args['min'] : undefined;
  const max = typeof args['max'] === 'number' ? args['max'] : undefined;
  const surah = typeof args['surah'] === 'number' ? args['surah'] : undefined;
  const only19 = typeof args['only_19'] === 'boolean' ? args['only_19'] : false;
  const type = typeof args['type'] === 'string' ? args['type'] : 'word';
  const limit = Math.min(Math.max(typeof args['limit'] === 'number' ? args['limit'] : 50, 1), 200);

  const searchParams: EbcedSearchParams = { limit, max, min, only19, surah, value };

  if (type === 'verse') {
    return handleEbcedVerseSearch(searchParams);
  }

  return handleEbcedWordSearch(searchParams);
}
