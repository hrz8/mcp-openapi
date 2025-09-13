#!/usr/bin/env node

import { MCP_SERVER_VERSION, MCP_SERVER_NAME } from './utils/config';
import { startStdioServer } from './transports/stdio';
import { startHttpServer } from './transports/http';

function parseArgs() {
  const args = process.argv.slice(2);

  const config = {
    transport: 'stdio',
    port: 3067,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--transport':
      case '-t':
        config.transport = args[++i]!;
        break;
      case '--port':
      case '-p':
        config.port = parseInt(args[++i]!, 10);
        break;
      case '--help':
        config.help = true;
        break;
    }
  }

  return config;
}

function showHelp() {
  console.info(`
${MCP_SERVER_NAME} MCP Server v${MCP_SERVER_VERSION}

Usage: node index.js [options]

Options:
  --transport, -t <type>    Transport type: stdio | http (default: stdio)
  --port, -p <number>       Port for HTTP transport (default: 3000)
  --help                    Show this help message

Examples:
  node index.js                         # Start with stdio transport
  node index.js --transport stdio       # Explicitly use stdio transport
  node index.js --transport http        # Start with HTTP transport on port 3000
  node index.js --transport http --port 8080  # Start with HTTP transport on port 8080

NPM Scripts:
  npm start                 # Start with stdio transport
  npm run start:http        # Start with HTTP transport
  npm run help              # Show this help
`);
}

async function main() {
  const config = parseArgs();

  if (config.help) {
    showHelp();
    process.exit(0);
  }

  if (!['stdio', 'http'].includes(config.transport)) {
    console.error(`Error: Unsupported transport type: ${config.transport}`);
    console.error('Supported transports: stdio, http');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  try {
    if (config.transport === 'stdio') {
      await startStdioServer();
    } else if (config.transport === 'http') {
      await startHttpServer(config.port);
    }
  } catch (error) {
    console.error('Error during server startup:', error);
    process.exit(1);
  }
}

async function cleanup() {
  console.error('Shutting down MCP server...');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  cleanup();
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  cleanup();
});

main();
