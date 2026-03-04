import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  GetPromptRequestSchema,
  type GetPromptResult,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getAllPrompts, handleGetPrompt } from './prompts/index.js';
import { getAllTools, handleToolCall } from './tools/index.js';

export function createMcpServer(): Server {
  const server = new Server(
    { name: '@quranmiracle/mcp', version: '0.1.0' },
    { capabilities: { tools: {}, prompts: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: getAllTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const { name, arguments: args } = request.params;
    try {
      return handleToolCall(name, args ?? {}) as CallToolResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Tool error [${name}]:`, message);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
        isError: true,
      } as CallToolResult;
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, () => ({
    prompts: getAllPrompts(),
  }));

  server.setRequestHandler(GetPromptRequestSchema, (request) => {
    const { name, arguments: args } = request.params;
    try {
      return handleGetPrompt(name, args ?? {}) as GetPromptResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Prompt error [${name}]:`, message);
      return {
        messages: [
          {
            role: 'user' as const,
            content: { type: 'text' as const, text: `Error loading prompt: ${message}` },
          },
        ],
      } as GetPromptResult;
    }
  });

  return server;
}
