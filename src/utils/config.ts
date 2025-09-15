import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z.object({
  RUN_IN_LAMBDA: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  AWS_LWA_PORT: z
    .string()
    .transform((val) => parseInt(val))
    .default('3000'),
  MCP_ALLOWED_HOSTS: z
    .string()
    .transform((val) => val.split(',').map((host) => host.trim()))
    .pipe(z.array(z.string().min(1)))
    .default('localhost,localhost:3067'),
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
  RUN_IN_LAMBDA,
  AWS_LWA_PORT,
  MCP_ALLOWED_HOSTS,
  DSP_BOOKING_BASE_URL,
  DSP_BOOKING_API_VERSION,
  DSP_APIM_SUBSCRIPTION_KEY,
  DSP_OAUTH_CLIENT_ID,
  DSP_OAUTH_CLIENT_SECRET,
  DSP_OAUTH_TOKEN_URL,
} = Object.freeze(envSchema.parse(process.env));
