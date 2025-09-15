import { ZodSchema, z } from 'zod';

import { InitializeBookingSchema, FlightSearchSchema } from './input-schema.js';

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  method: 'post' | 'get' | 'put' | 'delete' | 'patch';
  pathTemplate: string;
  executionParameters: { name: string; in: string }[];
  requestBodyContentType?: string;
  securityRequirements: Array<Record<string, []>>;
};

export type SecurityScheme = {
  description: string;
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  in: 'query' | 'header' | 'cookie';
  name: string;
  flows?: Record<string, { tokenUrl: string }>;
};

export type InitializeBookingInputSchema = z.infer<typeof InitializeBookingSchema>;
export type FlightSearchInputSchema = z.infer<typeof FlightSearchSchema>;
