import { MCP_SERVER_VERSION, MCP_SERVER_NAME } from './utils/config';
import { startStdioServer } from './transports/stdio';

function parseArgs() {
  const args = process.argv.slice(2);

  const config = {
    transport: 'stdio',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--transport':
      case '-t':
        config.transport = args[++i]!;
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
  --transport, -t <type>    Transport type: stdio (default: stdio)
  --help                    Show this help message

Examples:
  node index.js                         # Start with stdio transport
  node index.js --transport stdio       # Explicitly use stdio transport

NPM Scripts:
  npm start                 # Start with stdio transport
  npm run help              # Show this help
`);
}

async function main() {
  const config = parseArgs();

  if (config.help) {
    showHelp();
    process.exit(0);
  }

  if (config.transport !== 'stdio') {
    console.error(`Error: Only 'stdio' transport is currently supported. Got: ${config.transport}`);
    console.error('Use --help for usage information');
    process.exit(1);
  }

  try {
    await startStdioServer();
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
