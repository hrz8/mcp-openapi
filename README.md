# DSP-MCP

PoC for DSP Booking flow through MCP Server.

## MCP Config stdio

```bash
$ pnpm run build
```

```json
{
  // use `mcpServers` for Claude
  "servers": {
    "dsp-server": {
      "type": "stdio", // no need in claude_desktop_config.json
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

## MCP Config HTTP VSCode (Able to start locally or even MCP Remote)

Using VSCode Agent we are able to use local MCP Remote or even public MCP Remote

```bash
$ pnpm run build
$ pnpm run start --transport http --port 3067
# OR Docker
$ docker-compose up --build -d
```

```json
{
  // use `mcpServers` for Claude
  "servers": {
    "dsp-server": {
      "type": "http",
      "url": "http://localhost:3067/mcp" // or https://your-host.or.lambda.url/mcp if publicly accessibile
    }
  }
}
```

## MCP Config HTTP Claude Desktop (Required HTTPS)

Make sure you have deploy the server to the public-accessible endpoint e.g., `https://your-host.or.lambda.url/mcp`

### Option 1

Use a `Custom Connector` settings in the Claude Settings

```
Name: DSP Server
Remote MCP Server URL: https://your-host.or.lambda.url/mcp
```

### Option 2

Use `mcp-remote` in your `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dsp-server": {
      "command": "npx",
      "args": ["mcp-remote", "https://your-host.or.lambda.url/mcp"]
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
  // use `mcpServers` for Claude
  "servers": {
    "dsp-server": {
      "type": "stdio", // no need in claude_desktop_config.json
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "DSP_BOOKING_BASE_URL=https://example.com/booking",
        "-e",
        "DSP_BOOKING_API_VERSION=v1",
        "-e",
        "DSP_APIM_SUBSCRIPTION_KEY=xxx",
        "-e",
        "DSP_OAUTH_CLIENT_ID=xxx",
        "-e",
        "DSP_OAUTH_CLIENT_SECRET=xxx",
        "-e",
        "DSP_OAUTH_TOKEN_URL=https://example.com/security/oauth2/token",
        "dsp-mcpserver:stdio"
      ]
    }
  }
}
```
