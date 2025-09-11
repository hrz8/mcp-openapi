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

function parseArgs() {
  const args = process.argv.slice(2);

  const config = {
    transport: 'stdio',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--transport':
      case '-t':
        config.transport = args[++i]!;
        break;
      case '--help':
        config.help = true;
        break;
    }
  }

  return config;
}

function showHelp() {
  console.info(`
${MCP_SERVER_NAME} MCP Server v${MCP_SERVER_VERSION}

Usage: node index.js [options]

Options:
  --transport, -t <type>    Transport type: stdio (default: stdio)
  --help                    Show this help message

Examples:
  node index.js                         # Start with stdio transport
  node index.js --transport stdio       # Explicitly use stdio transport

NPM Scripts:
  npm start                 # Start with stdio transport
  npm run help              # Show this help
`);
}

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

async function startStdioServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${MCP_SERVER_NAME} MCP Server (v${MCP_SERVER_VERSION}) running on stdio, proxying API at ${DSP_BOOKING_BASE_URL}`);
}

async function main() {
  const config = parseArgs();

  if (config.help) {
    showHelp();
    process.exit(0);
  }

  if (config.transport !== 'stdio') {
    console.error(`Error: Only 'stdio' transport is currently supported. Got: ${config.transport}`);
    console.error('Use --help for usage information');
    process.exit(1);
  }

  try {
    await startStdioServer();
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

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  cleanup();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  cleanup();
});

main();
