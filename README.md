# DSP-MCP

PoC for DSP Booking flow through MCP Server.

## MCP Config

```json
{
  "servers": {
    "dspServer": {
      "command": "node",
      "args": ["~/dsp-mcp/dist/index.js"],
      "env": {
        "DSP_BOOKING_BASE_URL": "https://example.com/booking",
        "DSP_BOOKING_API_VERSION": "v1",
        "DSP_APIM_SUBSCRIPTION_KEY": "xxx",
        "DSP_OAUTH_CLIENT_ID": "xxx",
        "DSP_OAUTH_CLIENT_SECRET": "xxx",
        "DSP_OAUTH_TOKEN_URL": "https://example.com/security/oauth2/token"
      },
      "type": "stdio"
    }
  }
}
```
