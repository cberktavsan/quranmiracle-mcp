import type { PromptDefinition, PromptMessage } from '../types.js';
import { get19AnalysisPromptDefinition, handle19AnalysisPrompt } from './quran-19-analysis.js';
import { getAnalyzeVersePromptDefinition, handleAnalyzeVersePrompt } from './quran-analyze-verse.js';
import { getEbcedPromptDefinition, handleEbcedPrompt } from './quran-ebced.js';
import { getLetterCountPromptDefinition, handleLetterCountPrompt } from './quran-letter-count.js';
import { getRootAnalysisPromptDefinition, handleRootAnalysisPrompt } from './quran-root-analysis.js';
import { getQuranSearchPromptDefinition, handleQuranSearchPrompt } from './quran-search.js';
import { getStatisticalAnalysisPromptDefinition, handleStatisticalAnalysisPrompt } from './quran-statistical-analysis.js';
import { getWordCountPromptDefinition, handleWordCountPrompt } from './quran-word-count.js';

export function getAllPrompts(): PromptDefinition[] {
  return [
    getQuranSearchPromptDefinition(),
    getAnalyzeVersePromptDefinition(),
    getEbcedPromptDefinition(),
    getRootAnalysisPromptDefinition(),
    getWordCountPromptDefinition(),
    getLetterCountPromptDefinition(),
    getStatisticalAnalysisPromptDefinition(),
    get19AnalysisPromptDefinition(),
  ];
}

const PROMPT_HANDLERS: Readonly<Record<string, (args: Record<string, string>) => { messages: PromptMessage[] }>> = {
  'quran-19-analysis': handle19AnalysisPrompt,
  'quran-analyze-verse': handleAnalyzeVersePrompt,
  'quran-ebced': handleEbcedPrompt,
  'quran-letter-count': handleLetterCountPrompt,
  'quran-root-analysis': handleRootAnalysisPrompt,
  'quran-search': handleQuranSearchPrompt,
  'quran-statistical-analysis': handleStatisticalAnalysisPrompt,
  'quran-word-count': handleWordCountPrompt,
};

export function handleGetPrompt(
  name: string,
  args: Record<string, string>,
): { messages: PromptMessage[] } {
  const handler = PROMPT_HANDLERS[name];
  if (handler === undefined) {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Unknown prompt: ${name}. Available prompts: ${Object.keys(PROMPT_HANDLERS).join(', ')}`,
          },
        },
      ],
    };
  }
  return handler(args);
}
