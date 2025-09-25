import { ListToolsRequestSchema, CallToolRequestSchema, CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { zodToMcpJsonSchema } from '../../helpers/json-schema.js';
import { securitySchemes } from './security-schemes.js';
import { executeApiTool } from './executor.js';
import { tools } from './tools.js';

export function registerTools(server: Server): void {
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

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest): Promise<CallToolResult> => {
      const { name: toolName, arguments: toolArgs } = request.params;
      console.info(`Attempt to use custom tool: ${toolName}`);

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
    },
  );
}
