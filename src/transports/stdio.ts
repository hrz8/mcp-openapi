import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { MCP_SERVER_VERSION, MCP_SERVER_NAME } from '../utils/config.js';
import { createMcpServer } from '../utils/mcp-server.js';

export async function startStdioServer() {
  const mcpServer = createMcpServer();
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.info(`${MCP_SERVER_NAME} MCP Server (v${MCP_SERVER_VERSION}) running on stdio`);
}
