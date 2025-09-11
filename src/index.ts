import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolRequest,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { securitySchemeDictionaries } from './tools/security-scheme';
import { zodToMcpJsonSchema } from './helpers/zod-to-json-schema';
import { DSP_BOOKING_BASE_URL } from './utils/config';
import { executeApiTool } from './executor';
import { tools } from './tools';

const MCP_SERVER_NAME = 'dsp-mcp';
const MCP_SERVER_VERSION = '0.1.0';

const server = new Server({
  name: MCP_SERVER_NAME,
  version: MCP_SERVER_VERSION,
}, {
  capabilities: {
    tools: {},
  },
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient: Tool[] = [];

  for (const def of Array.from(tools.values())) {
    toolsForClient.push({
      name: def.name,
      description: def.description,
      inputSchema: zodToMcpJsonSchema(def.inputSchema),
    });
  }

  return {
    tools: toolsForClient,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name: toolName, arguments: toolArgs } = request.params;
  const toolDefinition = tools.get(toolName);
  if (!toolDefinition) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Unknown tool requested: ${toolName}`,
        },
      ],
    };
  }
  return await executeApiTool(
    toolName,
    toolDefinition,
    toolArgs ?? {},
    securitySchemeDictionaries,
  );
});


async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`${MCP_SERVER_NAME} MCP Server (v${MCP_SERVER_VERSION}) running on stdio, proxying API at ${DSP_BOOKING_BASE_URL}`);
  } catch (error) {
    console.error('Error during server startup:', error);
    process.exit(1);
  }
}

async function cleanup() {
  console.error('Shutting down MCP server...');
  server.close();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

main();
