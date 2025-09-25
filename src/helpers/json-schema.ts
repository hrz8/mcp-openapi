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

export function jsonSchemaToPromptArguments(
  jsonSchema: ReturnType<typeof zodToMcpJsonSchema>,
): Array<{
  name: string;
  description: string;
  required: boolean;
}> {
  const args: Array<{ name: string; description: string; required: boolean; }> = [];

  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    const requiredFields = new Set(jsonSchema.required || []);

    for (const [key, property] of Object.entries(jsonSchema.properties)) {
      const prop = property as any;
      args.push({
        name: key,
        description: prop.description || '',
        required: requiredFields.has(key),
      });
    }
  }

  return args;
}
