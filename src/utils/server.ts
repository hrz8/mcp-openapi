import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolRequest,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { zodToMcpJsonSchema } from '../helpers/zod-to-json-schema';
import { MCP_SERVER_VERSION, MCP_SERVER_NAME } from './config';
import { securitySchemes } from '../tools/security-schemes';
import { executeApiTool, tools } from '../tools';

export function createServer(): Server {
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
      securitySchemes,
    );
  });

  return server;
}
