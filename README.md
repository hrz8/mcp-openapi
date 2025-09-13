# DSP-MCP

PoC for DSP Booking flow through MCP Server.

## MCP Config stdio

```bash
$ pnpm run build
$ pnpm run start
```

```json
{
  "servers": {
    "dsp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["~/dsp-mcpserver/dist/index.js"],
      "env": {
        "DSP_BOOKING_BASE_URL": "https://example.com/booking",
        "DSP_BOOKING_API_VERSION": "v1",
        "DSP_APIM_SUBSCRIPTION_KEY": "xxx",
        "DSP_OAUTH_CLIENT_ID": "xxx",
        "DSP_OAUTH_CLIENT_SECRET": "xxx",
        "DSP_OAUTH_TOKEN_URL": "https://example.com/security/oauth2/token"
      }
    }
  }
}
```

## MCP Config HTTP

```bash
$ pnpm run build
$ pnpm run start --transport http --port 3067
# OR Docker
$ docker-compose up --build -d
```

```json
{
  "servers": {
    "dsp-server": {
      "type": "http",
      "url": "http://localhost:3067/mcp"
    }
  }
}
```

## MCP Config Docker

```bash
$ docker build -t dsp-mcpserver:stdio . -f Dockerfile.stdio
```

```json
{
  "dsp-server": {
    "type": "stdio",
    "command": "docker",
    "args": ["run", "-i", "--rm", "dsp-mcpserver:stdio"]
  }
}
```
