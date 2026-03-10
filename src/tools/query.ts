import type { ToolDefinition, ToolResult } from '../types.js';
import { getDb } from '../db.js';

const MAX_ROWS = 1000;
const DEFAULT_LIMIT = 100;

const BLOCKED_PATTERNS: ReadonlyMap<string, RegExp> = new Map([
  ['ALTER', /\bALTER\b/],
  ['ATTACH', /\bATTACH\b/],
  ['CREATE', /\bCREATE\b/],
  ['DELETE', /\bDELETE\b/],
  ['DETACH', /\bDETACH\b/],
  ['DROP', /\bDROP\b/],
  ['INSERT', /\bINSERT\b/],
  ['LOAD_EXTENSION', /\bLOAD_EXTENSION\b/],
  ['PRAGMA', /\bPRAGMA\b/],
  ['REINDEX', /\bREINDEX\b/],
  ['REPLACE', /\bREPLACE\b/],
  ['UPDATE', /\bUPDATE\b/],
  ['VACUUM', /\bVACUUM\b/],
]);

function validateQuery(sql: string): null | string {
  const trimmed = sql.trim();

  if (trimmed.length === 0) {
    return 'Query cannot be empty';
  }

  // Must start with SELECT or WITH (for CTEs)
  const firstWord = trimmed.split(/\s/)[0]?.toUpperCase();
  if (firstWord !== 'SELECT' && firstWord !== 'WITH') {
    return 'Only SELECT queries are allowed (WITH...SELECT for CTEs)';
  }

  // Check for blocked keywords as standalone words
  const upperSql = trimmed.toUpperCase();
  for (const [keyword, pattern] of BLOCKED_PATTERNS) {
    if (pattern.test(upperSql)) {
      return `Forbidden keyword: ${keyword}`;
    }
  }

  // Block semicolons to prevent multi-statement injection
  if (trimmed.includes(';')) {
    return 'Multiple statements are not allowed';
  }

  return null;
}

export function getQueryToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'quran_query',
      description: `Run a custom read-only SQL query against the Quran database. Use this for efficient aggregations, counts, joins, and targeted data extraction instead of fetching large result sets from other tools.

Available tables and columns:

words: word_id, surah_no, ayah_no, order_in_ayah, order_in_surah, word_text, total_abjad, pos_tag, root, lemma, global_order_asc, global_order_desc
letters: letter_char, abjad_value, word_id, surah_no, ayah_no, position_in_word, global_order_asc
surahs: surah_no, name_ar, name_tr, name_en, ayah_count, word_count, letter_count

Example queries:
- SELECT COUNT(*) as count FROM words WHERE root = 'ktb'
- SELECT surah_no, COUNT(*) as word_count FROM words GROUP BY surah_no ORDER BY word_count DESC LIMIT 10
- SELECT word_text, COUNT(*) as freq FROM words GROUP BY word_text ORDER BY freq DESC LIMIT 20
- SELECT s.name_ar, SUM(w.total_abjad) as total FROM words w JOIN surahs s ON w.surah_no = s.surah_no GROUP BY w.surah_no
- WITH verse_abjad AS (SELECT surah_no, ayah_no, SUM(total_abjad) as abjad FROM words GROUP BY surah_no, ayah_no) SELECT * FROM verse_abjad WHERE abjad % 19 = 0 LIMIT 50

Only SELECT (and WITH...SELECT) queries are allowed. Use ? placeholders for parameters.`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL SELECT query with ? placeholders for parameters',
          },
          params: {
            type: 'array',
            items: {
              oneOf: [
                { type: 'string' },
                { type: 'number' },
              ],
            },
            description: 'Parameter values for ? placeholders in the query',
          },
          limit: {
            type: 'number',
            description: `Maximum number of rows to return (default ${DEFAULT_LIMIT}, max ${MAX_ROWS})`,
            minimum: 1,
            maximum: MAX_ROWS,
          },
        },
        required: ['query'],
      },
    },
  ];
}

export function handleQueryTool(name: string, args: Record<string, unknown>): ToolResult {
  if (name !== 'quran_query') {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      isError: true,
    };
  }

  const query = typeof args['query'] === 'string' ? args['query'] : '';
  const params = Array.isArray(args['params'])
    ? (args['params'] as (number | string)[])
    : [];
  const limit = Math.min(
    Math.max(typeof args['limit'] === 'number' ? args['limit'] : DEFAULT_LIMIT, 1),
    MAX_ROWS,
  );

  // Validate the query
  const validationError = validateQuery(query);
  if (validationError !== null) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: validationError }) }],
      isError: true,
    };
  }

  // Inject LIMIT if not already present
  const hasLimit = /\blimit\s+\d+/i.test(query);
  const finalQuery = hasLimit ? query : `${query.trim()} LIMIT ${String(limit)}`;

  const db = getDb();

  try {
    const stmt = db.prepare(finalQuery);
    const rows = stmt.all(...params) as Record<string, unknown>[];

    const result = {
      limitApplied: hasLimit ? undefined : limit,
      rowCount: rows.length,
      rows,
    };

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `SQL error: ${message}` }) }],
      isError: true,
    };
  }
}
