import axios, { type AxiosRequestConfig, AxiosResponse, AxiosHeaders } from 'axios';
import { JsonObject } from 'type-fest';
import { ZodError } from 'zod';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { McpToolDefinition, SecurityScheme } from './types.js';

import {
  DSP_APIM_SUBSCRIPTION_KEY,
  DSP_BOOKING_API_VERSION,
  DSP_OAUTH_CLIENT_SECRET,
  DSP_BOOKING_BASE_URL,
  DSP_OAUTH_CLIENT_ID,
  DSP_OAUTH_TOKEN_URL,
} from '../../utils/config.js';
import { formatAxiosError } from '../../helpers/axios.js';
import { acquireOAuth2Token } from '../../utils/oauth.js';

type RequestConfig = {
  urlPath: string;
  queryParams: Record<string, any>;
  requestBodyData?: any;
  headers: AxiosHeaders;
};

type SecurityContext = {
  appliedSecurity?: Record<string, string[]>;
  isValid: boolean;
  errorMessage?: string;
};

// Validation helper
function validateToolArguments(
  toolName: string,
  definition: McpToolDefinition,
  toolArgs: Record<string, unknown>,
): { success: true; data: JsonObject } | { success: false; result: CallToolResult } {
  try {
    const argsToParse = (typeof toolArgs === 'object' && toolArgs !== null) ? toolArgs : {};
    const validatedArgs = definition.inputSchema.parse(argsToParse) as JsonObject;

    return { success: true, data: validatedArgs };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrorMessage = `Invalid arguments for tool '${toolName}': ${error.issues
        .map((e) => `${e.path.join('.')} (${e.code}): ${e.message}`)
        .join(', ')
      }`;

      return {
        success: false,
        result: {
          content: [{ type: 'text', text: validationErrorMessage }],
        },
      };
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        result: {
          content: [{ type: 'text', text: `Internal error during validation setup: ${errorMessage}` }],
        },
      };
    }
  }
}

// Request configuration builder
function buildRequestConfig(
  definition: McpToolDefinition,
  validatedArgs: JsonObject,
): RequestConfig {
  let urlPath = definition.pathTemplate;
  const queryParams: Record<string, any> = {};
  let requestBodyData: any = undefined;
  const headers = new AxiosHeaders();

  // Set default headers
  headers.set('Accept', 'application/json');

  // Process parameters
  for (const param of definition.executionParameters) {
    const value = validatedArgs[param.name];
    if (value !== undefined && value !== null) {
      switch (param.in) {
        case 'path':
          urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(String(value)));
          break;
        case 'query':
          queryParams[param.name] = value;
          break;
        case 'header':
          headers.set(param.name, String(value));
          break;
      }
    }
  }

  // Validate path parameters are resolved
  if (urlPath.includes('{')) {
    throw new Error(`Failed to resolve path parameters: ${urlPath}`);
  }

  // Handle request body
  if (definition.requestBodyContentType && validatedArgs['requestBody'] !== undefined) {
    requestBodyData = validatedArgs['requestBody'];
    headers.set('Content-Type', definition.requestBodyContentType);
  }

  return { urlPath, queryParams, requestBodyData, headers };
}

// Security validation
function validateSecurity(
  definition: McpToolDefinition,
  securityRequirementDictionaries: Record<string, SecurityScheme>,
): SecurityContext {
  if (definition.securityRequirements.length === 0) {
    return { isValid: true };
  }

  const appliedSecurity = definition.securityRequirements.find((requirement) => {
    return Object.entries(requirement).every(([schemeName]) => {
      const securityScheme = securityRequirementDictionaries[schemeName];
      if (!securityScheme) {
        return false;
      }

      if (securityScheme.type === 'apiKey') {
        if (securityScheme.name === 'Ocp-Apim-Subscription-Key') {
          return !!DSP_APIM_SUBSCRIPTION_KEY;
        }
        if (securityScheme.name === 'Api-Version') {
          return !!DSP_BOOKING_API_VERSION;
        }
      }

      if (securityScheme.type === 'oauth2') {
        if (securityScheme.name === 'Api-Token') {
          return (
            !!DSP_OAUTH_CLIENT_ID &&
            !!DSP_OAUTH_CLIENT_SECRET &&
            (securityScheme.flows?.['clientCrentials']?.['tokenUrl'] || !!DSP_OAUTH_TOKEN_URL)
          );
        }
      }

      return false;
    });
  });

  if (!appliedSecurity) {
    const securityRequirementsString = definition.securityRequirements
      .map((req) => {
        const parts = Object.entries(req)
          .map(([name, scopesArray]) => {
            const scopes = scopesArray as string[];
            return scopes.length === 0 ? name : `${name} (scopes: ${scopes.join(', ')})`;
          })
          .join(' AND ');
        return `[${parts}]`;
      })
      .join(' OR ');

    return {
      isValid: false,
      errorMessage: `Tool requires security: ${securityRequirementsString}, but no suitable credentials found.`,
    };
  }

  return { isValid: true, appliedSecurity };
}

// Security application
async function applySecurity(
  headers: AxiosHeaders,
  appliedSecurity: Record<string, string[]>,
  securityRequirementDictionaries: Record<string, SecurityScheme>,
): Promise<void> {
  for (const [schemeName, scopesArray] of Object.entries(appliedSecurity)) {
    const securityScheme = securityRequirementDictionaries[schemeName];
    if (!securityScheme) {
      console.warn(`No security scheme found for '${schemeName}'`);
      continue;
    }

    if (securityScheme.type === 'apiKey') {
      await applyApiKeySecurity(headers, schemeName, securityScheme);
    } else if (securityScheme.type === 'oauth2') {
      await applyOAuth2Security(headers, schemeName, securityScheme, scopesArray as string[]);
    }
  }
}

