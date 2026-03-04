import type { GrammarCategory, GrammarGroupedResult, ToolDefinition, ToolResult, Word } from '../types.js';
import { getDb } from '../db.js';
import { analyzeWord, getVariantInfo } from '../lib/arabic-grammar.js';
import { arabicToBuckwalter, containsArabic } from '../lib/transliterate.js';

export function getSearchToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'quran_search',
      description:
        'Search for words in the Quran by Arabic text, root (in Buckwalter or Arabic), or lemma. Returns matching words with surah/ayah location, POS tags, root, lemma, and abjad values.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query — Arabic word text, root, or lemma',
          },
          type: {
            type: 'string',
            enum: ['word', 'root', 'lemma'],
            description: 'Search type: "word" searches Arabic text, "root" matches exact root field, "lemma" searches lemma field. Default: "word"',
          },
          surah: {
            type: 'number',
            description: 'Optional: filter results to a specific surah (1-114)',
            minimum: 1,
            maximum: 114,
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default 50, max 200)',
            minimum: 1,
            maximum: 200,
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'quran_grammar_search',
      description:
        'Grammar-aware search that finds a word and all its prefix variants in the Quran. Handles Arabic prefix system: و (and), ف (then), ب (with), ل (for), ال (the), ت (oath), أ (question), س (future). Groups results by grammar category. Use this instead of quran_search when searching for Arabic words to get comprehensive results.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Arabic word to search for (e.g. الله, رحمن, كتب)',
          },
          surah: {
            type: 'number',
            description: 'Optional: filter results to a specific surah (1-114)',
            minimum: 1,
            maximum: 114,
          },
          include_basmala: {
            type: 'boolean',
            description: 'Whether to include basmala words (ayah 0). Default: true',
          },
        },
        required: ['query'],
      },
    },
  ];
}

function buildSearchQuery(
  type: string,
  query: string,
  surah: number | undefined,
  limit: number,
): { params: (number | string)[]; sql: string; } {
  const conditions: string[] = [];
  const params: (number | string)[] = [];

  if (type === 'root') {
    const rootQuery = containsArabic(query) ? arabicToBuckwalter(query) : query;
    conditions.push('root = ?');
    params.push(rootQuery);
  } else if (type === 'lemma') {
    const lemmaQuery = containsArabic(query) ? arabicToBuckwalter(query) : query;
    conditions.push('lemma LIKE ?');
    params.push(`%${lemmaQuery}%`);
  } else {
    conditions.push('word_text LIKE ?');
    params.push(`%${query}%`);
  }

  if (surah !== undefined) {
    conditions.push('surah_no = ?');
    params.push(surah);
  }

  const whereClause = conditions.join(' AND ');
  const sql = `SELECT * FROM words WHERE ${whereClause} ORDER BY global_order_asc LIMIT ?`;
  params.push(limit);

  return { sql, params };
}

function handleQuranSearch(args: Record<string, unknown>): ToolResult {
  const query = typeof args['query'] === 'string' ? args['query'] : '';
  const type = typeof args['type'] === 'string' ? args['type'] : 'word';
  const surah = typeof args['surah'] === 'number' ? args['surah'] : undefined;
  const limit = Math.min(Math.max(typeof args['limit'] === 'number' ? args['limit'] : 50, 1), 200);

  if (query.length === 0) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'Query is required' }) }], isError: true };
  }

  const db = getDb();
  const { sql, params } = buildSearchQuery(type, query, surah, limit);
  const words = db.prepare(sql).all(...params) as Word[];

  const result = {
    total: words.length,
    query,
    type,
    surah: surah ?? null,
    words,
  };

  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}

function handleGrammarSearch(args: Record<string, unknown>): ToolResult {
  const query = typeof args['query'] === 'string' ? args['query'] : '';
  const surah = typeof args['surah'] === 'number' ? args['surah'] : undefined;
  const includeBasmala = typeof args['include_basmala'] === 'boolean' ? args['include_basmala'] : true;

  if (query.length === 0) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'Query is required' }) }], isError: true };
  }

  const db = getDb();
  const analysis = analyzeWord(query);
  const { baseWord, variants } = analysis;

  if (variants.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ baseWord, totalCount: 0, groups: [], stats: {} }),
        },
      ],
    };
  }

  // Build SQL with IN clause for all variants
  const placeholders = variants.map(() => '?').join(',');
  const conditions: string[] = [`word_text IN (${placeholders})`];
  const params: (number | string)[] = [...variants];

  if (surah !== undefined) {
    conditions.push('surah_no = ?');
    params.push(surah);
  }

  if (!includeBasmala) {
    conditions.push('ayah_no > 0');
  }

  const whereClause = conditions.join(' AND ');
  const sql = `SELECT * FROM words WHERE ${whereClause} ORDER BY global_order_asc`;
  const words = db.prepare(sql).all(...params) as Word[];

  // Group results by grammar category
  const groupMap = new Map<GrammarCategory, Word[]>();

  for (const word of words) {
    const info = getVariantInfo(word.word_text, baseWord);
    const existing = groupMap.get(info.category);
    if (existing === undefined) {
      groupMap.set(info.category, [word]);
    } else {
      existing.push(word);
    }
  }

  const groups: GrammarGroupedResult[] = [];
  const stats: Record<string, number> = {};

  for (const [category, categoryWords] of groupMap) {
    // Determine prefix for this category
    const [firstWord] = categoryWords;
    let prefix = '';
    if (firstWord !== undefined) {
      const { prefix: detectedPrefix } = getVariantInfo(firstWord.word_text, baseWord);
      prefix = detectedPrefix;
    }

    groups.push({
      category,
      count: categoryWords.length,
      prefix,
      words: categoryWords,
    });

    stats[category] = categoryWords.length;
  }

  const result = {
    baseWord,
    totalCount: words.length,
    groups,
    stats,
  };

  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}

export function handleSearchTool(name: string, args: Record<string, unknown>): ToolResult {
  if (name === 'quran_search') {
    return handleQuranSearch(args);
  }
  if (name === 'quran_grammar_search') {
    return handleGrammarSearch(args);
  }
  return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }], isError: true };
}
