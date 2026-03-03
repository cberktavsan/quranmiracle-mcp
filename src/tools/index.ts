import { getSearchToolDefinitions, handleSearchTool } from './search.js';
import { getVerseToolDefinitions, handleVerseTool } from './verse.js';
import { getEbcedToolDefinitions, handleEbcedTool } from './ebced.js';
import { getStatsToolDefinitions, handleStatsTool } from './stats.js';
import { getRootToolDefinitions, handleRootTool } from './root.js';
import type { ToolDefinition, ToolResult } from '../types.js';

export function getAllTools(): ToolDefinition[] {
  return [
    ...getSearchToolDefinitions(),
    ...getVerseToolDefinitions(),
    ...getEbcedToolDefinitions(),
    ...getStatsToolDefinitions(),
    ...getRootToolDefinitions(),
  ];
}

const SEARCH_TOOLS = new Set(['quran_search', 'quran_grammar_search']);
const VERSE_TOOLS = new Set(['quran_get_verse', 'quran_get_surah']);
const EBCED_TOOLS = new Set(['quran_ebced_search']);
const STATS_TOOLS = new Set(['quran_letter_stats']);
const ROOT_TOOLS = new Set(['quran_get_root_words']);

export function handleToolCall(name: string, args: Record<string, unknown>): ToolResult {
  if (SEARCH_TOOLS.has(name)) {
    return handleSearchTool(name, args);
  }
  if (VERSE_TOOLS.has(name)) {
    return handleVerseTool(name, args);
  }
  if (EBCED_TOOLS.has(name)) {
    return handleEbcedTool(name, args);
  }
  if (STATS_TOOLS.has(name)) {
    return handleStatsTool(name, args);
  }
  if (ROOT_TOOLS.has(name)) {
    return handleRootTool(name, args);
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: `Unknown tool: ${name}` }),
      },
    ],
    isError: true,
  };
}