async function applyApiKeySecurity(
  headers: AxiosHeaders,
  schemeName: string,
  securityScheme: SecurityScheme,
): Promise<void> {
  let apiKey = '';

  if (securityScheme.name === 'Ocp-Apim-Subscription-Key') {
    apiKey = DSP_APIM_SUBSCRIPTION_KEY;
  } else if (securityScheme.name === 'Api-Version') {
    apiKey = DSP_BOOKING_API_VERSION;
  }

  if (apiKey && securityScheme.in === 'header') {
    headers.set(securityScheme.name, apiKey);
    console.info(`Applied API key '${schemeName}' in header '${securityScheme.name}'`);
  }
}

async function applyOAuth2Security(
  headers: AxiosHeaders,
  schemeName: string,
  securityScheme: SecurityScheme,
  scopes: string[],
): Promise<void> {
  if (!securityScheme.flows?.clientCredentials) {return;}

  console.info(`Attempting to acquire OAuth token for '${schemeName}'`);
  const token = await acquireOAuth2Token(schemeName, securityScheme);

  if (token && securityScheme.in === 'header') {
    headers.set(securityScheme.name, token);
    console.info(`Applied OAuth2 token for '${schemeName}' in header '${securityScheme.name}'`);

    if (scopes.length > 0) {
      console.info(`Requested scopes: ${scopes.join(', ')}`);
    }
  }
}

// Response formatter
function formatResponse(
  response: AxiosResponse,
  definition: McpToolDefinition,
): CallToolResult {
  const content: CallToolResult['content'] = [];

  const contentType = response.headers['content-type']?.toLowerCase() || '';

  if (contentType.includes('application/json') && typeof response.data === 'object' && response.data !== null) {
    if (definition.serializer) {
      try {
        const serializedOutput = definition.serializer(response);
        content.push({
          type: 'text',
          text: serializedOutput,
        });
      } catch (serializationError) {
        console.warn(`Serialization failed for ${definition.name}:`, serializationError);
        content.push({
          type: 'text',
          text: `Warning - serialization error, showing raw response:\n\n${JSON.stringify(response.data, null, 2)}`,
        });
      }
    } else {
      try {
        const responseText = JSON.stringify(response.data, null, 2);
        content.push({
          type: 'text',
          text: `API Response (Status: ${response.status}):\n${responseText}`,
        });
      } catch (err) {
        content.push({
          type: 'text',
          text: `[Stringify Error]: ${String(err)}`,
        });
      }
    }
  } else if (typeof response.data === 'string') {
    content.push({
      type: 'text',
      text: response.data,
    });
  } else if (response.data !== undefined && response.data !== null) {
    content.push({
      type: 'text',
      text: String(response.data),
    });
  } else {
    content.push({
      type: 'text',
      text: `(Status: ${response.status} - No body content)`,
    });
  }

  return {
    content,
  };
}

// Error formatter
function formatError(toolName: string, error: unknown): CallToolResult {
  let errorMessage: string;

  if (axios.isAxiosError(error)) {
    errorMessage = formatAxiosError(error);
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = 'Unexpected error: ' + String(error);
  }

  console.error(`Error during execution of tool '${toolName}':`, errorMessage);

  return {
    content: [
      {
        type: 'text',
        text: errorMessage,
      },
    ],
  };
}

// Main function - now much cleaner and focused
export async function executeApiTool(
  toolName: string,
  definition: McpToolDefinition,
  toolArgs: Record<string, unknown>,
  securityRequirementDictionaries: Record<string, SecurityScheme>,
): Promise<CallToolResult> {
  // 1. Validate arguments
  const validation = validateToolArguments(toolName, definition, toolArgs);
  if (!validation.success) {
    return validation.result;
  }

  try {
    // 2. Build request configuration
    const baseUrl = DSP_BOOKING_BASE_URL;
    const requestConfig = buildRequestConfig(definition, validation.data);

    // 3. Validate and apply security
    const securityContext = validateSecurity(definition, securityRequirementDictionaries);
    if (!securityContext.isValid) {
      console.warn(`Tool '${toolName}' ${securityContext.errorMessage}`);
      return {
        content: [
          {
            type: 'text',
            text: `Internal error during tool setup: '${toolName}'`,
          },
        ],
      };
    }

    if (securityContext.appliedSecurity) {
      await applySecurity(
        requestConfig.headers,
        securityContext.appliedSecurity,
        securityRequirementDictionaries,
      );
    }

    // 4. Create axios configuration
    const axiosConfig: AxiosRequestConfig = {
      method: definition.method.toUpperCase(),
      url: baseUrl + requestConfig.urlPath,
      params: requestConfig.queryParams,
      headers: requestConfig.headers,
      ...(requestConfig.requestBodyData !== undefined && { data: requestConfig.requestBodyData }),
    };

    // 5. Execute request
    console.info(`Executing tool "${toolName}": ${axiosConfig.method} ${axiosConfig.url}`);
    const response = await axios(axiosConfig);

    // 6. Format and return response - pass definition instead of toolName
    return formatResponse(response, definition);
  } catch (error) {
    return formatError(toolName, error);
  }
}
