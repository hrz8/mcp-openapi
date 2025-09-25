export type McpPromptDefinition<T = any> = {
  name: string;
  description: string;
  argsSchema: z.ZodSchema<T>;
  generateMessages: (args: T) => Array<{
    role: 'user' | 'assistant' | 'system';
    content: {
      type: 'text';
      text: string;
    };
  }>;
};
