import type { SecurityScheme } from './types.js';

export const securitySchemes: Record<string, SecurityScheme> = {
  HeaderApiToken: {
    description: 'API token is required in header to access the API.',
    type: 'oauth2',
    in: 'header',
    name: 'Api-Token',
    flows: {
      clientCredentials: {
        tokenUrl: '',
      },
    },
  },
  HeaderApimSubscriptionKey: {
    description: 'Subscription key is required in header to access the API.',
    type: 'apiKey',
    in: 'header',
    name: 'Ocp-Apim-Subscription-Key',
  },
  HeaderApiVersion: {
    description: 'Version is required in header to access the API.',
    type: 'apiKey',
    in: 'header',
    name: 'Api-Version',
  },
};
