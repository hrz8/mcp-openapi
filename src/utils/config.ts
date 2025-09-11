import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DSP_BOOKING_BASE_URL: z.string(),
  DSP_BOOKING_API_VERSION: z.string().default('1.0'),
  DSP_APIM_SUBSCRIPTION_KEY: z.string(),
  DSP_OAUTH_CLIENT_ID: z.string(),
  DSP_OAUTH_CLIENT_SECRET: z.string(),
  DSP_OAUTH_TOKEN_URL: z.string(),
});


export const MCP_SERVER_NAME = 'dsp-mcp';
export const MCP_SERVER_VERSION = '0.1.0';

export const {
  DSP_BOOKING_BASE_URL,
  DSP_BOOKING_API_VERSION,
  DSP_APIM_SUBSCRIPTION_KEY,
  DSP_OAUTH_CLIENT_ID,
  DSP_OAUTH_CLIENT_SECRET,
  DSP_OAUTH_TOKEN_URL,
} = Object.freeze(envSchema.parse(process.env));
