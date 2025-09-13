import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { MCP_SERVER_VERSION, MCP_SERVER_NAME } from '../utils/config';
import { createServer } from '../utils/server';

export async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${MCP_SERVER_NAME} MCP Server (v${MCP_SERVER_VERSION}) running on stdio`);
}
