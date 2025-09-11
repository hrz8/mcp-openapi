import zodToJsonSchema from 'zod-to-json-schema';

export function zodToMcpJsonSchema(zodSchema: any): {
  [x: string]: unknown;
  type: 'object';
  required?: string[] | undefined;
  properties?: { [x: string]: unknown; } | undefined;
} {
  const jsonSchema = zodToJsonSchema(zodSchema);

  if (typeof jsonSchema === 'object' && jsonSchema !== null && 'type' in jsonSchema) {
    if (jsonSchema.type === 'object') {
      return jsonSchema as {
        [x: string]: unknown;
        type: 'object';
        required?: string[] | undefined;
        properties?: { [x: string]: unknown; } | undefined;
      };
    }
  }

  return {
    type: 'object' as const,
    properties: {
      value: jsonSchema,
    },
    required: ['value'],
  };
}
