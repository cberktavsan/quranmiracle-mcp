import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type CallToolResult,
  type GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';
import { getAllTools, handleToolCall } from './tools/index.js';
import { getAllPrompts, handleGetPrompt } from './prompts/index.js';
import { closeDb } from './db.js';

const server = new Server(
  { name: '@quranmiracle/mcp', version: '0.1.0' },
  { capabilities: { tools: {}, prompts: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: getAllTools(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, (args ?? {}) as Record<string, unknown>) as CallToolResult;
});

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: getAllPrompts(),
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleGetPrompt(name, (args ?? {}) as Record<string, string>) as GetPromptResult;
});

const transport = new StdioServerTransport();
await server.connect(transport);

process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
