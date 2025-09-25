import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { resources } from '../resources';

export function registerResources(server: Server): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resourcesForClient = [];

    for (const def of Array.from(resources.values())) {
      resourcesForClient.push({
        uri: def.uri,
        name: def.name,
        description: def.description,
        mimeType: def.mimeType,
      });
    }

    return {
      resources: resourcesForClient,
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    for (const def of Array.from(resources.values())) {
      if (!def.isTemplate && def.uri === uri) {
        return await def.generateContent(uri);
      }
    }

    for (const def of Array.from(resources.values())) {
      if (def.isTemplate && def.templatePattern && def.extractParams) {
        if (def.templatePattern.test(uri)) {
          const params = def.extractParams(uri);
          if (params) {
            return await def.generateContent(uri, params);
          }
        }
      }
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
