import { getDb } from '../db.js';
import { LETTER_TO_ABJAD } from '../lib/constants.js';
import type { LetterStat, ToolDefinition, ToolResult } from '../types.js';

interface LetterCountRow {
  letter: string;
  count: number;
}

interface TotalCountRow {
  total: number;
}

export function getStatsToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'quran_letter_stats',
      description:
        'Get letter frequency statistics for the entire Quran or a specific surah. Returns count, percentage, abjad value, and divisibility by 19 for each letter.',
      inputSchema: {
        type: 'object',
        properties: {
          surah: {
            type: 'number',
            description: 'Optional: filter to a specific surah (1-114)',
            minimum: 1,
            maximum: 114,
          },
          letters: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional: filter to specific Arabic letters (e.g. ["ا", "ل", "م"])',
          },
          include_basmala: {
            type: 'boolean',
            description: 'Whether to include basmala letters (ayah 0). Default: true',
          },
        },
      },
    },
  ];
}

export function handleStatsTool(name: string, args: Record<string, unknown>): ToolResult {
  if (name !== 'quran_letter_stats') {
    return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }], isError: true };
  }

  const surah = typeof args['surah'] === 'number' ? args['surah'] : undefined;
  const letters = Array.isArray(args['letters']) ? (args['letters'] as string[]) : undefined;
  const includeBasmala = typeof args['include_basmala'] === 'boolean' ? args['include_basmala'] : true;

  const db = getDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (surah !== undefined) {
    conditions.push('surah_no = ?');
    params.push(surah);
  }

  if (letters !== undefined && letters.length > 0) {
    const placeholders = letters.map(() => '?').join(',');
    conditions.push(`letter_char IN (${placeholders})`);
    params.push(...letters);
  }

  if (!includeBasmala) {
    conditions.push('ayah_no > 0');
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const totalSql = `SELECT COUNT(*) as total FROM letters${whereClause}`;
  const totalRow = db.prepare(totalSql).get(...params) as TotalCountRow | undefined;
  const total = totalRow?.total ?? 0;

  // Get distribution
  const distSql = `SELECT letter_char as letter, COUNT(*) as count FROM letters${whereClause} GROUP BY letter_char ORDER BY count DESC`;
  const distribution = db.prepare(distSql).all(...params) as LetterCountRow[];

  // Build stats with percentage, abjad, and 19-divisibility
  const stats: LetterStat[] = distribution.map((row) => {
    const abjadValue = LETTER_TO_ABJAD[row.letter] ?? 0;
    return {
      letter: row.letter,
      count: row.count,
      abjad_value: abjadValue,
      percentage: total > 0 ? Math.round((row.count / total) * 10000) / 100 : 0,
      divisible_by_19: row.count % 19 === 0,
    };
  });

  const result = {
    total,
    surah: surah ?? null,
    letters: letters ?? null,
    include_basmala: includeBasmala,
    stats,
  };

  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}
