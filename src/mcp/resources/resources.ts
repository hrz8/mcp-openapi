import { getSuggestedAlternatives, checkRouteSupported, getSupportedRoutes } from './database.js';
import { McpResourceDefinition } from './types.js';

export const resources: Map<string, McpResourceDefinition> = new Map([
  [
    'supported-routes',
    {
      name: 'supported-routes',
      uri: 'mab://routes/supported',
      title: 'Malaysia Airlines Supported Routes',
      description: 'All flight routes currently operated by Malaysia Airlines',
      mimeType: 'application/json',
      generateContent: async (uri: string) => {
        const routes = await getSupportedRoutes();
        return {
          contents: [{
            uri: uri,
            text: JSON.stringify({
              routes: routes,
              lastUpdated: new Date().toISOString(),
              note: 'These are all the routes Malaysia Airlines currently operates',
            }, null, 2),
          }],
        };
      },
    },
  ],
  [
    'route-check',
    {
      name: 'route-check',
      uri: 'mab://routes/check/{origin}-{destination}',
      title: 'Route Availability Check',
      description: 'Check if a specific route is supported by Malaysia Airlines',
      mimeType: 'application/json',
      isTemplate: true,
      templatePattern: /^mab:\/\/routes\/check\/([A-Z]{3})-([A-Z]{3})$/,
      extractParams: (uri: string) => {
        const match = uri.match(/^mab:\/\/routes\/check\/([A-Z]{3})-([A-Z]{3})$/);
        if (!match || !match[1] || !match[2]) { return null; }
        return {
          origin: match[1],
          destination: match[2],
        };
      },
      generateContent: async (uri: string, params?: { origin: string; destination: string }) => {
        if (!params) {
          throw new Error('Invalid URI format for route check');
        }

        const { origin, destination } = params;
        const isSupported = await checkRouteSupported(origin, destination);
        const alternatives = isSupported ? [] : await getSuggestedAlternatives(origin, destination);

        return {
          contents: [{
            uri: uri,
            text: JSON.stringify({
              route: `${origin}-${destination}`,
              supported: isSupported,
              alternatives: alternatives,
              message: isSupported
                ? `Malaysia Airlines operates flights from ${origin} to ${destination}`
                : `Malaysia Airlines does not operate flights from ${origin} to ${destination}`,
            }, null, 2),
          }],
        };
      },
    } satisfies McpResourceDefinition<{ origin: string; destination: string }>,
  ],
]);
