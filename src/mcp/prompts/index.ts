import { ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { jsonSchemaToPromptArguments, zodToMcpJsonSchema } from '../../helpers/json-schema.js';
import { prompts } from './prompts.js';

export function registerPrompts(server: Server): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const promptsForClient = [];

    for (const def of Array.from(prompts.values())) {
      const jsonSchema = zodToMcpJsonSchema(def.argsSchema);
      promptsForClient.push({
        name: def.name,
        description: def.description,
        arguments: jsonSchemaToPromptArguments(jsonSchema),
      });
    }

    return {
      prompts: promptsForClient,
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name: promptName, arguments: promptArgs } = request.params;
    console.info(`Attempt to use custom prompt: ${promptName}`);

    const promptDefinition = prompts.get(promptName);
    if (!promptDefinition) {
      throw new Error(`Unknown prompt: ${promptName}`);
    }

    const validation = promptDefinition.argsSchema.safeParse(promptArgs || {});
    if (!validation.success) {
      throw new Error(`Invalid arguments for ${promptName}: ${validation.error.message}`);
    }

    const messages = promptDefinition.generateMessages(validation.data);

    return {
      description: promptDefinition.description,
      messages,
    };
  });
}

export { prompts };
