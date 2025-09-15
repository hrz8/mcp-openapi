import axios from 'axios';

import {
  DSP_APIM_SUBSCRIPTION_KEY,
  DSP_BOOKING_API_VERSION,
  DSP_OAUTH_CLIENT_SECRET,
  DSP_OAUTH_CLIENT_ID,
  DSP_OAUTH_TOKEN_URL,
} from './config.js';
import { SecurityScheme } from '../tools/types.js';

declare global {
  var __oauthTokenCache: {
    [key: string]: {
      token: string;
      expiresAt: number;
    };
  };
}

export async function acquireOAuth2Token(schemeName: string, scheme: SecurityScheme): Promise<string | null | undefined> {
  try {
    if (!DSP_OAUTH_CLIENT_ID || !DSP_OAUTH_CLIENT_SECRET) {
      console.error(`Missing client credentials for OAuth2 scheme '${schemeName}'`);
      return null;
    }

    if (typeof global.__oauthTokenCache === 'undefined') {
      global.__oauthTokenCache = {};
    }

    const cacheKey = `${schemeName}_${DSP_OAUTH_CLIENT_ID}`;
    const cachedToken = global.__oauthTokenCache[cacheKey];
    const now = Date.now();

    if (cachedToken && cachedToken.expiresAt > now) {
      console.info(`Using cached OAuth2 token for '${schemeName}' (expires in ${Math.floor((cachedToken.expiresAt - now) / 1000)} seconds)`);
      return cachedToken.token;
    }

    let tokenUrl = '';
    if (scheme.flows?.clientCredentials?.tokenUrl) {
      tokenUrl = scheme.flows.clientCredentials.tokenUrl;
    }

    if (!tokenUrl) {
      tokenUrl = DSP_OAUTH_TOKEN_URL;
    }

    if (!tokenUrl) {
      console.error(`No supported OAuth2 flow found for '${schemeName}'`);
      return null;
    }

    const formData = new URLSearchParams();
    formData.append('client_id', DSP_OAUTH_CLIENT_ID);
    formData.append('client_secret', DSP_OAUTH_CLIENT_SECRET);
    formData.append('grant_type', 'client_credentials');

    const response = await axios({
      method: 'POST',
      url: tokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Ocp-Apim-Subscription-Key': DSP_APIM_SUBSCRIPTION_KEY,
        'Api-Version': DSP_BOOKING_API_VERSION,
      },
      data: formData.toString(),
    });

    if (response.data?.access_token) {
      const token = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;

      global.__oauthTokenCache[cacheKey] = {
        token,
        expiresAt: now + (expiresIn * 1000) - 60000, // Expire 1 minute early
      };

      return token;
    } else {
      console.error(`Failed to acquire OAuth2 token for '${schemeName}': No access_token in response`);
      return null;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error acquiring OAuth2 token for '${schemeName}':`, errorMessage);
    return null;
  }
}
