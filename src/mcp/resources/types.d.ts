export type McpResourceDefinition<T = any> = {
  name: string;
  uri: string;
  title: string;
  description: string;
  mimeType: string;
  isTemplate?: boolean;
  templatePattern?: RegExp;
  extractParams?: (uri: string) => T | null;
  generateContent: (uri: string, params?: T) => Promise<{
    contents: Array<{
      uri: string;
      text: string;
    }>;
  }>;
};
