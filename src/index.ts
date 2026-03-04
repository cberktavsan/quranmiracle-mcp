import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { JwtOAuthProvider } from './auth/provider.js';
import { createMcpServer } from './server.js';

const provider = new JwtOAuthProvider();

const app = express();

// OAuth 2.1 endpoints (/.well-known/*, /authorize, /token, /register)
app.use(mcpAuthRouter({
  provider,
  issuerUrl: new URL(process.env['AUTH_ISSUER_URL'] ?? 'http://localhost:3000'),
}));

// MCP endpoint — Bearer token required
app.post(
  '/mcp',
  requireBearerAuth({ verifier: provider }),
  async (req, res): Promise<void> => {
    const server = createMcpServer();
    // Stateless mode: omit sessionIdGenerator so no sessions are tracked
    const transport = new StreamableHTTPServerTransport({});

    // Set onclose before connect to satisfy exactOptionalPropertyTypes
    transport.onclose = (): void => { /* noop — cleanup handled by res.close */ };

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport as Parameters<typeof server.connect>[0]);
    await transport.handleRequest(req, res, req.body);
  },
);

// Stateless mode: reject GET/DELETE on /mcp
app.get('/mcp', (_req, res) => {
  res.status(405).json({ error: 'Method not allowed. Use POST for MCP requests.' });
});
app.delete('/mcp', (_req, res) => {
  res.status(405).json({ error: 'Method not allowed. Use POST for MCP requests.' });
});

const PORT = Number.parseInt(process.env['PORT'] ?? '3000', 10);
app.listen(PORT, () => {
  console.log(`MCP server running on port ${String(PORT)}`);
});

export default app;
