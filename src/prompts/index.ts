import { getQuranSearchPromptDefinition, handleQuranSearchPrompt } from './quran-search.js';
import { getAnalyzeVersePromptDefinition, handleAnalyzeVersePrompt } from './quran-analyze-verse.js';
import { getEbcedPromptDefinition, handleEbcedPrompt } from './quran-ebced.js';
import { getRootAnalysisPromptDefinition, handleRootAnalysisPrompt } from './quran-root-analysis.js';

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

export function getAllPrompts(): PromptDefinition[] {
  return [
    getQuranSearchPromptDefinition(),
    getAnalyzeVersePromptDefinition(),
    getEbcedPromptDefinition(),
    getRootAnalysisPromptDefinition(),
  ];
}

const PROMPT_HANDLERS: Readonly<Record<string, (args: Record<string, string>) => { messages: PromptMessage[] }>> = {
  'quran-search': handleQuranSearchPrompt,
  'quran-analyze-verse': handleAnalyzeVersePrompt,
  'quran-ebced': handleEbcedPrompt,
  'quran-root-analysis': handleRootAnalysisPrompt,
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
